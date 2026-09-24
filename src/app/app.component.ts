import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'ibom-ui';

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private handlingSessionEnd = false;

  constructor() {
    this.authService.unexpectedSessionEnded$().subscribe(() => this.handleSessionEnd());
  }

  private handleSessionEnd(): void {
    if (this.handlingSessionEnd || this.router.url.startsWith('/login')) return;
    this.handlingSessionEnd = true;
    if (this.authService.isAuthenticated()) this.authService.clearSession();
    void this.router.navigate(['/login'], { state: { sessionEnded: true } }).finally(() => {
      this.handlingSessionEnd = false;
    });
  }
}
