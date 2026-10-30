import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, defer, finalize, Observable, of, Subscription, switchMap, tap, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChangePasswordResponse, LoginRequest, LoginResponse, UserProfile } from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private tokenSignal = signal<string | null>(this.getStoredToken());
  private currentUserSignal = signal<UserProfile | null>(this.getStoredUser());
  private sessionPollSub?: Subscription;
  private passwordChangeInProgress = false;

  readonly token = computed(() => this.tokenSignal());
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly userRole = computed(() => this.currentUserSignal()?.rol ?? null);

  constructor() {
    if (this.isAuthenticated()) {
      this.startSessionPolling();
    }
  }

  private getStoredToken(): string | null {
    return localStorage.getItem('token');
  }

  private getStoredUser(): UserProfile | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          // Guarda también sesion para compatibilidad con código existente
          localStorage.setItem(
            'sesion',
            JSON.stringify({
              rol: response.user.rol,
              correo: response.user.correo,
              nombres: response.user.nombres,
            })
          );

          this.tokenSignal.set(response.token);
          this.currentUserSignal.set(response.user);
          sessionStorage.setItem('temp_password', credentials.password);
          this.startSessionPolling();
        })
      );
  }

  checkSessionNow(): void {
    this.comprobarSesion().subscribe();
  }

  private comprobarSesion(): Observable<void | null> {
    const requestToken = this.token();
    if (!requestToken || this.passwordChangeInProgress) return of(null);

    return this.http
      .get<void>(`${environment.apiUrl}/auth/session`)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          // Una respuesta del token anterior no debe cerrar una sesión renovada.
          if (
            err.status === 401 &&
            !this.passwordChangeInProgress &&
            requestToken === this.token() &&
            requestToken === this.getStoredToken()
          ) {
            const message = String(err.error?.message ?? '').toLowerCase();
            const desactivado = err.error?.error === 'usuario_inactivo' || message.includes('inactiv');
            this.cerrarSesionPorError(desactivado);
          }
          return of(null);
        })
      );
  }

  private onWindowFocus = (): void => {
    if (this.isAuthenticated()) {
      this.checkSessionNow();
    }
  };

  private onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.isAuthenticated()) {
      this.checkSessionNow();
    }
  };

  startSessionPolling(): void {
    this.stopSessionPolling();
    if (!this.isAuthenticated()) return;

    // Polling ordenado cada 30 segundos para evitar saturar la consola/red de inspección
    this.sessionPollSub = timer(10000, 30000)
      .pipe(switchMap(() => this.comprobarSesion()))
      .subscribe();
  }

  stopSessionPolling(): void {
    if (this.sessionPollSub) {
      this.sessionPollSub.unsubscribe();
      this.sessionPollSub = undefined;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.onWindowFocus);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  private cerrarSesionPorError(desactivado: boolean): void {
    const rawRole = (this.userRole() || '').toUpperCase();
    const currentUrl = this.router.url;
    const ultimoLogin = sessionStorage.getItem('ultimo_login');

    const isConductor =
      rawRole === 'CONDUCTOR' ||
      rawRole === 'CHOFER' ||
      currentUrl.includes('/conductor') ||
      ultimoLogin === 'conductor';

    const isOperador =
      rawRole === 'OPERADOR' ||
      rawRole === 'ORGANIZADOR' ||
      currentUrl.includes('/operador') ||
      ultimoLogin === 'operador';

    this.stopSessionPolling();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sesion');
    sessionStorage.removeItem('temp_password');
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);

    let targetRoute = '/login/admin';
    if (isConductor) {
      targetRoute = '/login/conductor';
    } else if (isOperador) {
      targetRoute = '/login/operador';
    }

    this.router.navigate([targetRoute], {
      queryParams: desactivado ? { desactivado: 'true' } : { sessionExpired: 'true' },
    });
  }

  getTempPassword(): string {
    return sessionStorage.getItem('temp_password') || '';
  }

  clearTempPassword(): void {
    sessionStorage.removeItem('temp_password');
  }

  me(): Observable<{ user: UserProfile }> {
    return this.http.get<{ user: UserProfile }>(`${environment.apiUrl}/auth/me`);
  }

  changePassword(actual: string, nuevo: string): Observable<ChangePasswordResponse> {
    return defer(() => {
      this.passwordChangeInProgress = true;
      this.stopSessionPolling();

      return this.http
        .patch<ChangePasswordResponse>(`${environment.apiUrl}/auth/change-password`, {
          password_actual: actual,
          password_nuevo: nuevo,
        })
        .pipe(
          tap((response) => {
            localStorage.setItem('token', response.token);
            this.tokenSignal.set(response.token);

            const u = this.currentUserSignal();
            if (u) {
              const updated = { ...u, debe_cambiar_password: false };
              localStorage.setItem('user', JSON.stringify(updated));
              this.currentUserSignal.set(updated);
            }
            this.clearTempPassword();
          }),
          finalize(() => {
            this.passwordChangeInProgress = false;
            this.startSessionPolling();
          })
        );
    });
  }

  requestPasswordReset(correo: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/auth/password-reset/request`,
      { correo }
    );
  }

  confirmPasswordReset(token: string, password_nuevo: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/auth/password-reset/confirm`,
      { token, password_nuevo }
    );
  }

  cerrarSesion(): void {
    const rawRole = (this.userRole() || '').toUpperCase();
    const currentUrl = this.router.url;
    const ultimoLogin = sessionStorage.getItem('ultimo_login');

    const isConductor =
      rawRole === 'CONDUCTOR' ||
      rawRole === 'CHOFER' ||
      currentUrl.includes('/conductor') ||
      ultimoLogin === 'conductor';

    const isOperador =
      rawRole === 'OPERADOR' ||
      rawRole === 'ORGANIZADOR' ||
      currentUrl.includes('/operador') ||
      ultimoLogin === 'operador';

    this.stopSessionPolling();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sesion');
    sessionStorage.removeItem('temp_password');
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);

    let targetRoute = '/login/admin';
    if (isConductor) {
      targetRoute = '/login/conductor';
    } else if (isOperador) {
      targetRoute = '/login/operador';
    }

    this.router.navigate([targetRoute]);
  }
}
