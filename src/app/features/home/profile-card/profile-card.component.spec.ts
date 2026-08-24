import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  ProfileCardComponent,
  ProfileCardData,
} from './profile-card.component';

const PROFILE: ProfileCardData = {
  id: 'test-profile',
  profileCode: 'CV-TEST',
  initials: 'TA',
  name: 'Test Applicant',
  role: 'Software Engineer',
  organization: 'FPT Software',
  status: 'ACTIVE PROFILE',
  statusTone: 'ready',
  experience: '5 Years',
  completion: '100% READY',
  filename: 'Test_Profile.pdf',
  primarySkill: 'Angular',
  primarySkillExperience: '5 YRS',
  skills: ['TypeScript', 'SCSS'],
  exportHeading: 'Preview-before-export available',
  exportDescription: 'Ready for PDF and DOCX output.',
  theme: 'blue',
};

describe('ProfileCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileCardComponent],
    }).compileComponents();
  });

  function createCard(id: string): ComponentFixture<ProfileCardComponent> {
    const fixture = TestBed.createComponent(ProfileCardComponent);
    fixture.componentRef.setInput('data', { ...PROFILE, id });
    fixture.detectChanges();
    return fixture;
  }

  it('keeps tab state independent between profile cards', () => {
    const firstCard = createCard('first-profile');
    const secondCard = createCard('second-profile');

    firstCard.nativeElement.querySelector('[data-tab="skills"]').click();
    firstCard.detectChanges();

    expect(firstCard.componentInstance.activeTab).toBe('skills');
    expect(secondCard.componentInstance.activeTab).toBe('overview');
    expect(firstCard.nativeElement.querySelector('[role="tabpanel"]')?.textContent).toContain(
      'Angular',
    );
    expect(secondCard.nativeElement.querySelector('[role="tabpanel"]')?.textContent).toContain(
      'Experience',
    );
  });

  it('updates the accessible tab panel when a tab is selected', () => {
    const fixture = createCard('panel-profile');
    const exportTab = fixture.nativeElement.querySelector('[data-tab="export"]');

    exportTab.click();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('[role="tabpanel"]');
    expect(exportTab.getAttribute('aria-selected')).toBe('true');
    expect(panel.id).toBe('panel-profile-export-panel');
    expect(panel.textContent).toContain('PDF and DOCX output');
  });
});
