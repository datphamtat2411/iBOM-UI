import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 7, 24, 9, 41, 28));

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
    }).compileComponents();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('initializes, updates, and stops the local clock with the component lifecycle', () => {
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.localTime).toBe('09:41:28');

    jasmine.clock().tick(1000);
    expect(fixture.componentInstance.localTime).toBe('09:41:29');

    fixture.destroy();
    jasmine.clock().tick(1000);
    expect(fixture.componentInstance.localTime).toBe('09:41:29');
  });
});
