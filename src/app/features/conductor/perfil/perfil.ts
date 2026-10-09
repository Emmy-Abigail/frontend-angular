import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-perfil-conductor',
  styleUrl: './perfil.css',
  templateUrl: './perfil.html',
})
export class PerfilConductor {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login/conductor']);
  }
}
