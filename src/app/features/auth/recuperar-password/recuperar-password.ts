import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  selector: 'app-recuperar-password',
  styleUrl: './recuperar-password.css',
  templateUrl: './recuperar-password.html',
})
export class RecuperarPassword {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  correo = '';
  enviado = false;
  cargando = false;
  errorMsg = '';

  solicitarRecuperacion(): void {
    if (!this.correo.trim() || !this.correo.includes('@')) {
      this.errorMsg = 'Ingrese un correo electrónico válido.';
      return;
    }

    this.cargando = true;
    this.errorMsg = '';
    this.cdr.markForCheck();

    this.authService.requestPasswordReset(this.correo.trim().toLowerCase()).subscribe({
      next: () => {
        this.cargando = false;
        this.enviado = true;
        this.cdr.markForCheck();
      },
      error: () => {
        // Por seguridad y según diagrama F3, siempre se muestra la pantalla de solicitud enviada (202)
        this.cargando = false;
        this.enviado = true;
        this.cdr.markForCheck();
      },
    });
  }

  reenviarCorreo(): void {
    this.solicitarRecuperacion();
  }

  volverAlLogin(): void {
    this.router.navigate(['/login/admin']);
  }
}
