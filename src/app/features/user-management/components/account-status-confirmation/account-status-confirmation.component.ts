import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorResponse } from '../../../../core/http/api.models';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { UserManagementService } from '../../services/user-management.service';
import { UserStatus, UserSummary } from '../../models/user-management.models';

interface StatusConfirmation {
  user: UserSummary;
  requestedStatus: UserStatus;
  errorMessage: string;
}

export interface UserStatusChangedEvent {
  user: UserSummary;
  requestedStatus: UserStatus;
}

@Component({
  selector: 'app-account-status-confirmation',
  standalone: true,
  templateUrl: './account-status-confirmation.component.html',
  styleUrl: './account-status-confirmation.component.scss',
})
export class AccountStatusConfirmationComponent implements AfterViewChecked {
  private readonly userService = inject(UserManagementService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);

  @Input({ required: true }) user!: UserSummary;
  @Output() readonly statusChanged = new EventEmitter<UserStatusChangedEvent>();
  @ViewChild('statusDialog') private statusDialog?: ElementRef<HTMLElement>;

  statusConfirmation: StatusConfirmation | null = null;
  private isPending = false;
  private lastStatusActionTarget: HTMLElement | null = null;
  private focusStatusDialog = false;

  ngAfterViewChecked(): void {
    if (this.focusStatusDialog && this.statusDialog) {
      this.focusStatusDialog = false;
      this.statusDialog.nativeElement.focus();
    }
  }

  isCurrentUser(user: UserSummary): boolean {
    const currentUser = this.authService.user();
    return currentUser !== null && String(currentUser.id) === String(user.id);
  }

  isSelfDeactivationUnavailable(user: UserSummary): boolean {
    return user.status === 'ACTIVE' && this.isCurrentUser(user);
  }

  isStatusChangePending(_user: UserSummary): boolean {
    return this.isPending;
  }

  statusAction(user: UserSummary): UserStatus {
    return user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  statusActionLabel(user: UserSummary): string {
    return this.statusChangeVerb(this.statusAction(user));
  }

  statusChangeVerb(status: UserStatus): string {
    return status === 'ACTIVE' ? 'Activate' : 'Deactivate';
  }

  statusChangeCopy(confirmation: StatusConfirmation): string {
    return confirmation.requestedStatus === 'INACTIVE'
      ? `This will make ${confirmation.user.username}'s account access and existing authenticated sessions unusable. The account and its Profile data will be retained.`
      : `This will allow ${confirmation.user.username} to sign in again. Existing sessions are not restored.`;
  }

  requestStatusChange(user: UserSummary): void {
    if (this.isPending || this.isSelfDeactivationUnavailable(user)) return;

    this.lastStatusActionTarget = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.statusConfirmation = {
      user,
      requestedStatus: this.statusAction(user),
      errorMessage: '',
    };
    this.focusStatusDialog = true;
  }

  cancelStatusChange(event?: MouseEvent): void {
    if (event && event.target !== event.currentTarget) return;
    if (this.isPending) return;

    this.statusConfirmation = null;
    this.focusStatusDialog = false;
    this.lastStatusActionTarget?.focus();
    this.lastStatusActionTarget = null;
  }

  confirmStatusChange(): void {
    const confirmation = this.statusConfirmation;
    if (!confirmation || this.isPending) return;

    if (confirmation.requestedStatus === 'INACTIVE' && this.isCurrentUser(confirmation.user)) {
      this.statusConfirmation = {
        ...confirmation,
        errorMessage: 'You cannot deactivate your own account.',
      };
      return;
    }

    this.isPending = true;
    this.statusConfirmation = { ...confirmation, errorMessage: '' };

    this.userService.updateStatus(confirmation.user.id, confirmation.requestedStatus).subscribe({
      next: () => {
        this.isPending = false;
        this.cancelStatusChange();
        this.statusChanged.emit({ user: confirmation.user, requestedStatus: confirmation.requestedStatus });
      },
      error: (error: unknown) => {
        this.isPending = false;
        const message = this.statusMutationErrorMessage(error, confirmation.user);
        if (this.statusConfirmation && this.sameStatusConfirmation(this.statusConfirmation, confirmation)) {
          this.statusConfirmation = { ...this.statusConfirmation, errorMessage: message };
        }
        this.notifications.showError(message);
      },
    });
  }

  handleStatusDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelStatusChange();
      return;
    }

    if (event.key !== 'Tab' || !this.statusDialog) return;
    const focusable = Array.from(this.statusDialog.nativeElement.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private statusMutationErrorMessage(error: unknown, user: UserSummary): string {
    if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
      const response = error.error as ApiErrorResponse;
      if (response.errorCode === 'USER_SELF_DEACTIVATION_NOT_ALLOWED') return 'You cannot deactivate your own account.';
    }

    if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
      const message = (error.error as ApiErrorResponse).message;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }

    return `Unable to update ${user.username}'s account status. Please try again.`;
  }

  private sameStatusConfirmation(left: StatusConfirmation, right: StatusConfirmation): boolean {
    return String(left.user.id) === String(right.user.id) && left.requestedStatus === right.requestedStatus;
  }
}
