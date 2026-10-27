import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CotizacionRequest {
  ubigeo_destino: string;
  peso_kg: number;
  largo_cm: number;
  ancho_cm: number;
  alto_cm: number;
}

export interface CotizacionResponse {
  peso_volumetrico_kg: string;
  peso_facturable_kg: string;
  zona_origen: string;
  zona_destino: string;
  factor: string;
  tarifa_base_kg: string;
  monto: string;
  sede_origen: {
    id: number;
    nombre: string;
  };
}

export interface RegistroPaqueteRequest {
  remitente: {
    tipo_documento: 'DNI' | 'RUC';
    numero_documento: string;
    nombres: string;
    celular: string;
    correo: string;
  };
  destinatario: {
    nombres: string;
    dni: string;
    celular: string;
    correo: string;
  };
  direccion: {
    ubigeo_distrito: string;
    tipo_via: string;
    nombre_via: string;
    numero?: string | null;
    manzana?: string | null;
    lote?: string | null;
    referencia?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
  peso_kg: number;
  largo_cm: number;
  ancho_cm: number;
  alto_cm: number;
}

export interface RegistroPaqueteResponse {
  id: number;
  tracking_id: string;
  estado: string;
  fecha_ingreso: string;
  cotizacion: {
    id_tarifa: number;
    monto: number;
  };
  lote: {
    id: number;
    codigo: string;
    vehiculo: string;
    zona: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class OperadorService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  cotizar(payload: CotizacionRequest): Observable<CotizacionResponse> {
    return this.http.post<CotizacionResponse>(`${this.baseUrl}/quotes`, payload);
  }

  registrarPaquete(payload: RegistroPaqueteRequest): Observable<RegistroPaqueteResponse> {
    return this.http.post<RegistroPaqueteResponse>(`${this.baseUrl}/packages`, payload);
  }

  listarPaquetes(filtro?: {
    q?: string;
    estado?: string;
    desde?: string;
    hasta?: string;
    page?: number;
    per_page?: number;
  }): Observable<any> {
    let params = new HttpParams();
    if (filtro?.q) params = params.set('q', filtro.q);
    if (filtro?.estado && filtro.estado !== 'TODOS') params = params.set('estado', filtro.estado);
    if (filtro?.desde) params = params.set('desde', filtro.desde);
    if (filtro?.hasta) params = params.set('hasta', filtro.hasta);
    if (filtro?.page) params = params.set('page', String(filtro.page));
    if (filtro?.per_page) params = params.set('per_page', String(filtro.per_page));

    return this.http.get<any>(`${this.baseUrl}/packages`, { params });
  }

  obtenerPaquete(idOrTracking: number | string): Observable<any> {
    const str = String(idOrTracking).trim();
    if (/^[0-9]+$/.test(str)) {
      return this.http.get<any>(`${this.baseUrl}/packages/${str}`);
    }

    return this.listarPaquetes({ q: str }).pipe(
      switchMap((res) => {
        const item = res?.data?.find(
          (p: any) => p.tracking_id === str || p.tracking === str
        ) ?? res?.data?.[0];

        if (item && item.id) {
          return this.http.get<any>(`${this.baseUrl}/packages/${item.id}`);
        }
        return throwError(() => new Error('Paquete no encontrado'));
      })
    );
  }

  obtenerEvidencia(id: number | string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/packages/${id}/evidence`, { responseType: 'blob' });
  }

  listarLotes(estado?: string, page = 1, size = 20): Observable<any> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    if (estado) params = params.set('estado', estado);

    return this.http.get<any>(`${this.baseUrl}/batches`, { params });
  }

  obtenerLote(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/batches/${id}`);
  }

  despacharLote(id: number | string, idConductor: number, version: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/batches/${id}/dispatch`, {
      id_conductor: idConductor,
      version,
    });
  }
}
