import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { MemberPage, MemberSummary } from '../../models/member-management.models';
import { MemberManagementService } from '../../services/member-management.service';
import { MemberManagementComponent } from './member-management.component';

describe('MemberManagementComponent', () => {
  let fixture: ComponentFixture<MemberManagementComponent>;
  let members: { list: jasmine.Spy };

  const inactive: MemberSummary = {
    id: 2,
    username: 'zara',
    email: 'zara@example.com',
    status: 'INACTIVE',
    activeProfileCount: 0,
    lastUpdatedAt: '2026-01-02T00:00:00Z',
  };
  const active: MemberSummary = {
    id: 1,
    username: 'alice',
    email: 'alice@example.com',
    status: 'ACTIVE',
    activeProfileCount: 2,
    lastUpdatedAt: '2026-01-03T00:00:00Z',
  };

  function page(content: MemberSummary[] = [active, inactive], currentPage = 0, totalPages = 1, totalElements = content.length): MemberPage {
    return { content, page: currentPage, size: 10, totalElements, totalPages };
  }

  beforeEach(async () => {
    members = { list: jasmine.createSpy('list').and.returnValue(of(page())) };
    await TestBed.configureTestingModule({
      imports: [MemberManagementComponent],
      providers: [{ provide: MemberManagementService, useValue: members }],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberManagementComponent);
  });

  function initialize(): MemberManagementComponent {
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('loads inactive Members by default and preserves backend ordering without Profile-derived fields', () => {
    members.list.and.returnValue(of(page([inactive, active])));
    const component = initialize();

    expect(members.list).toHaveBeenCalledWith(0, 10, '', undefined);
    expect(component.members).toEqual([inactive, active]);
    const rows = [...fixture.nativeElement.querySelectorAll('tbody tr')].map((row: HTMLTableRowElement) => row.cells[0].textContent?.trim());
    expect(rows).toEqual(['zara', 'alice']);
    expect(fixture.nativeElement.textContent).not.toContain('Full Name');
    expect(fixture.nativeElement.textContent).not.toContain('Job Title');
    expect(fixture.nativeElement.textContent).toContain('INACTIVE');
  });

  it('resets applied search and status filters to page zero and clears them', () => {
    const component = initialize();
    members.list.calls.reset();

    component.searchDraft = '  alice  ';
    component.statusDraft = 'INACTIVE';
    component.applyFilters();
    expect(members.list).toHaveBeenCalledWith(0, 10, 'alice', 'INACTIVE');

    members.list.calls.reset();
    component.clearFilters();
    expect(members.list).toHaveBeenCalledWith(0, 10, '', undefined);
    expect(component.searchTerm).toBe('');
    expect(component.statusFilter).toBe('ALL');
  });

  it('shows total count, page boundaries, and the backend-recovered page', () => {
    members.list.and.returnValue(of(page([active], 0, 3, 21)));
    const component = initialize();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('21 Members');
    expect(fixture.nativeElement.textContent).toContain('Page 1 of 3');
    const buttons = fixture.nativeElement.querySelectorAll('.pagination button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].disabled).toBeTrue();
    expect(buttons[1].disabled).toBeFalse();

    members.list.and.returnValue(of(page([active], 1, 3, 21)));
    component.goToPage(1);
    fixture.detectChanges();
    expect(members.list).toHaveBeenCalledWith(1, 10, '', undefined);
    expect(fixture.nativeElement.textContent).toContain('Page 2 of 3');

    members.list.and.returnValue(of(page([active], 1, 2, 11)));
    component.loadMembers(9);
    fixture.detectChanges();
    expect(component.currentPage).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('The requested page was unavailable. Showing page 2 instead.');
  });

  it('renders loading, unfiltered-empty, filtered-empty, error, retry, and busy states', () => {
    const initialRequest = new Subject<MemberPage>();
    members.list.and.returnValue(initialRequest);
    const component = initialize();

    expect(component.loading).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Loading Members...');
    initialRequest.next(page([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No Members yet');

    const filteredRequest = new Subject<MemberPage>();
    members.list.and.returnValue(filteredRequest);
    component.searchDraft = 'missing';
    component.applyFilters();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Filtering Members...');
    filteredRequest.next(page([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No Members match these filters');

    const failedRequest = new Subject<MemberPage>();
    members.list.and.returnValue(failedRequest);
    component.loadMembers(0, 'missing', 'ALL');
    failedRequest.error(new HttpErrorResponse({ status: 503, error: { message: 'Members service unavailable' } }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Members service unavailable');
    expect(component.loading).toBeFalse();

    members.list.and.returnValue(of(page([active], 0, 1, 1)));
    component.retryMembers();
    fixture.detectChanges();
    expect(members.list).toHaveBeenCalledWith(0, 10, 'missing', undefined);
    expect(component.loading).toBeFalse();
  });

  it('keeps the row action at the workspace boundary without entering Member Profile context', () => {
    const component = initialize();
    const action = fixture.nativeElement.querySelector('.row-actions button') as HTMLButtonElement;

    action.click();
    fixture.detectChanges();

    expect(component.currentPage).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Managed Member Profile context is not available');
    expect(fixture.nativeElement.querySelector('app-profile-copy')).toBeNull();
  });
});
