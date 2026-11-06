import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TrackingResponse } from '../models/tracking.models';

@Injectable({
  providedIn: 'root',
})
export class TrackingService {
  private http = inject(HttpClient);

  getTracking(trackingId: string): Observable<TrackingResponse> {
    const codigo = trackingId.trim().toUpperCase();

    return this.http.get<TrackingResponse>(
      `${environment.apiUrl}/tracking/${encodeURIComponent(codigo)}`
    );
  }
}