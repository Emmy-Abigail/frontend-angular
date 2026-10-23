
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-operador-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  templateUrl: './operador-layout.html',
  styleUrl: './operador-layout.css',
})
export class OperadorLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;

  get breadcrumb(): string {
    const url = this.router.url.split('?')[0];

    if (url.startsWith('/operador/consulta-paquetes/')) {
      const tracking = decodeURIComponent(
        url.split('/').pop() ?? ''
      );

      return `Inicio / Consulta de Paquetes / ${tracking}`;
    }

    if (url.startsWith('/operador/consulta-paquetes')) {
      return 'Inicio / Consulta de Paquetes';
    }

    return 'Inicio / Registro de Paquete';
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }
}
