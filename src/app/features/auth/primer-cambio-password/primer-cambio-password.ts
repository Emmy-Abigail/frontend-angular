import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
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
export class PrimerCambioPassword implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  passwordActual = '';
  passwordNueva = '';
  passwordConfirm = '';
  verPasswordActual = false;
  verPassword1 = false;
  verPassword2 = false;

  cargando = false;
  errorMsg = '';

  ngOnInit(): void {
    // Si el usuario acaba de iniciar sesión, recuperar su contraseña temporal
    this.passwordActual = this.authService.getTempPassword();
  }

  get tieneMinimo8(): boolean {
    return this.passwordNueva.length >= 8 && this.passwordNueva.length <= 72;
  }

  get tieneMayuscula(): boolean {
    return /[A-Z]/.test(this.passwordNueva);
  }

  get tieneNumero(): boolean {
    return /\d/.test(this.passwordNueva);
  }

  get tieneSimbolo(): boolean {
    return /[@#$%&]/.test(this.passwordNueva);
  }

  get formularioValido(): boolean {
    return (
      !!this.passwordActual.trim() &&
      this.tieneMinimo8 &&
      this.tieneMayuscula &&
      this.tieneNumero &&
      this.tieneSimbolo &&
      this.passwordNueva === this.passwordConfirm &&
      this.passwordNueva !== this.passwordActual
    );
  }

  guardarYContinuar(): void {
    if (!this.passwordActual.trim()) {
      this.errorMsg = 'Por favor ingrese su contraseña actual (temporal).';
      this.cdr.markForCheck();
      return;
    }

    if (!this.tieneMinimo8 || !this.tieneMayuscula || !this.tieneNumero || !this.tieneSimbolo) {
      this.errorMsg = 'La contraseña debe cumplir con todos los requisitos de seguridad (mínimo 8 caracteres, mayúscula, número y símbolo @#$%&).';
      this.cdr.markForCheck();
      return;
    }

    if (this.passwordNueva !== this.passwordConfirm) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      this.cdr.markForCheck();
      return;
    }

    if (this.passwordNueva === this.passwordActual) {
      this.errorMsg = 'La nueva contraseña debe ser diferente a la contraseña actual.';
      this.cdr.markForCheck();
      return;
    }

    this.cargando = true;
    this.errorMsg = '';
    this.cdr.markForCheck();

    this.authService
      .changePassword(this.passwordActual.trim(), this.passwordNueva)
      .subscribe({
        next: () => {
          this.cargando = false;
          this.authService.clearTempPassword();
          this.cdr.markForCheck();
          this.redirigirSegunRol();
        },
        error: (err) => {
          this.cargando = false;
          if (err.status === 400 && err.error?.error === 'password_actual_incorrecta') {
            this.errorMsg = 'La contraseña actual ingresada es incorrecta.';
          } else if (err.status === 422) {
            this.errorMsg = err.error?.message || 'La contraseña no cumple con los requisitos del servidor.';
          } else {
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

