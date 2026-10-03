import { Routes } from '@angular/router';

import { PublicLayout } from './layout/public-layout/public-layout';
import { AdminLayout } from './layout/admin-layout/admin-layout';
import { ConductorLayout } from './layout/conductor-layout/conductor-layout';

import { Inicio } from './features/inicio/inicio';
import { Cotizacion } from './features/cotizacion/cotizacion';
import { TrackingPublico } from './features/tracking-publico/tracking-publico';

import { AdminLogin } from './features/auth/admin-login/admin-login';
import { ConductorLogin } from './features/auth/conductor-login/conductor-login';
import { RecuperarPassword } from './features/auth/recuperar-password/recuperar-password';
import { RestablecerPassword } from './features/auth/restablecer-password/restablecer-password';
import { PrimerCambioPassword } from './features/auth/primer-cambio-password/primer-cambio-password';

import { Dashboard } from './features/dashboard/dashboard';
import { Paquetes } from './features/paquetes/paquetes';
import { ListaUsuarios } from './features/usuarios/lista-usuarios/lista-usuarios';
import { AltaPersonal } from './features/usuarios/alta-personal/alta-personal';

import { Operador } from './features/operador/operador';
import { MisLotes } from './features/conductor/mis-lotes/mis-lotes';
import { PerfilConductor } from './features/conductor/perfil/perfil';
import { RutasConductor } from './features/rutas-conductor/rutas-conductor';
import { Entregas } from './features/entregas/entregas';

import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  // Flujo público
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        component: Inicio,
      },
      {
        path: 'cotizar',
        component: Cotizacion,
      },
      {
        path: 'seguimiento',
        component: TrackingPublico,
      },
    ],
  },

  // Flujo de Autenticación (Visily 1, 2, 3, 15)
  {
    path: 'login',
    redirectTo: 'login/admin',
    pathMatch: 'full',
  },
  {
    path: 'login/admin',
    component: AdminLogin,
  },
  {
    path: 'login/conductor',
    component: ConductorLogin,
  },

  // Flujo F3: Recuperación y Restablecimiento de Contraseña (Visily 4, 5, 6, 7, 8)
  {
    path: 'recuperar',
    component: RecuperarPassword,
  },
  {
    path: 'restablecer',
    component: RestablecerPassword,
  },
  {
    path: 'restablecer/:token',
    component: RestablecerPassword,
  },

  // Flujo F1: Primer cambio de contraseña tras alta de personal (Visily 9)
  {
    path: 'cambiar-contrasena',
    component: PrimerCambioPassword,
  },
  {
    path: 'primer-cambio-password',
    component: PrimerCambioPassword,
  },

  // Portal Operador (Visily 14)
  {
    path: 'operador',
    component: Operador,
    canActivate: [authGuard],
    data: {
      rol: 'OPERADOR',
    },
  },

  // Portal Administrador (Visily 10, 11, 11.5, 12, 13)
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard],
    data: {
      rol: 'ADMINISTRADOR',
    },
    children: [
      {
        path: '',
        redirectTo: 'usuarios',
        pathMatch: 'full',
      },
      {
        path: 'usuarios',
        component: ListaUsuarios,
      },
      {
        path: 'usuarios/nuevo',
        component: AltaPersonal,
      },
      {
        path: 'dashboard',
        component: Dashboard,
      },
      {
        path: 'paquetes',
        component: Paquetes,
      },
    ],
  },

  // Portal Conductor Móvil (Visily 16, 17)
  {
    path: 'conductor',
    component: ConductorLayout,
    canActivate: [authGuard],
    data: {
      rol: 'CONDUCTOR',
    },
    children: [
      {
        path: '',
        redirectTo: 'mis-lotes',
        pathMatch: 'full',
      },
      {
        path: 'mis-lotes',
        component: MisLotes,
      },
      {
        path: 'perfil',
        component: PerfilConductor,
      },
      {
        path: 'asignaciones',
        component: RutasConductor,
      },
      {
        path: 'lote/:id',
        component: Entregas,
      },
    ],
  },

  {
    path: '**',
    redirectTo: '',
  },
];