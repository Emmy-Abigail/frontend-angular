import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el 401 ocurre fuera del endpoint de login, la sesión ha vencido
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('sesion');
        localStorage.removeItem('user');
        router.navigate(['/login/admin'], {
          queryParams: { sessionExpired: 'true' },
        });
      }
      return throwError(() => error);
    })
  );
};
