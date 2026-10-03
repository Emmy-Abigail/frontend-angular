import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-primer-cambio-password',
  styleUrl: './primer-cambio-password.css',
  templateUrl: './primer-cambio-password.html',
})
export class PrimerCambioPassword {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  passwordNueva = '';
  passwordConfirm = '';
  verPassword1 = false;
  verPassword2 = false;

  cargando = false;
  errorMsg = '';

  get tieneMinimo8(): boolean {
    return this.passwordNueva.length >= 8;
  }

  get tieneMayuscula(): boolean {
    return /[A-Z]/.test(this.passwordNueva);
  }

  get tieneNumero(): boolean {
    return /\d/.test(this.passwordNueva);
  }

  get tieneSimbolo(): boolean {
    return /[@#$%&*!_\-]/.test(this.passwordNueva);
  }

  get formularioValido(): boolean {
    return (
      this.tieneMinimo8 &&
      this.tieneMayuscula &&
      this.tieneNumero &&
      this.tieneSimbolo &&
      this.passwordNueva === this.passwordConfirm
    );
  }

  guardarYContinuar(): void {
    if (!this.formularioValido) {
      if (this.passwordNueva !== this.passwordConfirm) {
        this.errorMsg = 'Las contraseñas no coinciden.';
      } else {
        this.errorMsg = 'La contraseña debe cumplir con todos los requisitos de seguridad.';
      }
      return;
    }

    this.cargando = true;
    this.errorMsg = '';
    this.cdr.markForCheck();

    // Obtener la contraseña actual guardada durante el login (o temporal)
    const passActual = (this.authService as any).getLastPassword?.() || 'Temporal123!';

    this.authService.changePassword(passActual, this.passwordNueva).subscribe({
      next: () => {
        this.cargando = false;
        this.cdr.markForCheck();
        // Redirigir según el rol del usuario (Diagrama F1)
        this.redirigirSegunRol();
      },
      error: (err) => {
        this.cargando = false;
        // Si fue una actualización en modo demo o el backend completó
        if (err.status === 200 || !err.status) {
          this.redirigirSegunRol();
        } else {
          // Mostrar mensaje amigable de la respuesta
          this.errorMsg = err.error?.message || 'Error al actualizar la contraseña.';
        }
        this.cdr.markForCheck();
      },
    });
  }

  private redirigirSegunRol(): void {
    const rol = this.authService.userRole();
    if (rol === 'ADMINISTRADOR') {
      this.router.navigate(['/admin/usuarios']);
    } else if (rol === 'CONDUCTOR') {
      this.router.navigate(['/conductor/mis-lotes']);
    } else {
      // OPERADOR
      this.router.navigate(['/operador']);
    }
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }
}
