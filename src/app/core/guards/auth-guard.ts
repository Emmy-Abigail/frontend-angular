import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route) => {
  const router = inject(Router);

  const rol = route.data['rol'];
  const sesion = localStorage.getItem('sesion');

  if (!sesion) {
    if (rol === 'admin') {
      return router.parseUrl('/login/admin');
    }

    if (rol === 'conductor') {
      return router.parseUrl('/login/conductor');
    }

    return router.parseUrl('/');
  }

  const sesionData = JSON.parse(sesion);

  if (sesionData.rol !== rol) {
    if (sesionData.rol === 'admin') {
      return router.parseUrl('/admin/dashboard');
    }

    if (sesionData.rol === 'conductor') {
      return router.parseUrl('/conductor/asignaciones');
    }

    return router.parseUrl('/');
  }

  return true;
};