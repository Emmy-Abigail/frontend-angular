import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { timeout } from 'rxjs';
import { AuthService } from '../../../core/services/auth';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  selector: 'app-conductor-login',
  styleUrl: './conductor-login.css',
  templateUrl: './conductor-login.html',
})
export class ConductorLogin implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  correo = '';
  contrasena = '';
  error = '';
  sessionExpired = false;
  cuentaDesactivada = false;
  cargando = false;
  mostrarContrasena = false;

  ngOnInit(): void {
    sessionStorage.setItem('ultimo_login', 'conductor');

    this.route.queryParams.subscribe((params) => {
      if (params['desactivado'] === 'true') {
        this.cuentaDesactivada = true;
      } else if (params['sessionExpired'] === 'true') {
        this.sessionExpired = true;
      }
      this.cdr.markForCheck();
    });

    const user = this.authService.currentUser();
    if (this.authService.isAuthenticated() && user?.rol === 'CONDUCTOR') {
      this.router.navigate(['/conductor/asignaciones']);
    }
  }

  alternarContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  iniciarSesion(): void {
    if (!this.correo || !this.contrasena) {
      this.error = 'Por favor ingrese su correo y contraseña.';
      return;
    }

    this.error = '';
    this.sessionExpired = false;
    this.cargando = true;

    this.authService
      .login({
        correo: this.correo.trim(),
        password: this.contrasena,
      })
      .pipe(timeout(8000))
      .subscribe({
        next: (response) => {
          this.cargando = false;
          this.cdr.markForCheck();

          // Restringir estrictamente al rol CONDUCTOR
          if (response.user.rol !== 'CONDUCTOR') {
            this.authService.cerrarSesion();
            this.error = 'Acceso denegado: este portal es exclusivo para conductores. Administradores y operadores deben ingresar por el portal administrativo (/login/admin).';
            this.cdr.markForCheck();
            return;
          }

          if (response.user.debe_cambiar_password) {
            this.router.navigate(['/cambiar-contrasena']);
          } else {
            this.router.navigate(['/conductor/mis-lotes']);
          }
        },
        error: (err) => {
          this.cargando = false;
          if (err.name === 'TimeoutError') {
            this.error = 'El servidor tardó demasiado en responder.';
          } else if (err.status === 401) {
            this.error =
              'El correo electrónico o contraseña que ha proporcionado no son correctos. Inténtelo de nuevo.';
          } else if (err.status === 422) {
            this.error = err.error?.message || 'Los datos ingresados no son válidos.';
          } else {
            this.error = 'Ocurrió un error al conectar con el servidor.';
          }
          this.cdr.markForCheck();
        },
      });
  }
}