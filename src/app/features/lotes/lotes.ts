
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type EstadoLotes = 'PREPARACION' | 'DESPACHADOS';
type EstadoDespacho = 'EN RUTA' | 'ASIGNADO' | 'CERRADO';
type EstadoPaquete = 'EN RUTA' | 'ENTREGADO' | 'FALLIDO';

interface Lote {
  codigo: string;
  zona: string;
  vehiculo: string;
  paquetes: number;
  capacidadPaquetes: number;
  peso: number;
  capacidadPeso: number;
  horaInicio: string;
  completo?: boolean;
  responsable?: string;
  placa?: string;
  estadoDespacho?: EstadoDespacho;
  horaDespacho?: string;
}

interface Conductor {
  id: number;
  nombre: string;
  placa: string;
  estado: 'LIBRE' | 'EN RUTA';
  lotesPendientes: number;
}

interface Paquete {
  id: number;
  tracking: string;
  destinatario: string;
  receptor: string;
  direccion: string;
  estado: EstadoPaquete;
}

@Component({
  selector: 'app-lotes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lotes.html',
  styleUrl: './lotes.css',
})
export class Lotes {
  readonly Math = Math;

  estadoSeleccionado: EstadoLotes = 'PREPARACION';
  ultimaActualizacion = new Date();

  // Modales del despacho
  modalDespachoAbierto = false;
  modalConfirmacionAbierta = false;
  conflictoDespacho = false;

  loteSeleccionado: Lote | null = null;
  conductorSeleccionadoId: number | null = null;
  mensajeValidacion = '';

  // Vista de detalle del lote
  detalleLoteAbierto = false;
  paqueteSeleccionadoId: number | null = null;
  paquetesLote: Paquete[] = [];

  conductores: Conductor[] = [
    {
      id: 1,
      nombre: 'Luis Ramos',
      placa: 'DEF-789',
      estado: 'LIBRE',
      lotesPendientes: 0,
    },
    {
      id: 2,
      nombre: 'Pedro Quispe',
      placa: 'XYZ-456',
      estado: 'LIBRE',
      lotesPendientes: 1,
    },
    {
      id: 3,
      nombre: 'Pedro Quispe',
      placa: 'KLM-321',
      estado: 'EN RUTA',
      lotesPendientes: 2,
    },
  ];

  lotesPreparacion: Lote[] = [
    {
      codigo: 'L-101',
      zona: 'Zona Sur',
      vehiculo: 'Motorizado',
      paquetes: 20,
      capacidadPaquetes: 20,
      peso: 18,
      capacidadPeso: 20,
      horaInicio: '08:00',
      completo: true,
    },
    {
      codigo: 'L-102',
      zona: 'Zona Sur',
      vehiculo: 'Auto',
      paquetes: 2,
      capacidadPaquetes: 20,
      peso: 45,
      capacidadPeso: 200,
      horaInicio: '08:20',
    },
    {
      codigo: 'L-103',
      zona: 'Zona Norte',
      vehiculo: 'Motorizado',
      paquetes: 1,
      capacidadPaquetes: 20,
      peso: 2,
      capacidadPeso: 30,
      horaInicio: '08:30',
    },
    {
      codigo: 'L-104',
      zona: 'Zona Centro',
      vehiculo: 'Camión',
      paquetes: 6,
      capacidadPaquetes: 20,
      peso: 210,
      capacidadPeso: 1000,
      horaInicio: '09:10',
    },
  ];

  lotesDespachados: Lote[] = [
    {
      codigo: 'L-098',
      zona: 'Zona Sur',
      vehiculo: 'Motorizado',
      paquetes: 4,
      capacidadPaquetes: 20,
      peso: 18,
      capacidadPeso: 20,
      horaInicio: '07:30',
      responsable: 'Carlos Huamán',
      placa: 'KLM-321',
      estadoDespacho: 'EN RUTA',
      horaDespacho: '09:05',
    },
    {
      codigo: 'L-095',
      zona: 'Zona Oeste',
      vehiculo: 'Motorizado',
      paquetes: 4,
      capacidadPaquetes: 20,
      peso: 12,
      capacidadPeso: 20,
      horaInicio: '07:20',
      responsable: 'Pedro Quispe',
      placa: 'XYZ-456',
      estadoDespacho: 'ASIGNADO',
      horaDespacho: '08:40',
    },
    {
      codigo: 'L-097',
      zona: 'Zona Este',
      vehiculo: 'Motorizado',
      paquetes: 6,
      capacidadPaquetes: 20,
      peso: 16,
      capacidadPeso: 20,
      horaInicio: '07:00',
      responsable: 'Juan Soto',
      placa: 'DEF-789',
      estadoDespacho: 'CERRADO',
      horaDespacho: '08:10',
    },
  ];

  get lotesVisibles(): Lote[] {
    return this.estadoSeleccionado === 'PREPARACION'
      ? this.lotesPreparacion
      : this.lotesDespachados;
  }

  get conductoresDisponibles(): Conductor[] {
    return this.conductores.filter(
      (conductor) => conductor.lotesPendientes < 3,
    );
  }

  get conductorSeleccionado(): Conductor | null {
    return (
      this.conductores.find(
        (conductor) => conductor.id === this.conductorSeleccionadoId,
      ) ?? null
    );
  }

  get paqueteSeleccionado(): Paquete | null {
    return (
      this.paquetesLote.find(
        (paquete) => paquete.id === this.paqueteSeleccionadoId,
      ) ?? null
    );
  }

  seleccionarEstado(estado: EstadoLotes): void {
    this.estadoSeleccionado = estado;
  }

  actualizar(): void {
    this.ultimaActualizacion = new Date();
  }

  // -----------------------------
  // Despacho y selección conductor
  // -----------------------------

  abrirModalDespacho(lote: Lote): void {
    this.loteSeleccionado = lote;
    this.conductorSeleccionadoId = null;
    this.mensajeValidacion = '';
    this.conflictoDespacho = false;
    this.modalConfirmacionAbierta = false;
    this.modalDespachoAbierto = true;
  }

  cerrarModalDespacho(): void {
    this.modalDespachoAbierto = false;
    this.modalConfirmacionAbierta = false;
    this.conflictoDespacho = false;
    this.loteSeleccionado = null;
    this.conductorSeleccionadoId = null;
    this.mensajeValidacion = '';
  }

  seleccionarConductor(id: number): void {
    this.conductorSeleccionadoId = id;
    this.mensajeValidacion = '';
  }

  abrirConfirmacionDespacho(): void {
    if (!this.loteSeleccionado) {
      return;
    }

    if (!this.conductorSeleccionado) {
      this.mensajeValidacion =
        'Selecciona un conductor antes de continuar.';
      return;
    }

    if (this.conductorSeleccionado.lotesPendientes >= 3) {
      this.mensajeValidacion =
        'El conductor seleccionado ya no está disponible.';
      return;
    }

    this.mensajeValidacion = '';
    this.modalDespachoAbierto = false;
    this.modalConfirmacionAbierta = true;
  }

  cancelarConfirmacionDespacho(): void {
    this.modalConfirmacionAbierta = false;
    this.modalDespachoAbierto = true;
  }

  confirmarDespacho(): void {
    const lote = this.loteSeleccionado;
    const conductor = this.conductorSeleccionado;

    if (!lote || !conductor) {
      this.mensajeValidacion =
        'No se pudo completar el despacho. Revisa la selección.';
      this.modalConfirmacionAbierta = false;
      this.modalDespachoAbierto = true;
      return;
    }

    if (conductor.lotesPendientes >= 3) {
      this.mensajeValidacion =
        'El conductor seleccionado ya no está disponible.';
      this.modalConfirmacionAbierta = false;
      this.modalDespachoAbierto = true;
      return;
    }

    const loteSigueEnPreparacion = this.lotesPreparacion.some(
      (item) => item.codigo === lote.codigo,
    );

    if (!loteSigueEnPreparacion) {
      this.mostrarConflictoDespacho();
      return;
    }

    const horaActual = new Date().toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    lote.responsable = conductor.nombre;
    lote.placa = conductor.placa;
    lote.estadoDespacho = 'ASIGNADO';
    lote.horaDespacho = horaActual;

    this.lotesPreparacion = this.lotesPreparacion.filter(
      (item) => item.codigo !== lote.codigo,
    );

    this.lotesDespachados = [lote, ...this.lotesDespachados];

    conductor.lotesPendientes += 1;

    if (conductor.lotesPendientes >= 3) {
      conductor.estado = 'EN RUTA';
    }

    this.ultimaActualizacion = new Date();

    this.cerrarModalDespacho();
    this.estadoSeleccionado = 'DESPACHADOS';
  }

  mostrarConflictoDespacho(): void {
    this.modalConfirmacionAbierta = false;
    this.modalDespachoAbierto = true;
    this.conflictoDespacho = true;
    this.mensajeValidacion = '';
  }

  volverListaTrasConflicto(): void {
    if (this.loteSeleccionado) {
      const codigoLote = this.loteSeleccionado.codigo;

      this.lotesPreparacion = this.lotesPreparacion.filter(
        (lote) => lote.codigo !== codigoLote,
      );
    }

    this.cerrarModalDespacho();
    this.ultimaActualizacion = new Date();
  }

  // -----------------------------
  // Detalle de lote y sus paquetes
  // -----------------------------

  verLote(lote: Lote): void {
    this.loteSeleccionado = lote;
    this.paqueteSeleccionadoId = null;
    this.detalleLoteAbierto = true;

    // Datos de demostración para desarrollar la interfaz.
    // Más adelante se reemplazarán por los paquetes reales del backend.
    this.paquetesLote = [
      {
        id: 1,
        tracking: 'Q4HN7TZ2KD',
        destinatario: 'Juan Pérez',
        receptor: 'María García',
        direccion: 'Jesús María',
        estado: 'EN RUTA',
      },
      {
        id: 2,
        tracking: 'RUV7KHBJKD',
        destinatario: 'Logística Sur',
        receptor: 'Tienda Centro',
        direccion: 'San Martín de Porres',
        estado: 'ENTREGADO',
      },
      {
        id: 3,
        tracking: 'K3P8WZ2MNA',
        destinatario: 'Electrónica S.A.',
        receptor: 'Roberto Gómez',
        direccion: 'Villa El Salvador',
        estado: 'ENTREGADO',
      },
      {
        id: 4,
        tracking: 'W8FJ3KN6RA',
        destinatario: 'Almacén Norte',
        receptor: 'Ana Belén',
        direccion: 'Los Ángeles',
        estado: 'FALLIDO',
      },
    ];
  }

  volverAListaLotes(): void {
    this.detalleLoteAbierto = false;
    this.paqueteSeleccionadoId = null;
    this.paquetesLote = [];
    this.loteSeleccionado = null;
    this.ultimaActualizacion = new Date();
  }

  seleccionarPaquete(id: number): void {
    this.paqueteSeleccionadoId = id;
  }

  actualizarEstadoPaquete(estado: EstadoPaquete): void {
    const paquete = this.paqueteSeleccionado;

    if (!paquete) {
      return;
    }

    paquete.estado = estado;

    const todosFinalizados = this.paquetesLote.every(
      (item) => item.estado === 'ENTREGADO' || item.estado === 'FALLIDO',
    );

    if (todosFinalizados && this.loteSeleccionado) {
      this.loteSeleccionado.estadoDespacho = 'CERRADO';
    } else if (this.loteSeleccionado) {
      this.loteSeleccionado.estadoDespacho = 'EN RUTA';
    }

    this.ultimaActualizacion = new Date();
  }

  verPaquetes(lote: Lote): void {
    this.verLote(lote);
  }
}
