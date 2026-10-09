import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Paquete {
  tracking: string;
  cliente: string;
  origen: string;
  destino: string;
  estado: string;
  fecha: string;
}

@Component({
  imports: [FormsModule],
  selector: 'app-paquetes',
  styleUrl: './paquetes.css',
  templateUrl: './paquetes.html',
})
export class Paquetes {

  paquetes: Paquete[] = [
    {
      tracking: 'ENV-2026-00125',
      cliente: 'Juan Pérez',
      origen: 'Lima',
      destino: 'Miraflores',
      estado: 'En Ruta',
      fecha: '16/09/2026'
    },
    {
      tracking: 'ENV-2026-00124',
      cliente: 'María López',
      origen: 'San Miguel',
      destino: 'Surco',
      estado: 'Entregado',
      fecha: '16/09/2026'
    },
    {
      tracking: 'ENV-2026-00123',
      cliente: 'Carlos Torres',
      origen: 'Callao',
      destino: 'San Isidro',
      estado: 'Asignado',
      fecha: '15/09/2026'
    }
  ];

  filtroTracking = '';
  filtroEstado = '';

  mostrarFormulario = false;

  errorFormulario = '';

  nuevoPaquete: Paquete = {
    tracking: '',
    cliente: '',
    origen: '',
    destino: '',
    estado: 'En Almacén',
    fecha: ''
  };

  get paquetesFiltrados(): Paquete[] {
    return this.paquetes.filter((paquete) => {

      const coincideTracking =
        paquete.tracking
          .toLowerCase()
          .includes(this.filtroTracking.toLowerCase());

      const coincideEstado =
        !this.filtroEstado ||
        paquete.estado === this.filtroEstado;

      return coincideTracking && coincideEstado;
    });
  }

  limpiarFiltros(): void {
    this.filtroTracking = '';
    this.filtroEstado = '';
  }

  abrirFormulario(): void {
    this.errorFormulario = '';
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.errorFormulario = '';

    this.nuevoPaquete = {
      tracking: '',
      cliente: '',
      origen: '',
      destino: '',
      estado: 'En Almacén',
      fecha: ''
    };
  }

  agregarPaquete(): void {

    this.errorFormulario = '';

    if (
      !this.nuevoPaquete.tracking ||
      !this.nuevoPaquete.cliente ||
      !this.nuevoPaquete.origen ||
      !this.nuevoPaquete.destino ||
      !this.nuevoPaquete.fecha
    ) {
      this.errorFormulario = 'Completa todos los campos del formulario.';
      return;
    }

    const tracking = this.nuevoPaquete.tracking
      .trim()
      .toLowerCase();

    const trackingExiste = this.paquetes.some(
      (paquete) =>
        paquete.tracking.toLowerCase() === tracking
    );

    if (trackingExiste) {
      this.errorFormulario =
        'El código de seguimiento ya está registrado.';
      return;
    }

    const partesFecha = this.nuevoPaquete.fecha.split('-');

    const fechaFormateada =
      `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;

    this.paquetes.push({
      ...this.nuevoPaquete,
      tracking: this.nuevoPaquete.tracking.trim(),
      fecha: fechaFormateada
    });

    this.cerrarFormulario();
  }
}