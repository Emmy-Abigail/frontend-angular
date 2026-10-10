export type UserRole = 'ADMINISTRADOR' | 'OPERADOR' | 'CONDUCTOR';

export interface UserSede {
  id: number;
  nombre: string;
}

export interface UserVehiculo {
  id: number;
  nombre: string;
  peso_max_total_kg: number;
  lado_max_cm: number;
}

export interface UserProfile {
  id: number;
  nombres: string;
  correo: string;
  rol: UserRole;
  sede?: UserSede | null;
  vehiculo?: UserVehiculo | null;
  placa?: string | null;
  debe_cambiar_password?: boolean;
}

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  expires_at: string;
  user: UserProfile;
}
