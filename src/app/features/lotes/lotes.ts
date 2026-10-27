import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { OperadorService } from '../../core/services/operador.service';

type EstadoLotes = 'PREPARACION' | 'DESPACHADOS';
type EstadoDespacho = 'EN RUTA' | 'ASIGNADO' | 'CERRADO';
type EstadoPaquete = 'EN RUTA' | 'ENTREGADO' | 'FALLIDO';

interface Lote {
  id?: number | string;
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
  version?: number;
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
export class Lotes implements OnInit {
  private operadorService = inject(OperadorService);
  private cdr = inject(ChangeDetectorRef);
  readonly Math = Math;

  estadoSeleccionado: EstadoLotes = 'PREPARACION';
  ultimaActualizacion = new Date();
  cargandoLotes = false;
  mensajeErrorLotes = '';

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

  conductores: Conductor[] = [];
  lotesPreparacion: Lote[] = [];
  lotesDespachados: Lote[] = [];

  ngOnInit(): void {
    this.cargarLotes();
  }

  cargarLotes(): void {
    this.cargandoLotes = true;
    this.mensajeErrorLotes = '';

    // Lotes en preparación
    this.operadorService.listarLotes('EN_PREPARACION').subscribe({
      next: (res) => {
        this.cargandoLotes = false;
        const items = res?.data ?? (Array.isArray(res) ? res : []);
        this.lotesPreparacion = items.map((l: any) => {
          let horaInicio = '08:00';
          if (l.created_at) {
            const d = new Date(l.created_at);
            horaInicio = !isNaN(d.getTime()) ? d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : horaInicio;
          }
          const cant = l.cantidad_paquetes ?? l.total_paquetes ?? 0;
          const maxP = l.capacidad_paquetes || 20;

          return {
            id: l.id,
            codigo: l.codigo || `L-${l.id}`,
            zona: l.zona_destino?.nombre || l.zona || 'Zona Sur',
            vehiculo: l.vehiculo?.nombre || l.vehiculo || 'Motorizado',
            paquetes: cant,
            capacidadPaquetes: maxP,
            peso: Number(l.peso_total_kg || 0),
            capacidadPeso: Number(l.capacidad_peso_kg || 20),
            horaInicio,
            completo: cant >= maxP,
            version: l.version ?? 0,
          };
        });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargandoLotes = false;
        this.mensajeErrorLotes = err.error?.message || 'Error al listar lotes en preparación.';
        this.cdr.markForCheck();
      },
    });

    // Lotes despachados
    this.operadorService.listarLotes('DESPACHADOS').subscribe({
      next: (res) => {
        const items = res?.data ?? (Array.isArray(res) ? res : []);
        this.lotesDespachados = items.map((l: any) => {
          let horaDesp = '09:00';
          if (l.despachado_at || l.created_at) {
            const d = new Date(l.despachado_at || l.created_at);
            horaDesp = !isNaN(d.getTime()) ? d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : horaDesp;
          }

          return {
            id: l.id,
            codigo: l.codigo || `L-${l.id}`,
            zona: l.zona_destino?.nombre || l.zona || 'Zona Sur',
            vehiculo: l.vehiculo?.nombre || l.vehiculo || 'Motorizado',
            paquetes: l.cantidad_paquetes ?? l.total_paquetes ?? 0,
            capacidadPaquetes: l.capacidad_paquetes || 20,
            peso: Number(l.peso_total_kg || 0),
            capacidadPeso: Number(l.capacidad_peso_kg || 20),
            horaInicio: '07:30',
            responsable: l.conductor?.nombres || l.responsable,
            placa: l.conductor?.placa || l.placa,
            estadoDespacho: (l.estado === 'EN_RUTA' ? 'EN RUTA' : (l.estado === 'CERRADO' ? 'CERRADO' : 'ASIGNADO')) as EstadoDespacho,
            horaDespacho: horaDesp,
            version: l.version ?? 0,
          };
        });
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      },
    });
  }

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
    this.cargarLotes();
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

    if (lote.id) {
      this.operadorService.obtenerLote(lote.id).subscribe({
        next: (detalle) => {
          if (detalle) {
            if (detalle.version !== undefined && this.loteSeleccionado) {
              this.loteSeleccionado.version = detalle.version;
            }
            if (detalle.conductores_disponibles) {
              this.conductores = detalle.conductores_disponibles.map((c: any) => ({
                id: c.id,
                nombre: c.nombres || c.nombre,
                placa: c.placa || '',
                estado: c.estado || 'LIBRE',
                lotesPendientes: c.lotes_pendientes ?? c.lotesPendientes ?? 0,
              }));
            }
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.cdr.markForCheck();
        },
      });
    }
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

    const version = lote.version ?? 0;
    const loteId = lote.id || lote.codigo.replace(/\D/g, '');

    this.operadorService.despacharLote(loteId, conductor.id, version).subscribe({
      next: () => {
        this.cerrarModalDespacho();
        this.cargarLotes();
        this.estadoSeleccionado = 'DESPACHADOS';
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 409) {
          this.mensajeValidacion = err.error?.message || 'Este lote ya fue despachado por otro operador.';
          this.mostrarConflictoDespacho();
          if (lote.id) {
            this.operadorService.obtenerLote(lote.id).subscribe({
              next: (d) => {
                if (d && d.version !== undefined && this.loteSeleccionado) {
                  this.loteSeleccionado.version = d.version;
                }
                this.cdr.markForCheck();
              },
            });
          }
        } else {
          this.mensajeValidacion = err.error?.message || 'Error al despachar el lote.';
        }
        this.cdr.markForCheck();
      },
    });
  }

  mostrarConflictoDespacho(): void {
    this.modalConfirmacionAbierta = false;
    this.modalDespachoAbierto = true;
    this.conflictoDespacho = true;
    this.mensajeValidacion = '';
  }

  volverListaTrasConflicto(): void {
    this.cerrarModalDespacho();
    this.cargarLotes();
  }

  // -----------------------------
  // Detalle de lote y sus paquetes
  // -----------------------------

  verLote(lote: Lote): void {
    this.loteSeleccionado = lote;
    this.paqueteSeleccionadoId = null;
    this.detalleLoteAbierto = true;
    this.paquetesLote = [];

    const loteId = lote.id || lote.codigo.replace(/\D/g, '');
    this.operadorService.obtenerLote(loteId).subscribe({
      next: (res) => {
        const pkgs = res?.paquetes ?? res?.paradas ?? [];
        this.paquetesLote = pkgs.map((p: any, idx: number) => {
          let dirTexto = '';
          const dir = p.direccion;
          if (typeof dir === 'string') {
            dirTexto = dir;
          } else if (dir) {
            const via = [dir.tipo_via, dir.nombre_via].filter(Boolean).join(' ');
            const num = dir.numero ? `N° ${dir.numero}` : '';
            dirTexto = [via, num, dir.distrito].filter(Boolean).join(', ');
          }

          const estadoPkg = (p.estado === 'ENTREGADO' ? 'ENTREGADO' : (p.estado === 'FALLIDO' ? 'FALLIDO' : 'EN RUTA')) as EstadoPaquete;

          return {
            id: p.id ?? p.id_paquete ?? (idx + 1),
            tracking: p.tracking_id || p.tracking || '',
            destinatario: p.destinatario?.nombres || p.destinatario || '-',
            receptor: p.receptor || p.destinatario?.nombres || '-',
            direccion: dirTexto || '-',
            estado: estadoPkg,
          };
        });
        this.cdr.markForCheck();
      },
      error: () => {
        this.paquetesLote = [];
        this.cdr.markForCheck();
      },
    });
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
  }

  verPaquetes(lote: Lote): void {
    this.verLote(lote);
  }
}
