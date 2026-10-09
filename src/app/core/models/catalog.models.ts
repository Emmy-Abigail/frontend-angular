export interface Zona {
  id: number;
  codigo: string;
  nombre: string;
}

export interface Sede {
  id: number;
  nombre: string;
  id_zona: number;
  zona: Zona;
  ubigeo_distrito: string;
  distrito: string;
  direccion: string;
  lat: number;
  lng: number;
  activa: boolean;
}

export interface VehicleType {
  id: number;
  codigo: string;
  nombre: string;
  nivel: number;
  peso_max_total_kg: number;
  lado_max_cm: number;
  max_paquetes: number;
}

export interface FailureReason {
  id: number;
  codigo: string;
  nombre: string;
}

export interface District {
  ubigeo: string;
  nombre_mostrado: string;
  nombre_oficial: string;
  id_zona: number;
  lat: number;
  lng: number;
}

export interface Province {
  ubigeo: string;
  nombre: string;
  distritos: District[];
}

export interface Department {
  ubigeo: string;
  nombre: string;
  provincias: Province[];
}
