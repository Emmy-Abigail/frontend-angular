import { Routes } from '@angular/router';

import { PublicLayout } from './layout/public-layout/public-layout';
import { AdminLayout } from './layout/admin-layout/admin-layout';
import { ConductorLayout } from './layout/conductor-layout/conductor-layout';

import { Inicio } from './features/inicio/inicio';
import { Cotizacion } from './features/cotizacion/cotizacion';
import { TrackingPublico } from './features/tracking-publico/tracking-publico';

import { AdminLogin } from './features/auth/admin-login/admin-login';
import { ConductorLogin } from './features/auth/conductor-login/conductor-login';

import { Dashboard } from './features/dashboard/dashboard';
import { Paquetes } from './features/paquetes/paquetes';

import { RutasConductor } from './features/rutas-conductor/rutas-conductor';
import { Entregas } from './features/entregas/entregas';

import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [

  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        component: Inicio
      },
      {
        path: 'cotizar',
        component: Cotizacion
      },
      {
        path: 'seguimiento',
        component: TrackingPublico
      }
    ]
  },

  {
    path: 'login/admin',
    component: AdminLogin
  },

  {
    path: 'login/conductor',
    component: ConductorLogin
  },

  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard],
    data: {
      rol: 'admin'
    },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: Dashboard
      },
      {
        path: 'paquetes',
        component: Paquetes
      }
    ]
  },

  {
    path: 'conductor',
    component: ConductorLayout,
    canActivate: [authGuard],
    data: {
      rol: 'conductor'
    },
    children: [
      {
        path: '',
        redirectTo: 'asignaciones',
        pathMatch: 'full'
      },
      {
        path: 'asignaciones',
        component: RutasConductor
      },
      {
        path: 'lote/:id',
        component: Entregas
      }
    ]
  }

];