import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { NotificationService } from '../../../../core/notifications/notification.service';
import { MasterDataService } from '../../services/master-data.service';
import { SkillManagementComponent } from '../skill-management/skill-management.component';
import { MasterDataWorkspaceComponent } from './master-data-workspace.component';

describe('MasterDataWorkspaceComponent', () => {
  function configure(resource: string): Promise<void> {
    return TestBed.configureTestingModule({
      imports: [MasterDataWorkspaceComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { resource } } } },
        { provide: MasterDataService, useValue: { listSkills: () => of({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }), listSkillCategories: () => of([]) } },
        { provide: NotificationService, useValue: { showSuccess: jasmine.createSpy('showSuccess') } },
      ],
    }).compileComponents().then(() => undefined);
  }

  it('renders Skills management only for the Skills resource', async () => {
    await configure('Skills');
    const fixture: ComponentFixture<MasterDataWorkspaceComponent> = TestBed.createComponent(MasterDataWorkspaceComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query((element) => element.componentInstance instanceof SkillManagementComponent)).toBeTruthy();
    fixture.destroy();
  });

  it('preserves the placeholder for other Master Data resources', async () => {
    await configure('Languages');
    const fixture = TestBed.createComponent(MasterDataWorkspaceComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query((element) => element.componentInstance instanceof SkillManagementComponent)).toBeNull();
    expect(fixture.nativeElement.querySelector('.master-data-notice').textContent).toContain('Languages');
    fixture.destroy();
  });
});
