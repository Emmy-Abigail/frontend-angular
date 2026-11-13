export type PeriodoFiltro = 'HOY' | '7_DIAS' | 'ESTE_MES' | 'PERSONALIZADO';

export type TipoVehiculoTab = 'TODOS' | 'MOTORIZADO' | 'AUTO' | 'CAMION';

export interface DashboardKpis {
  paquetes_registrados: number;
  entregas_exitosas_pct: number | null;
  entregas_exitosas_qty: number;
  finalizados_qty: number;
  tiempo_promedio_horas: number | null;
}

export interface DashboardFlujoItem {
  cantidad: number;
  porcentaje: number;
}

export interface DashboardFlujoPaquetes {
  total: number;
  en_almacen: DashboardFlujoItem;
  asignado: DashboardFlujoItem;
  en_ruta: DashboardFlujoItem;
  entregado: DashboardFlujoItem;
  fallido: DashboardFlujoItem;
}

export interface DashboardSedeRanking {
  id_sede: number;
  nombre_sede: string;
  paquetes_registrados: number;
  entregas_exitosas_pct: number | null;
  fallidos_qty: number;
  tiempo_promedio_horas: number | null;
  es_mas_baja?: boolean;
  datos_insuficientes?: boolean;
}

export interface DashboardMotivoItem {
  motivo: string;
  cantidad: number;
  porcentaje: number;
}

export interface DashboardDireccionesCorregidas {
  total_fallidos_direccion: number;
  reintentados: number;
  entregados: number;
}

export interface DashboardUltimoFallido {
  id_paquete: number;
  tracking_id: string;
  destino: string;
  motivo: string;
  fecha: string;
}

export interface DashboardFallidosMotivo {
  total_fallidos: number;
  motivos: DashboardMotivoItem[];
  direcciones_corregidas: DashboardDireccionesCorregidas;
  ultimos_fallidos?: DashboardUltimoFallido[];
}

export interface ConductorRankingItem {
  id_conductor: number;
  nombre: string;
  tipo_vehiculo: string;
  tipo_vehiculo_label: string;
  placa: string;
  entregas_qty: number;
}

export interface DashboardTopConductores {
  todos: ConductorRankingItem[];
  motorizado: ConductorRankingItem[];
  auto: ConductorRankingItem[];
  camion: ConductorRankingItem[];
}

export interface VehiculoEntregasItem {
  cantidad: number;
  porcentaje: number;
}

export interface DashboardEntregasVehiculo {
  total: number;
  motorizado: VehiculoEntregasItem;
  auto: VehiculoEntregasItem;
  camion: VehiculoEntregasItem;
}

export interface DashboardOperadorDesempenoItem {
  id_usuario: number;
  nombre: string;
  sede: string;
  registrados: number;
  bien_registrados_pct: number | null;
  errores_direccion_qty: number;
  entregas_exitosas_pct: number | null;
  tiempo_asignacion_horas: number | null;
}

export interface DashboardDesempenoOperador {
  registrados: number;
  bien_registrados_pct: number | null;
  errores_direccion_qty: number;
  entregas_exitosas_pct: number | null;
  tiempo_asignacion_horas: number | null;
}

export interface DashboardMetrics {
  kpis: DashboardKpis;
  flujo_paquetes: DashboardFlujoPaquetes;
  ranking_sedes?: DashboardSedeRanking[];
  fallidos_motivo: DashboardFallidosMotivo;
  top_conductores: DashboardTopConductores;
  entregas_vehiculo: DashboardEntregasVehiculo;
  operadores?: DashboardOperadorDesempenoItem[];
  desempeno_operador?: DashboardDesempenoOperador;
  sede?: {
    id: number;
    nombre: string;
  } | null;
}

export interface DashboardMetricsResponse {
  data: DashboardMetrics;
}

export interface FailedDeliveryItem {
  id: number;
  tracking_id: string;
  destino: string;
  motivo: string;
  fecha_fallo: string;
}

export interface FailedDeliveriesMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  sede_nombre?: string;
  desde?: string;
  hasta?: string;
}

export interface FailedDeliveriesResponse {
  data: FailedDeliveryItem[];
  meta: FailedDeliveriesMeta;
}
