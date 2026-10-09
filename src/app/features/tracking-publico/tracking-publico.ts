import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-tracking-publico',
  styleUrl: './tracking-publico.css',
  templateUrl: './tracking-publico.html',
})
export class TrackingPublico {

  codigo = '';

  mostrarResultado = false;
  error = '';

  consultarEnvio(): void {

    this.error = '';
    this.mostrarResultado = false;

    if (!this.codigo.trim()) {
      this.error = 'Ingresa un código de seguimiento.';
      return;
    }

    if (this.codigo.trim().toUpperCase() === 'ENV-2026-00125') {
      this.mostrarResultado = true;
      return;
    }

    this.error = 'No se encontró un envío con ese código de seguimiento.';
  }
}