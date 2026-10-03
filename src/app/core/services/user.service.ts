import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateUserRequest,
  CreateUserResponse,
  UserListItem,
} from '../models/user.models';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);

  getUsers(rol?: string, sede?: number): Observable<UserListItem[]> {
    let params = new HttpParams();
    if (rol) {
      params = params.set('rol', rol);
    }
    if (sede !== undefined && sede !== null) {
      params = params.set('sede', sede.toString());
    }

    return this.http
      .get<{ data: UserListItem[] }>(`${environment.apiUrl}/users`, { params })
      .pipe(map((res) => res.data));
  }

  createUser(data: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(
      `${environment.apiUrl}/users`,
      data
    );
  }

  changeUserStatus(id: number, activo: boolean): Observable<{ id: number; activo: boolean }> {
    return this.http.patch<{ id: number; activo: boolean }>(
      `${environment.apiUrl}/users/${id}/status`,
      { activo }
    );
  }
}
