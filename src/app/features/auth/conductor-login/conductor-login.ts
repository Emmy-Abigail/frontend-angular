import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-conductor-login',
  styleUrl: './conductor-login.css',
  templateUrl: './conductor-login.html',
})
export class ConductorLogin {

  correo = '';
  contrasena = '';
  error = '';

  constructor(private router: Router) {}

  iniciarSesion() {
    if (
      this.correo === 'conductor@demo.com' &&
      this.contrasena === 'Conductor123'
    ) {
      localStorage.setItem(
        'sesion',
        JSON.stringify({
          rol: 'conductor',
          correo: this.correo
        })
      );

      this.error = '';
      this.router.navigate(['/conductor/asignaciones']);
      return;
    }

    this.error = 'Correo o contraseña incorrectos.';
  }
}