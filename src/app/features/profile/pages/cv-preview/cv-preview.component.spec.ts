import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, NEVER, of, Subject } from 'rxjs';

import { FileNameFormatPage, ProfileDetail } from '../../models/profile.models';
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

  function formatPage(page: number, content: { id: number; name: string }[], totalPages: number, totalElements: number): FileNameFormatPage {
    return { content, page, size: 10, totalElements, totalPages };
  }

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

  function retryButton(): HTMLButtonElement | null {
    const buttons = fixture?.nativeElement.querySelectorAll('.export-controls button') as NodeListOf<HTMLButtonElement> | undefined;
    return buttons ? Array.from(buttons).find((button) => button.textContent?.trim() === 'Retry') ?? null : null;
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

  function completeExport(disposition?: string): { component: CvPreviewComponent; createElement: jasmine.Spy } {
    const request = new Subject<HttpResponse<Blob>>();
    profiles.download.and.returnValue(request);
    const component = renderValid();
    const createElement = spyOn(document, 'createElement').and.callThrough();
    component.exportDocument('pdf');
    request.next(new HttpResponse({
      body: new Blob(['backend pdf'], { type: 'application/pdf' }),
      headers: disposition === undefined ? new HttpHeaders() : new HttpHeaders({ 'Content-Disposition': disposition }),
    }));
    return { component, createElement };
  }

  it('loads the route Profile and renders the required state without requesting a PDF', () => {
    const component = render();

    expect(context.loadDetail).toHaveBeenCalledWith('1');
    expect(component.previewState).toBe('required');
    expect(profiles.preview).not.toHaveBeenCalled();
    expect(fixture?.nativeElement.textContent).toContain('Preview required');
  });

  it('renders lastExportedAt in Ho Chi Minh time without mutating the backend value', () => {
    const rawLastExportedAt = '2026-01-02T12:00:00Z';
    const currentDetail = { ...detail, lastExportedAt: rawLastExportedAt };

    render(currentDetail);

    const lastExported = fixture?.nativeElement.querySelector('.last-exported') as HTMLElement;
    expect(lastExported.textContent?.trim()).toBe('Last exported: Jan 2, 2026, 7:00 PM');
    expect(lastExported.textContent).not.toContain(rawLastExportedAt);
    expect(currentDetail.lastExportedAt).toBe(rawLastExportedAt);
    expect(context.detail()?.lastExportedAt).toBe(rawLastExportedAt);
  });

  it('does not render a timestamp when lastExportedAt is null or absent', () => {
    render({ ...detail, lastExportedAt: null });
    expect(fixture?.nativeElement.querySelector('.last-exported')).toBeNull();

    fixture?.destroy();
    fixture = undefined;
    const absentDetail = { ...detail } as Partial<ProfileDetail>;
    delete absentDetail.lastExportedAt;

    render(absentDetail as ProfileDetail);

    expect(fixture!.nativeElement.querySelector('.last-exported')).toBeNull();
  });

  it('exposes Retry when the initial File Name Format load fails', () => {
    const request = new Subject<FileNameFormatPage>();
    profiles.listFileNameFormats.and.returnValue(request);

    const component = render();
    request.error(new HttpErrorResponse({ status: 503, error: { message: 'Formats unavailable.' } }));
    fixture?.detectChanges();

    expect(component.fileNameFormatsLoading).toBeFalse();
    expect(component.fileNameFormatsError).toBe('Formats unavailable.');
    expect(retryButton()).not.toBeNull();
    expect(retryButton()?.disabled).toBeFalse();
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
    const secondPage = new Subject<FileNameFormatPage>();
    profiles.listFileNameFormats.and.returnValues(
      of(formatPage(0, [{ id: 7, name: 'Name - Title' }], 2, 2)),
      secondPage,
    );

    const component = render();
    expect(component.fileNameFormatsLoading).toBeTrue();
    secondPage.error(new HttpErrorResponse({ status: 503, error: { message: 'Formats unavailable.' } }));
    fixture?.detectChanges();

    expect(component.fileNameFormats).toEqual([]);
    expect(component.fileNameFormatsLoading).toBeFalse();
    expect(component.fileNameFormatsError).toBe('Formats unavailable.');
    expect(retryButton()).not.toBeNull();
  });

  it('retries from page 0 and loads the complete multi-page list while clearing the previous error', () => {
    const initial = new Subject<FileNameFormatPage>();
    const retryPage = new Subject<FileNameFormatPage>();
    profiles.listFileNameFormats.and.returnValues(
      initial,
      of(formatPage(0, [{ id: 8, name: 'Name - Role' }], 2, 2)),
      retryPage,
    );

    const component = render();
    initial.error(new HttpErrorResponse({ status: 503, error: { message: 'Initial failure.' } }));
    component.retryFileNameFormats();

    expect(profiles.listFileNameFormats.calls.argsFor(1)).toEqual([0, 10]);
    expect(profiles.listFileNameFormats.calls.argsFor(2)).toEqual([1, 10]);
    expect(component.fileNameFormatsLoading).toBeTrue();
    expect(component.fileNameFormatsError).toBe('');

    retryPage.next(formatPage(1, [{ id: 9, name: 'Name - Date' }], 2, 2));
    retryPage.complete();

    expect(component.fileNameFormats).toEqual([
      { id: 8, name: 'Name - Role' },
      { id: 9, name: 'Name - Date' },
    ]);
    expect(component.fileNameFormatsLoading).toBeFalse();
    expect(component.fileNameFormatsError).toBe('');
  });

  it('does not retain partial data from a failed retry attempt', () => {
    const initial = new Subject<FileNameFormatPage>();
    const retryPage = new Subject<FileNameFormatPage>();
    profiles.listFileNameFormats.and.returnValues(
      initial,
      of(formatPage(0, [{ id: 8, name: 'Name - Role' }], 2, 2)),
      retryPage,
    );

    const component = render();
    initial.error(new HttpErrorResponse({ status: 503, error: { message: 'Initial failure.' } }));
    component.retryFileNameFormats();
    retryPage.error(new HttpErrorResponse({ status: 503, error: { message: 'Retry failure.' } }));
    fixture?.detectChanges();

    expect(component.fileNameFormats).toEqual([]);
    expect(component.fileNameFormatsLoading).toBeFalse();
    expect(component.fileNameFormatsError).toBe('Retry failure.');
    expect(retryButton()).not.toBeNull();
  });

  it('prevents duplicate retries while loading and keeps a repeated failure retryable', () => {
    const initial = new Subject<FileNameFormatPage>();
    const firstRetry = new Subject<FileNameFormatPage>();
    const secondRetry = new Subject<FileNameFormatPage>();
    profiles.listFileNameFormats.and.returnValues(initial, firstRetry, secondRetry);

    const component = render();
    initial.error(new HttpErrorResponse({ status: 503, error: { message: 'Initial failure.' } }));
    component.retryFileNameFormats();
    component.retryFileNameFormats();

    expect(profiles.listFileNameFormats).toHaveBeenCalledTimes(2);
    expect(component.fileNameFormatsLoading).toBeTrue();
    firstRetry.error(new HttpErrorResponse({ status: 503, error: { message: 'Retry failed again.' } }));
    fixture?.detectChanges();

    expect(component.fileNameFormatsLoading).toBeFalse();
    expect(component.fileNameFormatsError).toBe('Retry failed again.');
    expect(retryButton()).not.toBeNull();
    retryButton()?.click();

    expect(profiles.listFileNameFormats).toHaveBeenCalledTimes(3);
    expect(profiles.listFileNameFormats.calls.argsFor(2)).toEqual([0, 10]);
    expect(component.fileNameFormatsLoading).toBeTrue();
  });

  it('ignores stale retry responses after the Profile context changes', () => {
    const initial = new Subject<FileNameFormatPage>();
    const staleRetry = new Subject<FileNameFormatPage>();
    const activeProfileRetry = new Subject<FileNameFormatPage>();
    profiles.listFileNameFormats.and.returnValues(initial, staleRetry, activeProfileRetry);

    const component = render();
    initial.error(new HttpErrorResponse({ status: 503, error: { message: 'Initial failure.' } }));
    component.retryFileNameFormats();

    context.selectedId.set('2');
    context.detail.set(null);
    params.next(convertToParamMap({ profileId: '2' }));
    fixture?.detectChanges();

    staleRetry.next(formatPage(0, [{ id: 7, name: 'Stale format' }], 1, 1));
    expect(component.fileNameFormats).toEqual([]);
    expect(component.fileNameFormatsLoading).toBeTrue();

    activeProfileRetry.next(formatPage(0, [{ id: 9, name: 'Current format' }], 1, 1));
    activeProfileRetry.complete();

    expect(component.fileNameFormats).toEqual([{ id: 9, name: 'Current format' }]);
    expect(component.fileNameFormats).not.toContain({ id: 7, name: 'Stale format' } as never);
    expect(component.fileNameFormatsError).toBe('');
    expect(component.fileNameFormatsLoading).toBeFalse();
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

  it('uses a quoted backend filename containing a semicolon', () => {
    const { createElement } = completeExport('attachment; filename="backend; cv.pdf"');

    const anchor = createElement.calls.mostRecent().returnValue as HTMLAnchorElement;
    expect(anchor.download).toBe('backend; cv.pdf');
  });

  it('uses a quoted backend filename containing spaces', () => {
    const { createElement } = completeExport('attachment; filename="Backend CV.pdf"');

    const anchor = createElement.calls.mostRecent().returnValue as HTMLAnchorElement;
    expect(anchor.download).toBe('Backend CV.pdf');
  });

  it('decodes a valid UTF-8 backend filename*', () => {
    const { createElement } = completeExport("attachment; filename*=UTF-8''J%C3%B3n%20Doe.pdf");

    const anchor = createElement.calls.mostRecent().returnValue as HTMLAnchorElement;
    expect(anchor.download).toBe('J\u00f3n Doe.pdf');
  });

  it('prefers a valid filename* over filename', () => {
    const { createElement } = completeExport("attachment; filename=legacy.pdf; filename*=UTF-8''preferred.pdf");

    const anchor = createElement.calls.mostRecent().returnValue as HTMLAnchorElement;
    expect(anchor.download).toBe('preferred.pdf');
  });

  it('falls back to filename when filename* is malformed', () => {
    const { createElement } = completeExport("attachment; filename=legacy.pdf; filename*=UTF-8''bad%ZZ");

    const anchor = createElement.calls.mostRecent().returnValue as HTMLAnchorElement;
    expect(anchor.download).toBe('legacy.pdf');
  });

  it('rejects an unsafe backend path-like filename', () => {
    const { component, createElement } = completeExport('attachment; filename="../unsafe.pdf"');

    expect(createElement).not.toHaveBeenCalled();
    expect(component.exportError).toBe('The backend did not provide a usable export filename. Please retry.');
    expect(component.previewState).toBe('valid');
    expect(component.documentUrl).not.toBeNull();
  });

  it('preserves the existing fallback when Content-Disposition is missing', () => {
    const result = completeExport();

    expect(result.createElement).not.toHaveBeenCalled();
    expect(result.component.exportError).toBe('The backend did not provide a usable export filename. Please retry.');
    expect(result.component.previewState).toBe('valid');
  });

  it('preserves the existing fallback when Content-Disposition is unusable', () => {
    const result = completeExport('attachment; filename="unterminated');

    expect(result.createElement).not.toHaveBeenCalled();
    expect(result.component.exportError).toBe('The backend did not provide a usable export filename. Please retry.');
    expect(result.component.previewState).toBe('valid');
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
