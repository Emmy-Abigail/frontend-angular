import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el 401 ocurre fuera del endpoint de login, la sesión ha vencido
      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/session')) {
        let isConductor = false;
        try {
          const rawUser = localStorage.getItem('user');
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            isConductor = parsed.rol === 'CONDUCTOR';
          }
        } catch {}

        localStorage.removeItem('token');
        localStorage.removeItem('sesion');
        localStorage.removeItem('user');
        sessionStorage.removeItem('temp_password');

        const loginPath = isConductor ? '/login/conductor' : '/login/admin';
        router.navigate([loginPath], {
          queryParams: { sessionExpired: 'true' },
        });
      }
      return throwError(() => error);
    })
  );
};
