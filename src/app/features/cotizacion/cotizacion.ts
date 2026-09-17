import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-cotizacion',
  styleUrl: './cotizacion.css',
  templateUrl: './cotizacion.html',
})
export class Cotizacion {

  origen = '';
  destino = '';
  peso: number | null = null;
  tipo = '';

  cotizacion = 0;
  mostrarResultado = false;
  error = '';

  calcularCotizacion(): void {

    this.error = '';
    this.mostrarResultado = false;

    if (
      !this.origen ||
      !this.destino ||
      !this.peso ||
      !this.tipo
    ) {
      this.error = 'Completa todos los campos para calcular la cotización.';
      return;
    }

    let precioBase = 10;

    if (this.tipo === 'documento') {
      precioBase = 8;
    }

    if (this.tipo === 'paquete') {
      precioBase = 10;
    }

    if (this.tipo === 'fragil') {
      precioBase = 15;
    }

    const costoPeso = this.peso * 2;

    this.cotizacion = precioBase + costoPeso;

    this.mostrarResultado = true;
  }
}