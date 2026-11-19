
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicQuoteRequest {
  id_sede: number;
  ubigeo_destino: string;
  peso_kg: number;
  largo_cm: number;
  ancho_cm: number;
  alto_cm: number;
}

export interface PublicQuoteResponse {
  peso_volumetrico_kg: string | number;
  peso_facturable_kg: string | number;
  zona_origen: string;
  zona_destino: string;
  factor: string | number;
  tarifa_base_kg: string | number;
  monto: string | number;
  sede_origen: {
    id: number;
    nombre: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class PublicQuoteService {
  private http = inject(HttpClient);

  cotizar(payload: PublicQuoteRequest): Observable<PublicQuoteResponse> {
    return this.http.post<PublicQuoteResponse>(
      `${environment.apiUrl}/public/quotes`,
      payload,
    );
  }
}
