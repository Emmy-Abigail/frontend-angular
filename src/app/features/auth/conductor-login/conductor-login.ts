import { AfterViewInit, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth';
import { RecaptchaService } from '../../../core/services/recaptcha.service';
import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, ThemeToggle],
  selector: 'app-conductor-login',
  styleUrl: './conductor-login.css',
  templateUrl: './conductor-login.html',
})
export class ConductorLogin implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private recaptchaService = inject(RecaptchaService);
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

  recaptchaWidgetId: number | null = null;
  recaptchaToken = '';

  ngOnInit(): void {
    sessionStorage.setItem('ultimo_login', 'conductor');

    this.route.queryParams.subscribe((params) => {
      this.cuentaDesactivada = params['desactivado'] === 'true';
      this.sessionExpired =
        !this.cuentaDesactivada && params['sessionExpired'] === 'true';

      this.cdr.markForCheck();
    });

    const user = this.authService.currentUser();

    if (this.authService.isAuthenticated() && user?.rol === 'CONDUCTOR') {
      this.router.navigate(['/conductor/mis-lotes']);
    }
  }

  ngAfterViewInit(): void {
    this.iniciarRecaptcha();
    this.iniciarGoogleSignIn();
  }

  private iniciarGoogleSignIn(): void {
    const initGsi = () => {
      const google = (window as any).google;
      const container = document.getElementById('google-btn-conductor');
      if (google?.accounts?.id && container) {
        container.innerHTML = '';
        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (response: { credential: string }) => {
            this.iniciarSesionConGoogle(response.credential);
          },
        });
        google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'rectangular',
          locale: 'es',
        });
      } else {
        setTimeout(initGsi, 200);
      }
    };
    initGsi();
  }

  private iniciarRecaptcha(): void {
    this.recaptchaService
      .render(
        'recaptcha-conductor',
        (token) => {
          this.recaptchaToken = token;
          this.error = '';
          this.cdr.markForCheck();
        },
        () => {
          this.recaptchaToken = '';
          this.cdr.markForCheck();
        }
      )
      .then((widgetId) => {
        this.recaptchaWidgetId = widgetId;
      });
  }

  alternarContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  iniciarSesion(): void {
    if (!this.correo || !this.contrasena) {
      this.error = 'Por favor ingrese su correo y contraseña.';
      return;
    }

    let token = this.recaptchaToken;
    if (!token) {
      token = this.recaptchaService.getResponse(this.recaptchaWidgetId);
    }

    this.error = '';
    this.sessionExpired = false;
    this.cuentaDesactivada = false;
    this.cargando = true;

    this.authService
      .login({
        correo: this.correo.trim(),
        password: this.contrasena,
        recaptcha_token: token || undefined,
      })
      .pipe(timeout(8000))
      .subscribe({
        next: (response) => {
          this.cargando = false;
          this.cdr.markForCheck();

          // Restringir estrictamente al rol CONDUCTOR.
          if (response.user.rol !== 'CONDUCTOR') {
            this.authService.cerrarSesion();
            this.error =
              'Acceso denegado: este portal es exclusivo para conductores. Administradores y operadores deben ingresar por el portal administrativo (/login/admin).';

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
          const errCode = err.error?.error;

          if (err.name === 'TimeoutError') {
            this.error = 'El servidor tardó demasiado en responder.';
          } else if (err.status === 429) {
            this.error = err.error?.message;
          } else if (errCode === 'captcha_invalido') {
            this.error = err.error?.message || 'Captcha inválido o expirado. Vuelve a marcar la casilla.';
            this.recaptchaService.reset(this.recaptchaWidgetId);
            this.recaptchaToken = '';
          } else if (errCode === 'captcha_no_disponible' || err.status === 503) {
            this.error = err.error?.message || 'No se pudo verificar el reCAPTCHA. Intenta de nuevo en unos segundos.';
            this.recaptchaService.reset(this.recaptchaWidgetId);
            this.recaptchaToken = '';
          } else if (err.status === 401) {
            this.error =
              'El correo electrónico o contraseña que ha proporcionado no son correctos. Inténtelo de nuevo.';
            this.recaptchaService.reset(this.recaptchaWidgetId);
            this.recaptchaToken = '';
          } else if (err.status === 422) {
            this.error =
              err.error?.message || 'Los datos ingresados no son válidos.';
            this.recaptchaService.reset(this.recaptchaWidgetId);
            this.recaptchaToken = '';
          } else {
            this.error = 'Ocurrió un error al conectar con el servidor.';
          }

          this.cdr.markForCheck();
        },
      });
  }

  iniciarSesionConGoogle(idToken: string): void {
    if (!idToken) return;

    this.cargando = true;
    this.error = '';
    this.sessionExpired = false;
    this.cuentaDesactivada = false;

    this.authService
      .loginWithGoogle({ id_token: idToken })
      .pipe(timeout(10000))
      .subscribe({
        next: (response) => {
          this.cargando = false;
          this.cdr.markForCheck();

          if (response.user.rol !== 'CONDUCTOR') {
            this.authService.cerrarSesion();
            this.error =
              'Acceso denegado: este portal es exclusivo para conductores. Administradores y operadores deben ingresar por el portal administrativo (/login/admin).';
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
          const errCode = err.error?.error;

          if (err.name === 'TimeoutError') {
            this.error =
              'El servidor tardó demasiado en responder al verificar con Google. Intente nuevamente.';
          } else if (err.status === 429) {
            this.error = err.error?.message;
          } else if (errCode === 'cuenta_no_registrada') {
            this.error = 'Tu cuenta de Google no está registrada en el sistema.';
          } else if (errCode === 'google_token_invalido') {
            this.error = 'El inicio de sesión con Google no es válido o expiró. Intenta de nuevo.';
          } else if (errCode === 'google_no_disponible' || err.status === 503) {
            this.error = 'El servicio de Google no está disponible temporalmente. Intenta más tarde.';
          } else {
            this.error =
              err.error?.message || 'Ocurrió un error al iniciar sesión con Google.';
          }

          this.cdr.markForCheck();
        },
      });
  }
}
