import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { ProfileContextService } from '../profile/services/profile-context.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let profileContext: { loadSummariesAndResolveSelection: jasmine.Spy };

  beforeEach(async () => {
    const auth = {
      user: signal({ id: 1, email: 'member@example.com', username: 'member', role: 'MEMBER' }),
    };
    profileContext = { loadSummariesAndResolveSelection: jasmine.createSpy('loadSummariesAndResolveSelection') };
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [{ provide: AuthService, useValue: auth }, { provide: ProfileContextService, useValue: profileContext }],
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
  });

  it('renders authentication-oriented dashboard information', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('#dashboard-title')?.textContent).toContain('member');
    expect(element.querySelector('.notice')?.textContent).toContain('Session available');
    expect(element.querySelector('.context-band')?.textContent).toContain('MEMBER');
    expect(element.querySelector('.detail-list')?.textContent).toContain('member@example.com');
  });

  it('loads and resolves the shared own-Profile context on Dashboard entry', () => {
    expect(profileContext.loadSummariesAndResolveSelection).toHaveBeenCalled();
  });
});
