import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-admin-layout',
  styleUrl: './admin-layout.css',
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly currentUser = this.authService.currentUser;

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }
}
