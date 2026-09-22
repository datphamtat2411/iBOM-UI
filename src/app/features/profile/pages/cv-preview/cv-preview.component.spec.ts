import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, NEVER, of, Subject } from 'rxjs';

import { ProfileDetail } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileService } from '../../services/profile.service';
import { CvPreviewComponent } from './cv-preview.component';

describe('CvPreviewComponent', () => {
  let fixture: ComponentFixture<CvPreviewComponent> | undefined;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let router: { navigate: jasmine.Spy };
  let context: {
    selectedId: ReturnType<typeof signal<string | null>>;
    detail: ReturnType<typeof signal<ProfileDetail | null>>;
    detailLoading: ReturnType<typeof signal<boolean>>;
    detailError: ReturnType<typeof signal<unknown | null>>;
    loadDetail: jasmine.Spy;
    reloadDetail: jasmine.Spy;
    beginSelection: jasmine.Spy;
    replaceDetail: jasmine.Spy;
    isNotFound: jasmine.Spy;
  };
  let profiles: { preview: jasmine.Spy; listFileNameFormats: jasmine.Spy; download: jasmine.Spy };

  const detail: ProfileDetail = {
    id: 1,
    profileName: 'Backend CV',
    firstName: 'A',
    lastName: 'User',
    jobTitle: 'Engineer',
    updatedAt: '2026-01-01',
    yearsOfExperience: 5,
    personality: 'Methodical',
    technicalSummary: 'Angular and Java',
    hasPreviewed: false,
    version: 3,
    createdAt: '2026-01-01',
    lastExportedAt: null,
    preferredFileNameFormatId: null,
  };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ profileId: '1' }));
    router = { navigate: jasmine.createSpy('navigate') };
    profiles = {
      preview: jasmine.createSpy('preview').and.returnValue(NEVER),
      listFileNameFormats: jasmine.createSpy('listFileNameFormats').and.returnValue(of({ content: [{ id: 7, name: 'Name - Title' }], page: 0, size: 10, totalElements: 1, totalPages: 1 })),
      download: jasmine.createSpy('download').and.returnValue(NEVER),
    };
    context = {
      selectedId: signal<string | null>('1'),
      detail: signal<ProfileDetail | null>(detail),
      detailLoading: signal(false),
      detailError: signal<unknown | null>(null),
      loadDetail: jasmine.createSpy('loadDetail'),
      reloadDetail: jasmine.createSpy('reloadDetail').and.returnValue(of(detail)),
      beginSelection: jasmine.createSpy('beginSelection'),
      replaceDetail: jasmine.createSpy('replaceDetail').and.callFake((updated: ProfileDetail) => context.detail.set(updated)),
      isNotFound: jasmine.createSpy('isNotFound').and.returnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [CvPreviewComponent],
      providers: [
        { provide: ProfileService, useValue: profiles },
        { provide: ProfileContextService, useValue: context },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    fixture = undefined;
  });

  function render(currentDetail: ProfileDetail = detail): CvPreviewComponent {
    context.detail.set(currentDetail);
    fixture = TestBed.createComponent(CvPreviewComponent);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function reloadWith(reloaded: ProfileDetail): void {
    context.reloadDetail.and.callFake(() => {
      context.detail.set(reloaded);
      return of(reloaded);
    });
  }

  function renderValid(currentDetail: ProfileDetail = { ...detail, hasPreviewed: true }): CvPreviewComponent {
    profiles.preview.and.returnValue(of(new Blob(['backend pdf'], { type: 'application/pdf' })));
    reloadWith(currentDetail);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:preview');
    const component = render(currentDetail);
    fixture?.detectChanges();
    return component;
  }

  it('loads the route Profile and renders the required state without requesting a PDF', () => {
    const component = render();

    expect(context.loadDetail).toHaveBeenCalledWith('1');
    expect(component.previewState).toBe('required');
    expect(profiles.preview).not.toHaveBeenCalled();
    expect(fixture?.nativeElement.textContent).toContain('Preview required');
  });

  it('loads every File Name Format page in backend order while keeping Automatic available', () => {
    profiles.listFileNameFormats.and.callFake((page: number) => of(page === 0
      ? { content: [{ id: 7, name: 'Name - Title' }, { id: 8, name: 'Name - Role' }], page: 0, size: 10, totalElements: 3, totalPages: 2 }
      : { content: [{ id: 9, name: 'Name - Date' }], page: 1, size: 10, totalElements: 3, totalPages: 2 }));

    const component = render();

    expect(profiles.listFileNameFormats).toHaveBeenCalledWith(0, 10);
    expect(profiles.listFileNameFormats).toHaveBeenCalledWith(1, 10);
    expect(component.fileNameFormats).toEqual([
      { id: 7, name: 'Name - Title' },
      { id: 8, name: 'Name - Role' },
      { id: 9, name: 'Name - Date' },
    ]);
    expect(component.fileNameFormatsLoading).toBeFalse();
    expect(component.fileNameFormatsError).toBe('');
  });

  it('does not present partial File Name Formats when a later page fails', () => {
    const secondPage = new Subject<{ content: { id: number; name: string }[]; page: number; size: number; totalElements: number; totalPages: number }>();
    profiles.listFileNameFormats.and.returnValues(
      of({ content: [{ id: 7, name: 'Name - Title' }], page: 0, size: 10, totalElements: 2, totalPages: 2 }),
      secondPage,
    );

    const component = render();
    expect(component.fileNameFormatsLoading).toBeTrue();
    secondPage.error(new HttpErrorResponse({ status: 503, error: { message: 'Formats unavailable.' } }));

    expect(component.fileNameFormats).toEqual([]);
    expect(component.fileNameFormatsLoading).toBeFalse();
    expect(component.fileNameFormatsError).toBe('Formats unavailable.');
  });

  it('prevents duplicate Preview generation while the backend request is active', () => {
    const request = new Subject<Blob>();
    profiles.preview.and.returnValue(request);
    const component = render();

    component.generatePreview();
    component.generatePreview();

    expect(component.previewState).toBe('generating');
    expect(profiles.preview).toHaveBeenCalledTimes(1);
  });

  it('automatically requests a current PDF for a Preview-valid Profile and renders only the returned PDF', () => {
    const validDetail = { ...detail, hasPreviewed: true };
    const pdf = new Blob(['backend pdf'], { type: 'application/pdf' });
    profiles.preview.and.returnValue(of(pdf));
    reloadWith(validDetail);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:preview');

    const component = render(validDetail);
    fixture?.detectChanges();

    expect(profiles.preview).toHaveBeenCalledWith('1');
    expect(component.previewState).toBe('valid');
    expect(component.documentUrl).not.toBeNull();
    expect(fixture?.nativeElement.querySelector('iframe')).toBeTruthy();
    expect(fixture?.nativeElement.querySelector('.cv-page')).toBeNull();
  });

  it('keeps export controls unavailable until the current Preview is valid', () => {
    render();

    const buttons = fixture?.nativeElement.querySelectorAll('.export-stack button') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(2);
    expect(Array.from(buttons).every((button) => button.disabled)).toBeTrue();
  });

  it('uses Automatic without a File Name Format and ignores duplicate export submissions', () => {
    const request = new Subject<HttpResponse<Blob>>();
    profiles.download.and.returnValue(request);
    const component = renderValid();

    component.exportDocument('pdf');
    component.exportDocument('docx');

    expect(profiles.download).toHaveBeenCalledTimes(1);
    expect(profiles.download).toHaveBeenCalledWith('1', 'pdf');
    expect(component.isExporting).toBeTrue();
  });

  it('sends an explicitly selected File Name Format only for that export', () => {
    const request = new Subject<HttpResponse<Blob>>();
    profiles.download.and.returnValue(request);
    const component = renderValid();
    component.selectedFileNameFormatId = '7';

    component.exportDocument('docx');

    expect(profiles.download).toHaveBeenCalledWith('1', 'docx', '7');
  });

  it('downloads the backend filename, revokes the temporary URL, and consumes refreshed export metadata', () => {
    const request = new Subject<HttpResponse<Blob>>();
    const validDetail = { ...detail, hasPreviewed: true };
    const refreshed = { ...validDetail, lastExportedAt: '2026-01-02T12:00:00Z' };
    const exported = new Blob(['backend docx'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    profiles.download.and.returnValue(request);
    profiles.preview.and.returnValue(of(new Blob(['backend pdf'], { type: 'application/pdf' })));
    let reloadCount = 0;
    context.reloadDetail.and.callFake(() => {
      const next = reloadCount++ === 0 ? validDetail : refreshed;
      context.detail.set(next);
      return of(next);
    });
    const createObjectUrl = spyOn(URL, 'createObjectURL').and.returnValues('blob:preview', 'blob:download');
    const revokeObjectUrl = spyOn(URL, 'revokeObjectURL');
    const createElement = spyOn(document, 'createElement').and.callThrough();
    const component = render(validDetail);

    component.exportDocument('docx');
    request.next(new HttpResponse({
      body: exported,
      headers: new HttpHeaders({ 'Content-Disposition': "attachment; filename*=UTF-8''backend%20cv.docx" }),
    }));

    const anchor = createElement.calls.mostRecent().returnValue as HTMLAnchorElement;
    expect(anchor.download).toBe('backend cv.docx');
    expect(createObjectUrl).toHaveBeenCalledWith(exported);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:download');
    expect(context.reloadDetail).toHaveBeenCalledTimes(2);
    expect(context.detail()?.lastExportedAt).toBe('2026-01-02T12:00:00Z');
    expect(component.previewState).toBe('valid');
    expect(component.exportSuccess).toBe('DOCX export downloaded successfully.');
    expect(component.isExporting).toBeFalse();
  });

  it('shows PDF success feedback only after the browser download and Profile reconciliation complete', () => {
    const request = new Subject<HttpResponse<Blob>>();
    const validDetail = { ...detail, hasPreviewed: true };
    profiles.download.and.returnValue(request);
    reloadWith(validDetail);
    const component = renderValid(validDetail);

    component.exportDocument('pdf');
    expect(component.exportSuccess).toBe('');
    request.next(new HttpResponse({
      body: new Blob(['backend pdf'], { type: 'application/pdf' }),
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="backend.pdf"' }),
    }));

    expect(component.exportSuccess).toBe('PDF export downloaded successfully.');
    expect(component.previewState).toBe('valid');
    expect(component.documentUrl).not.toBeNull();
  });

  it('preserves the valid Preview after an ordinary export failure and allows retry', async () => {
    const first = new Subject<HttpResponse<Blob>>();
    const second = new Subject<HttpResponse<Blob>>();
    profiles.download.and.returnValues(first, second);
    const component = renderValid();
    component.selectedFileNameFormatId = '7';

    component.exportDocument('pdf');
    first.error(new HttpErrorResponse({ status: 404, error: { errorCode: 'FILE_NAME_FORMAT_NOT_FOUND', message: 'Format was removed.' } }));
    await Promise.resolve();

    expect(component.previewState).toBe('valid');
    expect(component.documentUrl).not.toBeNull();
    expect(component.exportError).toBe('Format was removed.');
    expect(component.exportSuccess).toBe('');
    expect(component.isExporting).toBeFalse();
    component.exportDocument('pdf');
    expect(profiles.download).toHaveBeenCalledWith('1', 'pdf', '7');
    expect(second.observed).toBeTrue();
  });

  it('ignores stale export responses and reconciliation after a Profile switch', () => {
    const request = new Subject<HttpResponse<Blob>>();
    const reconciliation = new Subject<ProfileDetail>();
    profiles.download.and.returnValue(request);
    const validDetail = { ...detail, hasPreviewed: true };
    profiles.preview.and.returnValue(of(new Blob(['backend pdf'], { type: 'application/pdf' })));
    context.reloadDetail.and.returnValues(of(validDetail), reconciliation);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:preview');
    const component = render(validDetail);
    component.exportDocument('pdf');
    request.next(new HttpResponse({
      body: new Blob(['backend pdf'], { type: 'application/pdf' }),
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="stale.pdf"' }),
    }));

    expect(context.reloadDetail).toHaveBeenCalledTimes(2);
    context.selectedId.set('2');
    context.detail.set(null);
    params.next(convertToParamMap({ profileId: '2' }));
    fixture?.detectChanges();
    reconciliation.next({ ...detail, id: 2, hasPreviewed: true, version: 9 });

    expect(component.previewState).toBe('loading');
    expect(component.exportError).toBe('');
    expect(component.exportSuccess).toBe('');
  });

  it('does not accept PDF bytes until Profile ID, version, and hasPreviewed reconcile', () => {
    const request = new Subject<Blob>();
    const reconciliation = new Subject<ProfileDetail>();
    profiles.preview.and.returnValue(request);
    context.reloadDetail.and.callFake(() => {
      context.detail.set(null);
      return reconciliation;
    });
    const component = render();
    const pdf = new Blob(['backend pdf'], { type: 'application/pdf' });
    spyOn(URL, 'createObjectURL');

    component.generatePreview();
    request.next(pdf);
    context.detail.set({ ...detail, version: 4, hasPreviewed: true });
    reconciliation.next({ ...detail, version: 4, hasPreviewed: true });

    expect(component.documentUrl).toBeNull();
    expect(component.previewState).toBe('failure');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('shows failure and allows retry after a version conflict', () => {
    const first = new Subject<Blob>();
    const second = new Subject<Blob>();
    profiles.preview.and.returnValues(first, second);
    const component = render();

    component.generatePreview();
    first.error(new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } }));

    expect(component.previewState).toBe('failure');
    expect(component.documentUrl).toBeNull();
    fixture?.detectChanges();
    expect(fixture?.nativeElement.textContent).toContain('Review the Profile and retry');

    component.retryPreview();

    expect(profiles.preview).toHaveBeenCalledTimes(2);
    expect(component.previewState).toBe('generating');
  });

  it('treats a not-found Preview response as unavailable and never creates a document URL', () => {
    const request = new Subject<Blob>();
    profiles.preview.and.returnValue(request);
    const component = render();
    spyOn(URL, 'createObjectURL');

    component.generatePreview();
    request.error(new HttpErrorResponse({ status: 404, error: { errorCode: 'PROFILE_NOT_FOUND' } }));

    expect(component.previewState).toBe('unavailable');
    expect(component.documentUrl).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('classifies a PROFILE_NOT_FOUND JSON error delivered as a Preview Blob', async () => {
    const request = new Subject<Blob>();
    profiles.preview.and.returnValue(request);
    const component = render();
    const errorBody = new Blob([JSON.stringify({ errorCode: 'PROFILE_NOT_FOUND' })], { type: 'application/json' });
    spyOn(errorBody, 'text').and.returnValue(Promise.resolve(JSON.stringify({ errorCode: 'PROFILE_NOT_FOUND' })));

    component.generatePreview();
    request.error(new HttpErrorResponse({ status: 404, error: errorBody }));
    await fixture!.whenStable();

    expect(component.previewState).toBe('unavailable');
    expect(component.previewError).toBe('This Profile is not available to your account.');
    expect(component.documentUrl).toBeNull();
  });

  it('retains version-conflict retry behavior for a PROFILE_VERSION_CONFLICT Preview Blob', async () => {
    const request = new Subject<Blob>();
    profiles.preview.and.returnValue(request);
    const component = render();
    const errorBody = new Blob([JSON.stringify({ errorCode: 'PROFILE_VERSION_CONFLICT' })], { type: 'application/json' });
    spyOn(errorBody, 'text').and.returnValue(Promise.resolve(JSON.stringify({ errorCode: 'PROFILE_VERSION_CONFLICT' })));

    component.generatePreview();
    request.error(new HttpErrorResponse({ status: 409, error: errorBody }));
    await fixture!.whenStable();

    expect(component.previewState).toBe('failure');
    expect(component.previewError).toBe('The Profile changed while Preview was generated. Review the Profile and retry.');
  });

  it('falls back to generic Preview failure for a malformed Preview Blob error', async () => {
    const request = new Subject<Blob>();
    profiles.preview.and.returnValue(request);
    const component = render();
    const errorBody = new Blob(['not-json'], { type: 'application/json' });
    spyOn(errorBody, 'text').and.returnValue(Promise.resolve('not-json'));

    component.generatePreview();
    request.error(new HttpErrorResponse({ status: 500, error: errorBody }));
    await fixture!.whenStable();

    expect(component.previewState).toBe('failure');
    expect(component.previewError).toBe('Preview could not be generated right now. Please retry.');
  });

  it('ignores a decoded Preview Blob error after the Profile switches', async () => {
    const request = new Subject<Blob>();
    profiles.preview.and.returnValue(request);
    const component = render();
    const errorBody = new Blob([JSON.stringify({ errorCode: 'PROFILE_NOT_FOUND' })], { type: 'application/json' });
    let resolveBody!: (body: string) => void;
    spyOn(errorBody, 'text').and.returnValue(new Promise<string>((resolve) => { resolveBody = resolve; }));

    component.generatePreview();
    request.error(new HttpErrorResponse({ status: 404, error: errorBody }));
    context.selectedId.set('2');
    context.detail.set(null);
    params.next(convertToParamMap({ profileId: '2' }));
    fixture?.detectChanges();
    resolveBody(JSON.stringify({ errorCode: 'PROFILE_NOT_FOUND' }));
    await fixture!.whenStable();

    expect(component.previewState).toBe('loading');
    expect(component.previewError).toBe('');
    expect(component.documentUrl).toBeNull();
  });

  it('invalidates pending Preview responses and the displayed document when the Profile switches', () => {
    const request = new Subject<Blob>();
    profiles.preview.and.returnValue(request);
    const component = render();

    component.generatePreview();
    context.selectedId.set('2');
    context.detail.set(null);
    params.next(convertToParamMap({ profileId: '2' }));
    fixture?.detectChanges();
    request.next(new Blob(['stale'], { type: 'application/pdf' }));
    request.error(new Error('stale error'));

    expect(component.documentUrl).toBeNull();
    expect(component.previewState).toBe('loading');
  });

  it('revokes the displayed object URL when Profile context invalidates it and on destroy', () => {
    const validDetail = { ...detail, hasPreviewed: true };
    const pdf = new Blob(['backend pdf'], { type: 'application/pdf' });
    profiles.preview.and.returnValue(of(pdf));
    reloadWith(validDetail);
    spyOn(URL, 'createObjectURL').and.returnValues('blob:preview-1', 'blob:preview-2');
    const revoke = spyOn(URL, 'revokeObjectURL');
    const component = render(validDetail);
    fixture?.detectChanges();

    expect(component.previewState).toBe('valid');
    context.detail.set({ ...validDetail, version: 4, hasPreviewed: false });
    fixture?.detectChanges();

    expect(component.documentUrl).toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:preview-1');

    const refreshedDetail = { ...validDetail, version: 4, hasPreviewed: true };
    profiles.preview.and.returnValue(of(pdf));
    reloadWith(refreshedDetail);
    context.detail.set(refreshedDetail);
    component.generatePreview();
    fixture?.detectChanges();
    expect(component.previewState).toBe('valid');

    fixture?.destroy();
    fixture = undefined;

    expect(revoke).toHaveBeenCalledWith('blob:preview-2');
  });
});
