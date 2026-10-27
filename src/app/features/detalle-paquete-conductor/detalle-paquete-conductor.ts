import { CommonModule, Location } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LotesConductorService,
  MotivoFallo,
} from '../../core/services/lotes-conductor';
import { CatalogService } from '../../core/services/catalog.service';

type EstadoPaquete = 'ASIGNADO' | 'EN RUTA' | 'ENTREGADO' | 'FALLIDO';

interface Paquete {
  id?: number;
  tracking: string;
  destinatario: string;
  telefono: string;
  direccion: string;
  peso: string;
  dimensiones: string;
  coordenadas?: { lat: number; lng: number } | null;
}

@Component({
  selector: 'app-detalle-paquete-conductor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detalle-paquete-conductor.html',
  styleUrl: './detalle-paquete-conductor.css',
})
export class DetallePaqueteConductor implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private lotesService = inject(LotesConductorService);
  private catalogService = inject(CatalogService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('inputFoto')
  inputFoto?: ElementRef<HTMLInputElement>;

  loteId = '';
  numeroParada = 1;
  paqueteId?: number;
  estadoLote: EstadoPaquete = 'ASIGNADO';

  // Flujo de entrega
  mostrarRegistroEntrega = false;
  mostrarConfirmacionEntrega = false;
  mostrarEntregaExitosa = false;
  mostrarErrorFoto = false;
  guardandoEntrega = false;
  mensajeErrorEntrega = '';

  fotoSeleccionada: File | null = null;
  vistaPreviaFoto: string | null = null;
  comentario = '';

  // Flujo de entrega fallida
  mostrarRegistroFallo = false;
  mostrarConfirmacionFallo = false;
  mostrarErrorFallo = false;
  guardandoFallo = false;
  mensajeErrorFallo = '';

  motivoFallo = '';
  observacionFallo = '';

  motivosFallo: { label: string; id: number }[] = [
    { label: 'Cliente ausente', id: 1 },
    { label: 'Dirección errónea', id: 2 },
    { label: 'Rechazado', id: 3 },
  ];

  paquete: Paquete = {
    id: 1,
    tracking: '',
    destinatario: '',
    telefono: '',
    direccion: '',
    peso: '',
    dimensiones: '',
  };

  ngOnInit(): void {
    this.loteId = this.route.snapshot.paramMap.get('id') ?? '';

    const numero = Number(this.route.snapshot.paramMap.get('numero'));
    this.numeroParada = Number.isInteger(numero) && numero > 0 ? numero : 1;

    const qpId = this.route.snapshot.queryParamMap.get('paqueteId');
    if (qpId) {
      this.paqueteId = Number(qpId);
    }

    this.estadoLote =
      this.lotesService.obtenerEstado(this.loteId) === 'EN_RUTA'
        ? 'EN RUTA'
        : 'ASIGNADO';

    this.catalogService.getFailureReasons().subscribe({
      next: (reasons) => {
        if (reasons && reasons.length > 0) {
          this.motivosFallo = reasons.map((r) => ({ label: r.nombre, id: r.id }));
        }
      },
    });

    this.cargarPaquete();
  }

  private cargarPaquete(): void {
    if (this.loteId) {
      this.lotesService.cargarDetalleLoteApi(this.loteId).subscribe({
        next: (detalle) => {
          if (detalle && detalle.paradas) {
            const parada = detalle.paradas.find(
              (p: any) => p.numero === this.numeroParada || (this.paqueteId && p.paqueteId === this.paqueteId)
            );
            if (parada) {
              this.paquete = {
                id: parada.paqueteId,
                tracking: parada.codigoSeguimiento,
                destinatario: parada.destinatario,
                telefono: parada.telefono || '',
                direccion: parada.direccion,
                peso: parada.peso,
                dimensiones: parada.dimensiones,
                coordenadas: parada.coordenadas,
              };
              if (parada.paqueteId) {
                this.paqueteId = parada.paqueteId;
              }
              this.cdr.markForCheck();
              return;
            }
          }

          if (this.paqueteId) {
            this.cargarPorId(this.paqueteId);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          if (this.paqueteId) {
            this.cargarPorId(this.paqueteId);
          }
          this.cdr.markForCheck();
        },
      });
    } else if (this.paqueteId) {
      this.cargarPorId(this.paqueteId);
    }
  }

  private cargarPorId(id: number): void {
    this.lotesService.cargarDetallePaqueteApi(id).subscribe({
      next: (pkg) => {
        if (pkg) {
          this.paquete = pkg;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      },
    });
  }

  volver(): void {
    this.location.back();
  }

  // ----------------------------------------------------
  // Llamada telefónica y Navegación en Google Maps
  // ----------------------------------------------------

  /** Limpia el número telefónico para formato tel:+51... */
  sanitizePhone(telefono: string): string {
    if (!telefono) return '';
    return telefono.replace(/[^0-9+]/g, '');
  }

  /** Genera la URL directa a Google Maps con coordenadas o texto */
  getGoogleMapsUrl(direccion: string): string {
    if (this.paquete?.coordenadas && typeof this.paquete.coordenadas.lat === 'number' && typeof this.paquete.coordenadas.lng === 'number') {
      return `https://www.google.com/maps/search/?api=1&query=${this.paquete.coordenadas.lat},${this.paquete.coordenadas.lng}`;
    }
    const destino = direccion ? `${direccion}, Lima, Perú` : 'Lima, Perú';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`;
  }

  // ----------------------------------------------------
  // Flujo de Registro de Entrega con Evidencia Fotográfica
  // ----------------------------------------------------

  registrarEntrega(): void {
    if (this.estadoLote !== 'EN RUTA') {
      return;
    }

    if (this.lotesService.estaFallida(this.loteId, this.numeroParada)) {
      return;
    }

    if (this.lotesService.estaEntregada(this.loteId, this.numeroParada)) {
      this.mostrarEntregaExitosa = true;
      return;
    }

    this.mostrarRegistroEntrega = true;
    this.mostrarErrorFoto = false;
    this.mostrarConfirmacionEntrega = false;
  }

  abrirSelectorFoto(): void {
    this.inputFoto?.nativeElement.click();
  }

  seleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      this.mostrarErrorFoto = true;
      this.fotoSeleccionada = null;
      this.limpiarVistaPrevia();
      input.value = '';
      return;
    }

    this.limpiarVistaPrevia();
    this.fotoSeleccionada = archivo;
    this.vistaPreviaFoto = URL.createObjectURL(archivo);
    this.mostrarErrorFoto = false;
  }

  quitarFoto(): void {
    this.fotoSeleccionada = null;
    this.limpiarVistaPrevia();

    if (this.inputFoto) {
      this.inputFoto.nativeElement.value = '';
    }

    this.mostrarErrorFoto = false;
  }

  solicitarConfirmacionEntrega(): void {
    if (!this.fotoSeleccionada || !this.vistaPreviaFoto) {
      this.mostrarErrorFoto = true;
      return;
    }

    this.mostrarErrorFoto = false;
    this.mostrarConfirmacionEntrega = true;
  }

  cerrarConfirmacionEntrega(): void {
    this.mostrarConfirmacionEntrega = false;
  }

  confirmarEntregaDefinitiva(): void {
    if (!this.fotoSeleccionada || !this.vistaPreviaFoto) {
      this.mostrarConfirmacionEntrega = false;
      this.mostrarErrorFoto = true;
      return;
    }

    this.guardandoEntrega = true;
    this.mensajeErrorEntrega = '';
    const idParaApi = this.paquete.id || this.paqueteId || this.numeroParada;

    this.lotesService.registrarEntregaApi(idParaApi, this.fotoSeleccionada, this.comentario).subscribe({
      next: () => {
        this.finalizarEntregaLocal();
      },
      error: (err) => {
        this.guardandoEntrega = false;
        this.mensajeErrorEntrega = err?.error?.message || 'Error al registrar la entrega. Intente nuevamente.';
        this.cdr.markForCheck();
      },
    });
  }

  private finalizarEntregaLocal(): void {
    this.lotesService.registrarEntrega(this.loteId, this.numeroParada);
    this.guardandoEntrega = false;
    this.mostrarConfirmacionEntrega = false;
    this.mostrarRegistroEntrega = false;
    this.mostrarEntregaExitosa = true;
    this.cdr.markForCheck();
  }

  cerrarEntregaExitosa(): void {
    this.mostrarEntregaExitosa = false;
    this.limpiarVistaPrevia();
    this.location.back();
  }

  private limpiarVistaPrevia(): void {
    if (this.vistaPreviaFoto) {
      URL.revokeObjectURL(this.vistaPreviaFoto);
    }
    this.vistaPreviaFoto = null;
  }

  // ----------------------------------------------------
  // Flujo de Registro de Entrega Fallida
  // ----------------------------------------------------

  registrarFallido(): void {
    if (this.estadoLote !== 'EN RUTA') {
      return;
    }

    if (
      this.lotesService.estaEntregada(this.loteId, this.numeroParada) ||
      this.lotesService.estaFallida(this.loteId, this.numeroParada)
    ) {
      return;
    }

    this.motivoFallo = '';
    this.observacionFallo = '';
    this.mostrarErrorFallo = false;
    this.mostrarConfirmacionFallo = false;
    this.mostrarRegistroFallo = true;
  }

  seleccionarMotivoFallo(motivo: MotivoFallo): void {
    this.motivoFallo = motivo;
    this.mostrarErrorFallo = false;
  }

  solicitarConfirmacionFallo(): void {
    const observacion = this.observacionFallo.trim();

    if (!this.motivoFallo || !observacion) {
      this.mostrarErrorFallo = true;
      return;
    }

    this.mostrarErrorFallo = false;
    this.mostrarConfirmacionFallo = true;
  }

  cerrarConfirmacionFallo(): void {
    this.mostrarConfirmacionFallo = false;
  }

  volverARegistroFallo(): void {
    this.mostrarConfirmacionFallo = false;
  }

  confirmarFalloDefinitivo(): void {
    const observacion = this.observacionFallo.trim();

    if (!this.motivoFallo || !observacion) {
      this.mostrarConfirmacionFallo = false;
      this.mostrarErrorFallo = true;
      return;
    }

    this.guardandoFallo = true;
    this.mensajeErrorFallo = '';
    const itemMotivo = this.motivosFallo.find(m => m.label === this.motivoFallo);
    const motivoId = itemMotivo ? itemMotivo.id : 1;
    const idParaApi = this.paquete.id || this.paqueteId || this.numeroParada;

    this.lotesService.registrarFalloApi(idParaApi, motivoId, observacion).subscribe({
      next: () => {
        this.finalizarFalloLocal(observacion);
      },
      error: (err) => {
        this.guardandoFallo = false;
        this.mensajeErrorFallo = err?.error?.message || 'Error al registrar el fallo. Intente nuevamente.';
        this.cdr.markForCheck();
      },
    });
  }

  private finalizarFalloLocal(observacion: string): void {
    if (this.motivoFallo) {
      this.lotesService.registrarFallo(
        this.loteId,
        this.numeroParada,
        this.motivoFallo,
        observacion,
      );
    }
    this.guardandoFallo = false;
    this.mostrarConfirmacionFallo = false;
    this.mostrarRegistroFallo = false;
    this.cdr.markForCheck();
    this.location.back();
  }
}
