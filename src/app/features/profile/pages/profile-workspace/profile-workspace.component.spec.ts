import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileWorkspaceComponent } from './profile-workspace.component';

describe('ProfileWorkspaceComponent', () => {
  let fixture: ComponentFixture<ProfileWorkspaceComponent>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let context: { summaries: ReturnType<typeof signal>; summariesLoading: ReturnType<typeof signal>; summariesError: ReturnType<typeof signal>; selectedId: ReturnType<typeof signal>; detail: ReturnType<typeof signal>; detailLoading: ReturnType<typeof signal>; detailError: ReturnType<typeof signal>; loadSummaries: jasmine.Spy; loadDetail: jasmine.Spy; beginSelection: jasmine.Spy; isNotFound: jasmine.Spy };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ profileId: '1' }));
    context = {
      summaries: signal([]), summariesLoading: signal(false), summariesError: signal(null), selectedId: signal(null), detail: signal(null), detailLoading: signal(false), detailError: signal(null),
      loadSummaries: jasmine.createSpy('loadSummaries'), loadDetail: jasmine.createSpy('loadDetail'), beginSelection: jasmine.createSpy('beginSelection'), isNotFound: jasmine.createSpy('isNotFound').and.returnValue(false),
    };
    await TestBed.configureTestingModule({
      imports: [ProfileWorkspaceComponent],
      providers: [
        { provide: ProfileContextService, useValue: context },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileWorkspaceComponent);
    fixture.detectChanges();
  });

  it('loads the Profile selected by the route parameter', () => {
    expect(context.loadSummaries).toHaveBeenCalled();
    expect(context.loadDetail).toHaveBeenCalledWith('1');
  });

  it('keeps route-driven switching delegated to the Profile context', () => {
    params.next(convertToParamMap({ profileId: '2' }));

    expect(context.loadDetail).toHaveBeenCalledWith('2');
    expect(context.beginSelection).not.toHaveBeenCalledWith(null);
  });

  it('directs empty workspace users to the Profile menu in the shared shell', () => {
    params.next(convertToParamMap({}));
    context.summaries.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.create-profile')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Use the Profile menu above to create one.');
  });
});
