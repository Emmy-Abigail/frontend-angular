import { UserRole } from './auth.models';

export interface CreateUserRequest {
  nombres: string;
  dni: string;
  correo: string;
  telefono?: string | null;
  rol: 'OPERADOR' | 'CONDUCTOR';
  id_sede?: number | null;
  id_tipo_vehiculo?: number | null;
}

export interface CreateUserResponse {
  id: number;
  nombres: string;
  dni: string;
  correo: string;
  rol: UserRole;
  id_sede?: number | null;
  id_tipo_vehiculo?: number | null;
  password_temporal: string;
}

export interface UserListItem {
  id: number;
  nombres: string;
  correo: string;
  dni?: string;
  telefono: string | null;
  rol: UserRole;
  sede_nombre?: string;
  tipo_vehiculo?: string;
  activo: boolean;
}
