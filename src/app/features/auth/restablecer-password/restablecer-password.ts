import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

type RestablecerEstado = 'FORMULARIO' | 'EXITO' | 'INVALIDO';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-restablecer-password',
  styleUrl: './restablecer-password.css',
  templateUrl: './restablecer-password.html',
})
export class RestablecerPassword implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  token = '';
  passwordNueva = '';
  passwordConfirm = '';

  verPassword1 = false;
  verPassword2 = false;

  cargando = false;
  errorMsg = '';
  estado: RestablecerEstado = 'FORMULARIO';
  origenRol: 'admin' | 'conductor' | 'operador' = 'admin';

  get loginOrigenPath(): string {
    if (this.origenRol === 'conductor') return '/login/conductor';
    if (this.origenRol === 'operador') return '/login/operador';
    return '/login/admin';
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((queryParams) => {
      this.token =
        queryParams.get('token') ||
        this.route.snapshot.paramMap.get('token') ||
        '';

      const origenParam = queryParams.get('origen');
      const ultimoLogin = sessionStorage.getItem('ultimo_login');
      const origen = origenParam || ultimoLogin;

      if (origen === 'conductor' || origen === 'operador' || origen === 'admin') {
        this.origenRol = origen as 'admin' | 'conductor' | 'operador';
      }

      if (queryParams.get('estado') === 'invalido') {
        this.estado = 'INVALIDO';
      } else {
        this.estado = 'FORMULARIO';
        this.errorMsg = '';
      }
      this.cdr.markForCheck();
    });
  }

  // Validación de los 4 requisitos de seguridad mostrados en Pantalla 6
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
    return /[@#$%&]/.test(this.passwordNueva);
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

  actualizarContrasena(): void {
    if (!this.formularioValido) {
      if (this.passwordNueva !== this.passwordConfirm) {
        this.errorMsg = 'Las contraseñas no coinciden.';
      } else {
        this.errorMsg = 'La contraseña debe cumplir con todos los requisitos de seguridad (mínimo 8 caracteres, mayúscula, número y símbolo @#$%&).';
      }
      return;
    }

    if (!this.token) {
      // Si no hay token válido, mostrar pantalla 8 de enlace vencido/inválido
      this.estado = 'INVALIDO';
      return;
    }

    this.cargando = true;
    this.errorMsg = '';
    this.cdr.markForCheck();

    this.authService.confirmPasswordReset(this.token, this.passwordNueva).subscribe({
      next: () => {
        this.cargando = false;
        this.estado = 'EXITO';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        if (err.status === 400 && (err.error?.error === 'token_invalido' || !err.error?.error)) {
          // Token vencido o inválido (Pantalla 8)
          this.estado = 'INVALIDO';
        } else {
          // Error 422 de política de contraseña, campos vacíos o contraseñas iguales
          this.errorMsg = err.error?.message || 'Error al restablecer la contraseña. Intente nuevamente.';
        }
        this.cdr.markForCheck();
      },
    });
  }

  volverAlLogin(): void {
    this.router.navigate([this.loginOrigenPath]);
  }

  irALoginPersonal(): void {
    this.router.navigate([this.loginOrigenPath]);
  }

  irALoginConductor(): void {
    this.router.navigate(['/login/conductor']);
  }
}
