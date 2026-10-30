import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const requestAuthorization = req.headers.get('Authorization');
      const currentToken = localStorage.getItem('token');
      const usesPreviousToken =
        requestAuthorization?.startsWith('Bearer ') &&
        requestAuthorization !== `Bearer ${currentToken}`;

      // Si el 401 ocurre fuera del endpoint de login, la sesión ha vencido
      if (error.status === 401 && !usesPreviousToken && !req.url.includes('/auth/login') && !req.url.includes('/auth/session')) {
        let isConductor = false;
        let isOperador = false;
        try {
          const rawUser = localStorage.getItem('user');
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            const r = (parsed.rol || '').toUpperCase();
            isConductor = r === 'CONDUCTOR' || r === 'CHOFER';
            isOperador = r === 'OPERADOR' || r === 'ORGANIZADOR';
          }
        } catch {}

        if (router.url.includes('/conductor')) isConductor = true;
        if (router.url.includes('/operador')) isOperador = true;

        const ultimoLogin = sessionStorage.getItem('ultimo_login');
        if (!isConductor && !isOperador) {
          if (ultimoLogin === 'conductor') isConductor = true;
          if (ultimoLogin === 'operador') isOperador = true;
        }

        localStorage.removeItem('token');
        localStorage.removeItem('sesion');
        localStorage.removeItem('user');
        sessionStorage.removeItem('temp_password');

        const errMsg = ((error.error?.message || '') as string).toLowerCase();
        const isDeactivated = error.error?.error === 'usuario_inactivo' || errMsg.includes('inactiv');

        let loginPath = '/login/admin';
        if (isConductor) {
          loginPath = '/login/conductor';
        } else if (isOperador) {
          loginPath = '/login/operador';
        }

        router.navigate([loginPath], {
          queryParams: isDeactivated
            ? { desactivado: 'true' }
            : { sessionExpired: 'true' },
        });
      }
      return throwError(() => error);
    })
  );
};
