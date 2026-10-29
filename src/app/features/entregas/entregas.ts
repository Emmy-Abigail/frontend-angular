import { CommonModule, Location } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LotesConductorService, ParadaLote } from '../../core/services/lotes-conductor';

type EstadoLote = 'Asignado' | 'En ruta';
type EstadoParada = 'Pendiente' | 'Entregado' | 'Fallido';

export interface Parada {
  numero: number;
  paqueteId?: number;
  destinatario: string;
  direccion: string;
  codigoSeguimiento: string;
  estado: EstadoParada;
  coordenadas?: { lat: number; lng: number } | null;
}

interface Lote {
  id: string;
  fechaAsignacion: string;
  origen: string;
  destino: string;
  totalPaquetes: number;
  estado: EstadoLote;
  paradas: Parada[];
}

@Component({
  selector: 'app-entregas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './entregas.html',
  styleUrl: './entregas.css',
})
export class Entregas implements OnInit {
  mostrarConfirmacionRuta = false;
  mostrarAvisoRutaActiva = false;

  loteEnRutaId: string | null = null;
  paradasCompletadas = 0;
  cargando = false;
  mensajeError = '';

  lote: Lote = {
    id: '',
    fechaAsignacion: '12 Oct 2026',
    origen: 'Sede Norte',
    destino: 'Zona Norte',
    totalPaquetes: 0,
    estado: 'Asignado',
    paradas: [],
  };

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private lotesService: LotesConductorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') ?? '';
      if (id) {
        this.cargarLote(id);
      }
    });
  }

  private cargarLote(id: string): void {
    this.cargando = true;
    this.mensajeError = '';

    this.lotesService.cargarDetalleLoteApi(id).subscribe({
      next: (detalle) => {
        this.cargando = false;
        if (detalle) {
          this.lote = {
            id: detalle.id,
            fechaAsignacion: detalle.fechaAsignacion || '12 Oct 2026',
            origen: detalle.origen || 'Sede Norte',
            destino: detalle.destino || 'Zona Norte',
            totalPaquetes: detalle.totalPaquetes || (detalle.paradas ? detalle.paradas.length : 0),
            estado: detalle.estado,
            paradas: detalle.paradas || [],
          };
          this.sincronizarEstado();
        } else {
          this.mensajeError = 'No se encontró el lote solicitado.';
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeError = err.error?.message || 'Error al cargar el detalle del lote.';
        this.cdr.markForCheck();
      },
    });
  }

  private sincronizarEstado(): void {
    const estadoGuardado = this.lotesService.obtenerEstado(this.lote.id);
    this.lote.estado = estadoGuardado === 'EN_RUTA' ? 'En ruta' : 'Asignado';

    const entregadas = new Set(
      this.lotesService.obtenerParadasEntregadas(this.lote.id),
    );
    const fallidas = new Set(
      this.lotesService.obtenerParadasFallidas(this.lote.id),
    );

    this.lote.paradas = this.lote.paradas.map(parada => ({
      ...parada,
      estado: entregadas.has(parada.numero)
        ? 'Entregado'
        : fallidas.has(parada.numero)
          ? 'Fallido'
          : 'Pendiente',
    }));

    this.paradasCompletadas =
      this.lotesService.obtenerCantidadParadasCompletadas(
        this.lote.id,
      );
  }

  get cantidadTotalParadas(): number {
    return this.lote.paradas.length;
  }

  get porcentajeCompletado(): number {
    if (
      this.lote.estado !== 'En ruta' ||
      this.cantidadTotalParadas === 0
    ) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (this.paradasCompletadas / this.cantidadTotalParadas) * 100,
      ),
    );
  }

  volver(): void {
    this.location.back();
  }

  iniciarRuta(): void {
    if (
      this.lote.paradas.length === 0 ||
      this.lote.estado === 'En ruta'
    ) {
      return;
    }

    // Comprueba si hay otro lote activo antes de continuar.
    const loteActivo = this.lotesService.obtenerLoteEnRuta(
      this.lote.id,
    );

    if (loteActivo) {
      this.loteEnRutaId = loteActivo;
      this.mostrarConfirmacionRuta = false;
      this.mostrarAvisoRutaActiva = true;
      return;
    }

    this.loteEnRutaId = null;
    this.mostrarAvisoRutaActiva = false;
    this.mostrarConfirmacionRuta = true;
  }

  cerrarConfirmacionRuta(): void {
    this.mostrarConfirmacionRuta = false;
  }

  cerrarAvisoRutaActiva(): void {
    this.mostrarAvisoRutaActiva = false;
  }

  irARutaActual(): void {
    if (!this.loteEnRutaId) {
      return;
    }

    const idRutaActiva = this.loteEnRutaId;
    this.mostrarAvisoRutaActiva = false;

    this.router.navigate([
      '/conductor/lote',
      idRutaActiva,
    ]);
  }

  confirmarInicioRuta(): void {
    if (this.lote.paradas.length === 0) {
      this.cerrarConfirmacionRuta();
      return;
    }

    const loteActivo = this.lotesService.obtenerLoteEnRuta(
      this.lote.id,
    );

    if (loteActivo) {
      this.cerrarConfirmacionRuta();
      this.loteEnRutaId = loteActivo;
      this.mostrarAvisoRutaActiva = true;
      return;
    }

    // Llamada API al backend
    this.lotesService.iniciarRutaApi(this.lote.id).subscribe({
      next: (res) => {
        if (!res.ok) {
          this.cerrarConfirmacionRuta();
          this.mensajeError = res.message || 'No se pudo iniciar la ruta.';
          return;
        }

        this.lotesService.iniciarRuta(this.lote.id);
        this.lote.estado = 'En ruta';
        this.paradasCompletadas = this.lotesService.obtenerCantidadParadasCompletadas(this.lote.id);
        this.cerrarConfirmacionRuta();

        this.router.navigate(['/conductor/mis-lotes'], {
          queryParams: { filtro: 'EN_RUTA' },
        });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cerrarConfirmacionRuta();
        if (err?.status === 409) {
          this.mensajeError = err.error?.message || 'Ya tienes otro lote en ruta activa.';
        } else {
          this.mensajeError = err.error?.message || 'Error al iniciar la ruta en el servidor.';
        }
        this.cdr.markForCheck();
      },
    });
  }

  getGoogleMapsUrl(direccion: string, coordenadas?: { lat: number; lng: number } | null): string {
    if (coordenadas && typeof coordenadas.lat === 'number' && typeof coordenadas.lng === 'number') {
      return `https://www.google.com/maps/search/?api=1&query=${coordenadas.lat},${coordenadas.lng}`;
    }
    const destino = direccion ? `${direccion}, Lima, Perú` : 'Lima, Perú';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`;
  }

  abrirMapa(): void {
    if (this.lote.paradas.length > 0) {
      const parada = this.lote.paradas[0];
      window.open(this.getGoogleMapsUrl(parada.direccion, parada.coordenadas), '_blank');
    } else {
      window.open('https://www.google.com/maps', '_blank');
    }
  }

  abrirParada(parada: Parada): void {
    this.router.navigate(
      ['/conductor/lote', this.lote.id, 'paquete', parada.numero],
      {
        queryParams: {
          paqueteId: parada.paqueteId,
          tracking: parada.codigoSeguimiento,
        },
      }
    );
  }
}
