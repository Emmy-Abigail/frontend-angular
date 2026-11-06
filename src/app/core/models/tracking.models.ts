export interface TrackingEstado {
  codigo: string;
  nombre: string;
}

export interface TrackingDestino {
  distrito: string;
}

export interface TrackingEvento {
  estado: string;
  nombre: string;
  fecha: string;
  motivo: string | null;
}

export interface TrackingResponse {
  tracking_id: string;
  estado: TrackingEstado;
  destino: TrackingDestino;
  fecha_ingreso: string;
  linea_de_tiempo: TrackingEvento[];
}