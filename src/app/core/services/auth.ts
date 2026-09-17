import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  cerrarSesion(): void {
    localStorage.removeItem('sesion');
  }
}