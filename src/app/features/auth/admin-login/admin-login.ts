import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-admin-login',
  styleUrl: './admin-login.css',
  templateUrl: './admin-login.html',
})
export class AdminLogin {

  correo = '';
  contrasena = '';
  error = '';

  constructor(private router: Router) {}

  iniciarSesion() {
    if (
      this.correo === 'admin@demo.com' &&
      this.contrasena === 'Admin123'
    ) {
      localStorage.setItem(
        'sesion',
        JSON.stringify({
          rol: 'admin',
          correo: this.correo
        })
      );

      this.error = '';
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    this.error = 'Correo o contraseña incorrectos.';
  }
}