import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardMetricsResponse,
  FailedDeliveriesResponse,
} from '../models/dashboard.models';

export interface DashboardMetricsFilter {
  desde: string;
  hasta: string;
  id_sede?: number | null;
}

export interface FailedDeliveriesFilter {
  desde: string;
  hasta: string;
  id_sede?: number | null;
  page?: number;
  per_page?: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getMetrics(filter: DashboardMetricsFilter): Observable<DashboardMetricsResponse> {
    let params = new HttpParams()
      .set('desde', filter.desde)
      .set('hasta', filter.hasta);

    if (filter.id_sede !== undefined && filter.id_sede !== null) {
      params = params.set('id_sede', String(filter.id_sede));
    }

    return this.http.get<DashboardMetricsResponse>(`${this.baseUrl}/dashboard/metrics`, {
      params,
    });
  }

  getFailedDeliveries(filter: FailedDeliveriesFilter): Observable<FailedDeliveriesResponse> {
    let params = new HttpParams()
      .set('desde', filter.desde)
      .set('hasta', filter.hasta);

    if (filter.id_sede !== undefined && filter.id_sede !== null) {
      params = params.set('id_sede', String(filter.id_sede));
    }
    if (filter.page) {
      params = params.set('page', String(filter.page));
    }
    if (filter.per_page) {
      params = params.set('per_page', String(filter.per_page));
    }

    return this.http.get<FailedDeliveriesResponse>(`${this.baseUrl}/dashboard/failed-deliveries`, {
      params,
    });
  }
}
