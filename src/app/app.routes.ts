
import { Routes } from '@angular/router';

import { PublicLayout } from './layout/public-layout/public-layout';
import { AdminLayout } from './layout/admin-layout/admin-layout';
import { ConductorLayout } from './layout/conductor-layout/conductor-layout';
import { OperadorLayout } from './layout/operador-layout/operador-layout';

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
import { ConsultaPaquetes } from './features/consulta-paquetes/consulta-paquetes';
import { DetallePaquete } from './features/detalle-paquete/detalle-paquete';
import { Lotes } from './features/lotes/lotes';

import { MisLotes } from './features/conductor/mis-lotes/mis-lotes';
import { PerfilConductor } from './features/conductor/perfil/perfil';
import { RutasConductor } from './features/rutas-conductor/rutas-conductor';
import { Entregas } from './features/entregas/entregas';
import { DetallePaqueteConductor } from './features/detalle-paquete-conductor/detalle-paquete-conductor';

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

  // Flujo de autenticación
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
    path: 'login/operador',
    component: AdminLogin,
  },
  {
    path: 'login/conductor',
    component: ConductorLogin,
  },

  // Recuperación y restablecimiento de contraseña
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
  {
    path: 'reset-password',
    component: RestablecerPassword,
  },
  {
    path: 'reset-password/:token',
    component: RestablecerPassword,
  },

  // Primer cambio de contraseña
  {
    path: 'cambiar-contrasena',
    component: PrimerCambioPassword,
  },
  {
    path: 'primer-cambio-password',
    component: PrimerCambioPassword,
  },

  // Portal Operador
  {
    path: 'operador',
    component: OperadorLayout,
    canActivate: [authGuard],
    data: {
      rol: 'OPERADOR',
    },
    children: [
      {
        path: '',
        component: Operador,
      },
      {
        path: 'consulta-paquetes',
        component: ConsultaPaquetes,
      },
      {
        path: 'consulta-paquetes/:tracking',
        component: DetallePaquete,
      },
      {
        path: 'lotes',
        component: Lotes,
      },
    ],
  },

  // Portal Administrador
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

  // Portal Conductor móvil
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

      // Detalle del lote
      {
        path: 'lote/:id',
        component: Entregas,
      },

      // Detalle de un paquete dentro del lote
      {
        path: 'lote/:id/paquete/:numero',
        component: DetallePaqueteConductor,
      },
    ],
  },

  // Ruta para páginas inexistentes
  {
    path: '**',
    redirectTo: '',
  },
];
