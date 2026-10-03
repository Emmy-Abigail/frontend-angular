import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Department, FailureReason, Sede, VehicleType } from '../models/catalog.models';

@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  private http = inject(HttpClient);

  getSedes(): Observable<Sede[]> {
    return this.http
      .get<{ data: Sede[] }>(`${environment.apiUrl}/sedes`)
      .pipe(map((res) => res.data));
  }

  getVehicleTypes(): Observable<VehicleType[]> {
    return this.http
      .get<{ data: VehicleType[] }>(`${environment.apiUrl}/vehicle-types`)
      .pipe(map((res) => res.data));
  }

  getGeography(): Observable<Department[]> {
    return this.http
      .get<{ data: Department[] }>(`${environment.apiUrl}/geography`)
      .pipe(map((res) => res.data));
  }

  getFailureReasons(): Observable<FailureReason[]> {
    return this.http
      .get<{ data: FailureReason[] }>(`${environment.apiUrl}/failure-reasons`)
      .pipe(map((res) => res.data));
  }
}
