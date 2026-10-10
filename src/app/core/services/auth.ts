import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, Observable, of, Subscription, switchMap, tap, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, UserProfile, UserRole } from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private tokenSignal = signal<string | null>(this.getStoredToken());
  private currentUserSignal = signal<UserProfile | null>(this.getStoredUser());
  private sessionPollSub?: Subscription;

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
    if (!this.isAuthenticated()) return;
    this.http
      .get<void>(`${environment.apiUrl}/auth/session`)
      .pipe(
        catchError((err) => {
          if (err.status === 401) {
            this.cerrarSesionPorDesactivacion();
          }
          return of(null);
        })
      )
      .subscribe();
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

    // Polling rápido cada 10 segundos para respuesta ágil ante desactivación
    this.sessionPollSub = timer(3000, 10000)
      .pipe(
        switchMap(() =>
          this.http.get<void>(`${environment.apiUrl}/auth/session`).pipe(
            catchError((err) => {
              if (err.status === 401) {
                this.cerrarSesionPorDesactivacion();
              }
              return of(null);
            })
          )
        )
      )
      .subscribe();

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.onWindowFocus);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
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

  private cerrarSesionPorDesactivacion(): void {
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
      queryParams: { sessionExpired: 'true', desactivado: 'true' },
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

  changePassword(actual: string, nuevo: string): Observable<{ message: string }> {
    return this.http
      .patch<{ message: string }>(`${environment.apiUrl}/auth/change-password`, {
        password_actual: actual,
        password_nuevo: nuevo,
      })
      .pipe(
        tap(() => {
          const u = this.currentUserSignal();
          if (u) {
            const updated = { ...u, debe_cambiar_password: false };
            localStorage.setItem('user', JSON.stringify(updated));
            this.currentUserSignal.set(updated);
          }
        })
      );
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