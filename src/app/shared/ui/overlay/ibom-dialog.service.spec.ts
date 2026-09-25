import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';

import { IbomDialogService } from './ibom-dialog.service';

class DialogProbe {}

describe('IbomDialogService', () => {
  let service: IbomDialogService;
  let openDialog: jasmine.Spy;
  let dialogRef: MatDialogRef<DialogProbe>;

  beforeEach(() => {
    dialogRef = {} as MatDialogRef<DialogProbe>;
    openDialog = jasmine.createSpy('open').and.returnValue(dialogRef);

    TestBed.configureTestingModule({
      providers: [
        IbomDialogService,
        { provide: MatDialog, useValue: { open: openDialog } },
      ],
    });
    service = TestBed.inject(IbomDialogService);
  });

  it('applies shared surface, accessibility, and focus defaults', () => {
    expect(service.open(DialogProbe)).toBe(dialogRef);

    const [component, config] = openDialog.calls.mostRecent().args as [
      typeof DialogProbe,
      MatDialogConfig,
    ];
    expect(component).toBe(DialogProbe);
    expect(config).toEqual(jasmine.objectContaining({
      hasBackdrop: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      ariaModal: true,
      maxWidth: 'min(92vw, 40rem)',
      panelClass: ['ibom-dialog-panel'],
      backdropClass: ['ibom-dialog-backdrop'],
    }));
  });

  it('preserves caller options and composes feature styling hooks', () => {
    const config: MatDialogConfig<{ title: string }> = {
      data: { title: 'Confirm change' },
      autoFocus: 'dialog',
      restoreFocus: false,
      maxWidth: '48rem',
      panelClass: ['feature-dialog', 'compact-dialog'],
      backdropClass: 'feature-backdrop',
    };

    service.open(DialogProbe, config);

    const [, passedConfig] = openDialog.calls.mostRecent().args as [
      typeof DialogProbe,
      MatDialogConfig<{ title: string }>,
    ];
    expect(passedConfig).toEqual(jasmine.objectContaining({
      data: config.data,
      autoFocus: 'dialog',
      restoreFocus: false,
      maxWidth: '48rem',
      panelClass: ['ibom-dialog-panel', 'feature-dialog', 'compact-dialog'],
      backdropClass: ['ibom-dialog-backdrop', 'feature-backdrop'],
    }));
  });
});
