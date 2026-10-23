
import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LotesConductorService } from '../../core/services/lotes-conductor';

type EstadoLote = 'Asignado' | 'En ruta';
type EstadoParada = 'Pendiente' | 'Entregado';

interface Parada {
  numero: number;
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
    fechaAsignacion: '12 Oct 2023',
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
    // Detecta cambios en el ID de la ruta, incluso si Angular
    // reutiliza el mismo componente al navegar entre lotes.
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') ?? 'L-098';

      this.cargarLote(id);
    });
  }

  private cargarLote(id: string): void {
    if (id === 'L-098') {
      this.lote = {
        id: 'L-098',
        fechaAsignacion: '12 Oct 2023',
        origen: 'Sede sur',
        destino: 'Zona sur',
        totalPaquetes: 6,
        estado: 'Asignado',
        paradas: this.paradasEjemplo,
      };
    } else if (id === 'LOT-9922') {
      this.lote = {
        id: 'LOT-9922',
        fechaAsignacion: '12 Oct 2023',
        origen: 'Sede sur',
        destino: 'Zona norte',
        totalPaquetes: 5,
        estado: 'Asignado',
        paradas: this.paradasEjemplo.slice(0, 5),
      };
    } else if (id === 'LOT-9923') {
      this.lote = {
        id: 'LOT-9923',
        fechaAsignacion: '12 Oct 2023',
        origen: 'Sede sur',
        destino: 'Zona sur',
        totalPaquetes: 0,
        estado: 'Asignado',
        paradas: [],
      };
    } else {
      this.lote = {
        id,
        fechaAsignacion: '12 Oct 2023',
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
    this.lote.estado =
      this.lotesService.obtenerEstado(this.lote.id) === 'EN_RUTA'
        ? 'En ruta'
        : 'Asignado';

    const entregadas = new Set(
      this.lotesService.obtenerParadasEntregadas(this.lote.id),
    );

    this.lote.paradas = this.lote.paradas.map(parada => ({
      ...parada,
      estado: entregadas.has(parada.numero)
        ? 'Entregado'
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

    // La ruta configurada en app.routes.ts es /conductor/lote/:id.
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

    // Se vuelve a comprobar para evitar iniciar dos lotes.
    const loteActivo = this.lotesService.obtenerLoteEnRuta(
      this.lote.id,
    );

    if (loteActivo) {
      this.cerrarConfirmacionRuta();
      this.loteEnRutaId = loteActivo;
      this.mostrarAvisoRutaActiva = true;
      return;
    }

    this.lotesService.iniciarRuta(this.lote.id);

    this.lote.estado = 'En ruta';

    this.paradasCompletadas =
      this.lotesService.obtenerCantidadParadasCompletadas(
        this.lote.id,
      );

    this.cerrarConfirmacionRuta();

    this.router.navigate(['/conductor/mis-lotes'], {
      queryParams: { filtro: 'EN_RUTA' },
    });
  }

  abrirMapa(): void {
    // La navegación al mapa se implementará más adelante.
  }

  abrirParada(parada: Parada): void {
    this.router.navigate([
      '/conductor/lote',
      this.lote.id,
      'paquete',
      parada.numero,
    ]);
  }
}
