import { HttpErrorResponse } from '@angular/common/http';
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
    isNotFound: jasmine.Spy;
  };
  let profiles: { preview: jasmine.Spy };

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
  };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ profileId: '1' }));
    router = { navigate: jasmine.createSpy('navigate') };
    profiles = { preview: jasmine.createSpy('preview').and.returnValue(NEVER) };
    context = {
      selectedId: signal<string | null>('1'),
      detail: signal<ProfileDetail | null>(detail),
      detailLoading: signal(false),
      detailError: signal<unknown | null>(null),
      loadDetail: jasmine.createSpy('loadDetail'),
      reloadDetail: jasmine.createSpy('reloadDetail').and.returnValue(of(detail)),
      beginSelection: jasmine.createSpy('beginSelection'),
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

  it('loads the route Profile and renders the required state without requesting a PDF', () => {
    const component = render();

    expect(context.loadDetail).toHaveBeenCalledWith('1');
    expect(component.previewState).toBe('required');
    expect(profiles.preview).not.toHaveBeenCalled();
    expect(fixture?.nativeElement.textContent).toContain('Preview required');
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
