import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-operador',
  styleUrl: './operador.css',
  templateUrl: './operador.html',
})
export class Operador {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }
}
