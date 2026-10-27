import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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

  lote: Lote = {
    id: '',
    fechaAsignacion: '12 Oct 2026',
    origen: 'Sede sur',
    destino: 'Zona sur',
    totalPaquetes: 0,
    estado: 'Asignado',
    paradas: [],
  };

  private readonly paradasEjemplo: Parada[] = [
    {
      numero: 1,
      destinatario: 'Juan Carlos Mendoza',
      direccion: 'Av. La Marina 2345, San Miguel',
      codigoSeguimiento: 'Q4HN7TZ2KD',
      estado: 'Pendiente',
    },
    {
      numero: 2,
      destinatario: 'María Belén Soto',
      direccion: 'Jr. Ayacucho 456, Surco',
      codigoSeguimiento: 'M8KP3XR5LA',
      estado: 'Pendiente',
    },
    {
      numero: 3,
      destinatario: 'Andrés Felipe Ramírez',
      direccion: 'Calle Los Cedros 129, Miraflores',
      codigoSeguimiento: 'P7DN2WC9BT',
      estado: 'Pendiente',
    },
    {
      numero: 4,
      destinatario: 'Roberto Jiménez Vargas',
      direccion: 'Av. Arequipa 3890, Lince',
      codigoSeguimiento: 'R5FT8HJ4QM',
      estado: 'Pendiente',
    },
    {
      numero: 5,
      destinatario: 'Camila Fernanda Torres',
      direccion: 'Jr. de la Unión 1020, Cercado',
      codigoSeguimiento: 'C6VB9LK2XZ',
      estado: 'Pendiente',
    },
    {
      numero: 6,
      destinatario: 'Valeria Alejandra Flores',
      direccion: 'Jr. Huallaga 567, Cercado',
      codigoSeguimiento: 'T3GH6NM8YP',
      estado: 'Pendiente',
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private lotesService: LotesConductorService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') ?? 'L-098';
      this.cargarLote(id);
    });
  }

  private cargarLote(id: string): void {
    this.lotesService.cargarDetalleLoteApi(id).subscribe({
      next: (detalle) => {
        if (detalle && detalle.paradas && detalle.paradas.length > 0) {
          this.lote = {
            id: detalle.id,
            fechaAsignacion: detalle.fechaAsignacion || '12 Oct 2026',
            origen: detalle.origen || 'Sede sur',
            destino: detalle.destino || 'Zona sur',
            totalPaquetes: detalle.totalPaquetes || detalle.paradas.length,
            estado: detalle.estado,
            paradas: detalle.paradas,
          };
          this.sincronizarEstado();
        } else {
          this.cargarFallbackLote(id);
        }
      },
      error: () => {
        this.cargarFallbackLote(id);
      },
    });
  }

  private cargarFallbackLote(id: string): void {
    if (id === 'L-098') {
      this.lote = {
        id: 'L-098',
        fechaAsignacion: '12 Oct 2026',
        origen: 'Sede sur',
        destino: 'Zona sur',
        totalPaquetes: 6,
        estado: 'Asignado',
        paradas: this.paradasEjemplo,
      };
    } else if (id === 'LOT-9922') {
      this.lote = {
        id: 'LOT-9922',
        fechaAsignacion: '12 Oct 2026',
        origen: 'Sede sur',
        destino: 'Zona norte',
        totalPaquetes: 5,
        estado: 'Asignado',
        paradas: this.paradasEjemplo.slice(0, 5),
      };
    } else {
      this.lote = {
        id,
        fechaAsignacion: '12 Oct 2026',
        origen: 'Sede sur',
        destino: 'Zona sur',
        totalPaquetes: 0,
        estado: 'Asignado',
        paradas: [],
      };
    }
    this.sincronizarEstado();
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
        if (!res.ok && res.error === 'lote_en_ruta_activo') {
          this.cerrarConfirmacionRuta();
          this.loteEnRutaId = res.message || 'L-098';
          this.mostrarAvisoRutaActiva = true;
          return;
        }

        this.lotesService.iniciarRuta(this.lote.id);
        this.lote.estado = 'En ruta';
        this.paradasCompletadas = this.lotesService.obtenerCantidadParadasCompletadas(this.lote.id);
        this.cerrarConfirmacionRuta();

        this.router.navigate(['/conductor/mis-lotes'], {
          queryParams: { filtro: 'EN_RUTA' },
        });
      },
      error: () => {
        // Fallback local
        this.lotesService.iniciarRuta(this.lote.id);
        this.lote.estado = 'En ruta';
        this.cerrarConfirmacionRuta();
        this.router.navigate(['/conductor/mis-lotes'], {
          queryParams: { filtro: 'EN_RUTA' },
        });
      },
    });
  }

  getGoogleMapsUrl(direccion: string): string {
    const destino = direccion ? `${direccion}, Lima, Perú` : 'Lima, Perú';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`;
  }

  abrirMapa(): void {
    if (this.lote.paradas.length > 0) {
      const direccion = this.lote.paradas[0].direccion;
      window.open(this.getGoogleMapsUrl(direccion), '_blank');
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
