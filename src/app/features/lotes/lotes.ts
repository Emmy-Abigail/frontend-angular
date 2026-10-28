import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OperadorService } from '../../core/services/operador.service';

type EstadoLotes = 'PREPARACION' | 'DESPACHADOS';
type EstadoDespacho = 'EN RUTA' | 'ASIGNADO' | 'CERRADO';
type EstadoPaquete = 'EN ALMACEN' | 'EN RUTA' | 'ENTREGADO' | 'FALLIDO' | 'ASIGNADO';

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
  sede?: string;
  fechaCreacion?: string;
  paqueteMasAntiguo?: string;
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
  parada?: number;
  tracking: string;
  destinatario: string;
  receptor?: string;
  distrito: string;
  direccion: string;
  peso: number;
  horaIngreso: string;
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
  private router = inject(Router);
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

  // Vista de detalle del lote (Visily)
  detalleLoteAbierto = false;
  tipoDetalle: 'PREPARACION' | 'DESPACHADO' = 'PREPARACION';
  cargandoDetalle = false;
  paquetesLote: Paquete[] = [];

  // Contadores para el card de Despacho (Visily Imagen 1)
  conteoEntregados = 0;
  conteoFallidos = 0;
  conteoEnRuta = 0;

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
          let fechaCreacionStr = '';
          if (l.created_at) {
            const d = new Date(l.created_at);
            if (!isNaN(d.getTime())) {
              horaInicio = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
              fechaCreacionStr = `${d.toLocaleDateString('es-PE')} ${horaInicio}`;
            }
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
            fechaCreacion: fechaCreacionStr,
            completo: cant >= maxP,
            version: l.version ?? 0,
            sede: l.sede?.nombre || 'Sede Sur',
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
            sede: l.sede?.nombre || 'Sede Sur',
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
    if (!this.detalleLoteAbierto) {
      this.loteSeleccionado = null;
    }
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
        this.detalleLoteAbierto = false;
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
  // Vistas de Detalle (Visily)
  // -----------------------------

  /**
   * Clic en "Ver paquetes" en Lotes en Preparación (Visily Imagen 2)
   */
  verPaquetes(lote: Lote): void {
    this.tipoDetalle = 'PREPARACION';
    this.loteSeleccionado = lote;
    this.detalleLoteAbierto = true;
    this.cargarDetalleLote(lote);
  }

  /**
   * Clic en "Ver Lote" en Lotes Despachados (Visily Imagen 1)
   */
  verLote(lote: Lote): void {
    this.tipoDetalle = 'DESPACHADO';
    this.loteSeleccionado = lote;
    this.detalleLoteAbierto = true;
    this.cargarDetalleLote(lote);
  }

  actualizarDetalle(): void {
    if (this.loteSeleccionado) {
      this.cargarDetalleLote(this.loteSeleccionado);
    }
  }

  volverAListaLotes(): void {
    this.detalleLoteAbierto = false;
    this.loteSeleccionado = null;
    this.paquetesLote = [];
    this.cargarLotes();
  }

  navegarADetallePaquete(tracking: string): void {
    if (!tracking) return;
    void this.router.navigate(['/operador/consulta-paquetes', tracking]);
  }

  private cargarDetalleLote(lote: Lote): void {
    this.cargandoDetalle = true;
    this.paquetesLote = [];
    const loteId = lote.id || lote.codigo.replace(/\D/g, '');

    forkJoin({
      batchRes: this.operadorService.obtenerLote(loteId).pipe(catchError(() => of(null))),
      packagesRes: this.operadorService.listarPaquetes({ per_page: 100 }).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ batchRes, packagesRes }) => {
        this.cargandoDetalle = false;

        const allPackages: any[] = packagesRes?.data ?? [];
        const packageMap = new Map<string, any>();
        for (const p of allPackages) {
          if (p.tracking_id) {
            packageMap.set(p.tracking_id, p);
          }
        }

        if (batchRes) {
          if (batchRes.version !== undefined && this.loteSeleccionado) {
            this.loteSeleccionado.version = batchRes.version;
          }
          if (batchRes.conductor && this.loteSeleccionado) {
            this.loteSeleccionado.responsable = batchRes.conductor.nombres || this.loteSeleccionado.responsable;
            this.loteSeleccionado.placa = batchRes.conductor.placa || this.loteSeleccionado.placa;
          }
          if (batchRes.sede?.nombre && this.loteSeleccionado) {
            this.loteSeleccionado.sede = batchRes.sede.nombre;
          }
          if (batchRes.created_at && this.loteSeleccionado) {
            const d = new Date(batchRes.created_at);
            this.loteSeleccionado.fechaCreacion = !isNaN(d.getTime())
              ? `${d.toLocaleDateString('es-PE')} ${d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
              : batchRes.created_at;
          }

          // Progreso por estado de backend
          const porEstado = batchRes.progreso?.por_estado;
          if (porEstado) {
            this.conteoEntregados = porEstado.ENTREGADO ?? 0;
            this.conteoFallidos = porEstado.FALLIDO ?? 0;
            this.conteoEnRuta = (porEstado.EN_RUTA ?? 0) + (porEstado.ASIGNADO ?? 0);
          }

          const rawPkgs: any[] = batchRes.paquetes ?? batchRes.paradas ?? [];
          let earliestDate: Date | null = null;

          this.paquetesLote = rawPkgs.map((p: any, idx: number) => {
            const matched = packageMap.get(p.tracking_id || p.tracking);

            let fechaStr = '-';
            const fIngreso = p.fecha_ingreso || matched?.fecha_ingreso;
            if (fIngreso) {
              const d = new Date(fIngreso);
              if (!isNaN(d.getTime())) {
                fechaStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
                if (!earliestDate || d < earliestDate) {
                  earliestDate = d;
                }
              } else {
                fechaStr = fIngreso;
              }
            }

            const estadoLimpio = (p.estado || matched?.estado?.codigo || 'EN_ALMACEN')
              .replace(/_/g, ' ')
              .toUpperCase() as EstadoPaquete;

            const destNombre = matched?.destinatario?.nombres || p.destinatario?.nombres || p.destinatario || 'Cliente';
            const receptorNombre = matched?.destinatario?.nombres || p.receptor || destNombre;
            const distritoNombre = p.distrito?.nombre || matched?.destino?.distrito || (typeof p.distrito === 'string' ? p.distrito : 'Lima');
            const dirTexto = matched?.direccion || p.direccion || distritoNombre;

            return {
              id: p.id ?? matched?.id ?? (idx + 1),
              parada: p.orden_parada ?? (idx + 1),
              tracking: p.tracking_id || p.tracking || '',
              destinatario: destNombre,
              receptor: receptorNombre,
              distrito: distritoNombre,
              direccion: dirTexto,
              peso: Number(p.peso_kg ?? matched?.peso_kg ?? 1),
              horaIngreso: fechaStr,
              estado: estadoLimpio,
            };
          });

          if (earliestDate && this.loteSeleccionado) {
            const d: Date = earliestDate;
            this.loteSeleccionado.paqueteMasAntiguo = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
          }

          if (!porEstado) {
            this.conteoEntregados = this.paquetesLote.filter((pkg) => pkg.estado === 'ENTREGADO').length;
            this.conteoFallidos = this.paquetesLote.filter((pkg) => pkg.estado === 'FALLIDO').length;
            this.conteoEnRuta = this.paquetesLote.filter((pkg) => pkg.estado === 'EN RUTA' || pkg.estado === 'ASIGNADO').length;
          }
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoDetalle = false;
        this.cdr.markForCheck();
      },
    });
  }
}
