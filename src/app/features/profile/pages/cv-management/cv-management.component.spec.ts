import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { ProfileSummary } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileService } from '../../services/profile.service';
import { PdfDocumentRenderer } from '../cv-preview/pdf-document-renderer.service';
import { CvManagementComponent } from './cv-management.component';

describe('CvManagementComponent', () => {
  let fixture: ComponentFixture<CvManagementComponent>;
  let router: { navigate: jasmine.Spy };
  let context: {
    summaries: ReturnType<typeof signal<ProfileSummary[]>>;
    summariesLoading: ReturnType<typeof signal<boolean>>;
    summariesError: ReturnType<typeof signal<unknown | null>>;
    clearManagedContext: jasmine.Spy;
    loadSummaries: jasmine.Spy;
    invalidateSummaries: jasmine.Spy;
  };
  let profiles: { get: jasmine.Spy; preview: jasmine.Spy };
  const summaries: ProfileSummary[] = [
    { id: 1, profileName: 'Product Designer', firstName: 'Alex', lastName: 'Nguyen', jobTitle: 'Product Designer', updatedAt: '2026-02-10', completeness: 0 },
    { id: 2, profileName: 'Frontend CV', firstName: 'Alex', lastName: 'Nguyen', jobTitle: 'Frontend Engineer', updatedAt: '2026-05-20' },
    { id: 3, profileName: 'Analytics Lead', firstName: 'Morgan', lastName: 'Pham', jobTitle: 'Analytics Lead', updatedAt: '2026-03-08', completeness: 58 },
  ];

  beforeEach(async () => {
    router = { navigate: jasmine.createSpy('navigate') };
    context = {
      summaries: signal<ProfileSummary[]>(summaries),
      summariesLoading: signal(false),
      summariesError: signal<unknown | null>(null),
      clearManagedContext: jasmine.createSpy('clearManagedContext'),
      loadSummaries: jasmine.createSpy('loadSummaries'),
      invalidateSummaries: jasmine.createSpy('invalidateSummaries'),
    };
    profiles = {
      get: jasmine.createSpy('get').and.callFake((id: string) => {
        const profile = summaries.find((item) => String(item.id) === id)!;
        return of({ ...profile, hasPreviewed: id !== '2' });
      }),
      preview: jasmine.createSpy('preview').and.returnValue(of(new Blob(['pdf'], { type: 'application/pdf' }))),
    };

    await TestBed.configureTestingModule({
      imports: [CvManagementComponent],
      providers: [
        { provide: ProfileContextService, useValue: context },
        { provide: ProfileService, useValue: profiles },
        { provide: PdfDocumentRenderer, useValue: jasmine.createSpyObj('PdfDocumentRenderer', ['render']) },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CvManagementComponent);
    fixture.detectChanges();
  });

  it('loads the member CV library and sorts profiles by update date or name', () => {
    const component = fixture.componentInstance;

    expect(context.clearManagedContext).toHaveBeenCalled();
    expect(context.loadSummaries).toHaveBeenCalled();
    expect(component.visibleProfiles().map((profile) => profile.id)).toEqual([2, 3, 1]);
    expect(profiles.get).toHaveBeenCalledTimes(3);
    expect(component.previewReadinessFor(summaries[0])).toBe('ready');
    expect(component.previewReadinessFor(summaries[1])).toBe('required');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.preview-needed-action')?.textContent).toContain('Generate preview');
    expect(fixture.nativeElement.querySelector('.preview-profile-button')?.textContent).toContain('View CV preview');
    const editButtons = fixture.nativeElement.querySelectorAll('.edit-profile-button') as NodeListOf<HTMLButtonElement>;
    expect(Array.from(editButtons).map((button) => button.getAttribute('aria-label')))
      .toEqual(['Edit Frontend CV', 'Edit Analytics Lead', 'Edit Product Designer']);

    component.sortOrder = 'name';
    expect(component.visibleProfiles().map((profile) => profile.id)).toEqual([3, 2, 1]);
    component.searchTerm = 'designer';
    expect(component.visibleProfiles().map((profile) => profile.id)).toEqual([1]);
  });

  it('switches between accessible grid and list views', () => {
    const component = fixture.componentInstance;

    expect(component.viewMode).toBe('grid');
    expect(fixture.nativeElement.querySelector('.profile-grid')?.classList.contains('profile-list')).toBeFalse();
    expect(fixture.nativeElement.querySelector('[aria-label="Grid view"]')?.getAttribute('aria-pressed')).toBe('true');

    component.setViewMode('list');
    fixture.detectChanges();

    expect(component.viewMode).toBe('list');
    expect(fixture.nativeElement.querySelector('.profile-grid')?.classList.contains('profile-list')).toBeTrue();
    expect(fixture.nativeElement.querySelector('[aria-label="List view"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.querySelector('[aria-label="Grid view"]')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('requests a PDF in quick preview without navigating away, then offers the full preview route', () => {
    const component = fixture.componentInstance;
    const profile = summaries[0];

    component.openQuickPreview(profile);

    expect(profiles.preview).toHaveBeenCalledWith('1');
    expect(component.quickPreviewProfile).toBe(profile);
    expect(component.quickPreviewBlob?.type).toBe('application/pdf');
    expect(router.navigate).not.toHaveBeenCalled();

    component.openFullPreview(profile);

    expect(router.navigate).toHaveBeenCalledWith(['/profiles', 1, 'preview']);
    expect(component.quickPreviewProfile).toBeNull();
  });

  it('sends profiles without a generated PDF to the full preview instead of requesting a quick PDF', () => {
    const component = fixture.componentInstance;

    component.openPreviewForProfile(summaries[1]);

    expect(router.navigate).toHaveBeenCalledWith(['/profiles', 2, 'preview']);
    expect(profiles.preview).not.toHaveBeenCalled();
    expect(component.quickPreviewProfile).toBeNull();
  });

  it('retries a failed library request and navigates to the editor for an individual profile', () => {
    const component = fixture.componentInstance;
    context.summariesLoading.set(false);
    component.retryProfiles();
    component.openProfile(summaries[1]);

    expect(context.invalidateSummaries).toHaveBeenCalled();
    expect(context.loadSummaries).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', 2]);
  });
});
