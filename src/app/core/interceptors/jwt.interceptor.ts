
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const isApiUrl = req.url.startsWith(environment.apiUrl);
  const isPublicApiUrl = isApiUrl && req.url.includes('/public/');

  if (token && isApiUrl && !isPublicApiUrl) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};
