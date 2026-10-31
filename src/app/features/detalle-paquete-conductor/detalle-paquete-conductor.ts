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
import { ActivatedRoute, Router } from '@angular/router';
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
  estado?: string;
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
  private router = inject(Router);
  private location = inject(Location);
  private lotesService = inject(LotesConductorService);
  private catalogService = inject(CatalogService);
  private cdr = inject(ChangeDetectorRef);

  mensajeErrorAcceso = '';

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
  motivoOtro = '';
  observacionFallo = '';

  motivosFallo: { label: string; id: number; codigo?: string }[] = [
    { label: 'Cliente ausente', id: 1, codigo: 'AUSENTE' },
    { label: 'Dirección errónea', id: 2, codigo: 'DIR_ERRONEA' },
    { label: 'Rechazado', id: 3, codigo: 'RECHAZADO' },
    { label: 'Otros', id: 4, codigo: 'OTRO' },
  ];

  paquete: Paquete = {
    id: 1,
    tracking: '',
    destinatario: '',
    telefono: '',
    direccion: '',
    peso: 'No disponible',
    dimensiones: 'No disponible',
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
          this.motivosFallo = reasons.map((r) => ({ label: r.nombre, id: r.id, codigo: r.codigo }));
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
              (p: any) => this.paqueteId
                ? p.paqueteId === this.paqueteId
                : p.numero === this.numeroParada
            );
            if (parada) {
              this.numeroParada = parada.numero;
              this.paquete = {
                id: parada.paqueteId,
                tracking: parada.codigoSeguimiento,
                destinatario: parada.destinatario,
                telefono: parada.telefono || '',
                direccion: parada.direccion,
                peso: parada.peso || 'No disponible',
                dimensiones: parada.dimensiones || 'No disponible',
                coordenadas: parada.coordenadas,
              };
              if (parada.paqueteId) {
                this.paqueteId = parada.paqueteId;
                this.cargarPorId(parada.paqueteId);
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
        error: (err) => {
          const msg = (err?.error?.message || '').toLowerCase();
          const errCode = err?.error?.error || '';
          if (
            err?.status === 403 ||
            errCode === 'sin_permisos' ||
            msg.includes('otro conductor') ||
            msg.includes('permisos') ||
            msg.includes('otra sede')
          ) {
            this.mensajeErrorAcceso = 'No tienes acceso a este lote, no te corresponde';
          } else if (this.paqueteId) {
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
    if (this.mensajeErrorAcceso) {
      this.router.navigate(['/conductor/lotes']);
      return;
    }
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

  get estaFinalizado(): boolean {
    const estadoNorm = (this.paquete?.estado || '').toUpperCase();
    if (estadoNorm === 'ENTREGADO' || estadoNorm === 'FALLIDO') {
      return true;
    }
    if (this.loteId && this.numeroParada) {
      if (this.lotesService.estaEntregada(this.loteId, this.numeroParada) ||
          this.lotesService.estaFallida(this.loteId, this.numeroParada)) {
        return true;
      }
    }
    return false;
  }

  get estadoFinalizado(): 'ENTREGADO' | 'FALLIDO' | null {
    const estadoNorm = (this.paquete?.estado || '').toUpperCase();
    if (estadoNorm === 'ENTREGADO') return 'ENTREGADO';
    if (estadoNorm === 'FALLIDO') return 'FALLIDO';
    if (this.loteId && this.numeroParada) {
      if (this.lotesService.estaEntregada(this.loteId, this.numeroParada)) return 'ENTREGADO';
      if (this.lotesService.estaFallida(this.loteId, this.numeroParada)) return 'FALLIDO';
    }
    return null;
  }

  registrarEntrega(): void {
    if (this.estadoLote !== 'EN RUTA' || this.estaFinalizado) {
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
    if (this.estadoLote !== 'EN RUTA' || this.estaFinalizado) {
      return;
    }

    if (
      this.lotesService.estaEntregada(this.loteId, this.numeroParada) ||
      this.lotesService.estaFallida(this.loteId, this.numeroParada)
    ) {
      return;
    }

    this.motivoFallo = '';
    this.motivoOtro = '';
    this.observacionFallo = '';
    this.mostrarErrorFallo = false;
    this.mostrarConfirmacionFallo = false;
    this.mostrarRegistroFallo = true;
  }

  seleccionarMotivoFallo(motivo: MotivoFallo): void {
    this.motivoFallo = motivo;
    if (!this.esMotivoOtro) {
      this.motivoOtro = '';
    }
    this.mostrarErrorFallo = false;
  }

  get esMotivoOtro(): boolean {
    const item = this.motivosFallo.find((m) => m.label === this.motivoFallo);
    return item?.codigo === 'OTRO' || this.motivoFallo.toLowerCase().startsWith('otro');
  }

  get puedeConfirmarFallo(): boolean {
    if (!this.motivoFallo || !this.observacionFallo.trim()) {
      return false;
    }
    if (this.esMotivoOtro) {
      const otro = this.motivoOtro.trim();
      return otro.length >= 5 && otro.length <= 255;
    }
    return true;
  }

  solicitarConfirmacionFallo(): void {
    if (!this.puedeConfirmarFallo) {
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
    if (!this.puedeConfirmarFallo) {
      this.mostrarConfirmacionFallo = false;
      this.mostrarErrorFallo = true;
      return;
    }

    this.guardandoFallo = true;
    this.mensajeErrorFallo = '';
    const itemMotivo = this.motivosFallo.find(m => m.label === this.motivoFallo);
    const motivoId = itemMotivo ? itemMotivo.id : (this.esMotivoOtro ? 4 : 1);
    const idParaApi = this.paquete.id || this.paqueteId || this.numeroParada;
    const motivoOtroEnvio = this.esMotivoOtro ? this.motivoOtro.trim() : undefined;
    const observacion = this.observacionFallo.trim();

    this.lotesService.registrarFalloApi(idParaApi, motivoId, observacion, motivoOtroEnvio).subscribe({
      next: () => {
        this.finalizarFalloLocal(observacion, motivoOtroEnvio);
      },
      error: (err) => {
        this.guardandoFallo = false;
        this.mensajeErrorFallo = err?.error?.message || 'Error al registrar el fallo. Intente nuevamente.';
        this.cdr.markForCheck();
      },
    });
  }

  private finalizarFalloLocal(observacion: string, motivoOtro?: string): void {
    if (this.motivoFallo) {
      const motivoTexto = (this.esMotivoOtro && motivoOtro) ? `Otros: ${motivoOtro}` : this.motivoFallo;
      this.lotesService.registrarFallo(
        this.loteId,
        this.numeroParada,
        motivoTexto,
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
