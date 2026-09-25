import { Injectable, inject } from '@angular/core';
import { ComponentType } from '@angular/cdk/portal';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';

@Injectable({ providedIn: 'root' })
export class IbomDialogService {
  private readonly dialog = inject(MatDialog);

  open<T, D = unknown, R = unknown>(
    component: ComponentType<T>,
    config: MatDialogConfig<D> = {},
  ): MatDialogRef<T, R> {
    const {
      panelClass: configuredPanelClass,
      backdropClass: configuredBackdropClass,
      ...overrides
    } = config;

    return this.dialog.open<T, D, R>(component, {
      hasBackdrop: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      ariaModal: true,
      maxWidth: 'min(92vw, 40rem)',
      ...overrides,
      panelClass: this.mergeClasses('ibom-dialog-panel', configuredPanelClass),
      backdropClass: this.mergeClasses('ibom-dialog-backdrop', configuredBackdropClass),
    });
  }

  private mergeClasses(
    defaultClass: string,
    configuredClass: string | string[] | undefined,
  ): string[] {
    const additionalClasses = Array.isArray(configuredClass)
      ? configuredClass
      : configuredClass
        ? [configuredClass]
        : [];

    return [defaultClass, ...additionalClasses];
  }
}
