import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const token = localStorage.getItem('token');
  const user = authService.currentUser();
  const requiredRol = route.data['rol'];

  if (!token || !user) {
    if (requiredRol === 'conductor' || requiredRol === 'CONDUCTOR') {
      return router.parseUrl('/login/conductor');
    }
    return router.parseUrl('/login/admin');
  }

  // Mismo criterio que el backend (MustChangePasswordMiddleware): bloquea
  // cualquier pantalla protegida hasta que complete el cambio obligatorio.
  // /cambiar-contrasena no tiene este guard, así que no hay riesgo de bucle.
  if (user.debe_cambiar_password) {
    return router.parseUrl('/cambiar-contrasena');
  }

  if (requiredRol) {
    const userRol = (user.rol || '').toUpperCase();
    const targetRol = (requiredRol || '').toUpperCase();

    const isMatch =
      userRol === targetRol ||
      (targetRol === 'ADMIN' && userRol === 'ADMINISTRADOR') ||
      (targetRol === 'ADMINISTRADOR' && userRol === 'ADMIN') ||
      (targetRol === 'OPERADOR' && (userRol === 'OPERADOR' || userRol === 'ORGANIZADOR')) ||
      (targetRol === 'CONDUCTOR' && (userRol === 'CONDUCTOR' || userRol === 'CHOFER'));

    if (!isMatch) {
      if (userRol === 'ADMINISTRADOR' || userRol === 'ADMIN') {
        return router.parseUrl('/admin/usuarios');
      }
      if (userRol === 'OPERADOR') {
        return router.parseUrl('/operador');
      }
      if (userRol === 'CONDUCTOR') {
        return router.parseUrl('/conductor/mis-lotes');
      }
      return router.parseUrl('/');
    }
  }

  return true;
};