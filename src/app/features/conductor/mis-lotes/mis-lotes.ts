
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  EstadoLoteConductor,
  LotesConductorService,
} from '../../../core/services/lotes-conductor';

type FiltroLotes = 'TODOS' | 'ASIGNADO' | 'EN_RUTA';

interface LoteConductor {
  id: string;
  codigo: string;
  zonaOrigen: string;
  zonaDestino: string;
  paquetes: number;
  paradas: number;
  horaAsignacion: string;
  estado: EstadoLoteConductor;
}

@Component({
  selector: 'app-mis-lotes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-lotes.html',
  styleUrl: './mis-lotes.css',
})
export class MisLotes implements OnInit {
  filtroActivo: FiltroLotes = 'TODOS';

  lotes: LoteConductor[] = [
    {
      id: 'L-098',
      codigo: 'L - 098',
      zonaOrigen: 'Sede sur',
      zonaDestino: 'Zona sur',
      paquetes: 20,
      paradas: 6,
      horaAsignacion: '08:30',
      estado: 'ASIGNADO',
    },
    {
      id: 'LOT-9922',
      codigo: 'LOT-9922',
      zonaOrigen: 'Sede sur',
      zonaDestino: 'Zona norte',
      paquetes: 0,
      paradas: 0,
      horaAsignacion: '08:30',
      estado: 'ASIGNADO',
    },
    {
      id: 'LOT-9923',
      codigo: 'LOT-9923',
      zonaOrigen: '',
      zonaDestino: '',
      paquetes: 0,
      paradas: 0,
      horaAsignacion: '08:30',
      estado: 'ASIGNADO',
    },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private lotesService: LotesConductorService,
  ) {}

  ngOnInit(): void {
    // Sincroniza los lotes con el estado compartido.
    this.sincronizarLotes();

    // Permite abrir directamente la pestaña indicada en la URL.
    const filtro = this.route.snapshot.queryParamMap.get('filtro');

    if (
      filtro === 'TODOS' ||
      filtro === 'ASIGNADO' ||
      filtro === 'EN_RUTA'
    ) {
      this.filtroActivo = filtro;
    }
  }

  private sincronizarLotes(): void {
    this.lotes = this.lotes.map(lote => ({
      ...lote,
      estado: this.lotesService.obtenerEstado(lote.id),
    }));
  }

  get lotesVisibles(): LoteConductor[] {
    if (this.filtroActivo === 'TODOS') {
      return this.lotes;
    }

    return this.lotes.filter(
      lote => lote.estado === this.filtroActivo,
    );
  }

  get cantidadAsignados(): number {
    return this.lotes.filter(
      lote => lote.estado === 'ASIGNADO',
    ).length;
  }

  get cantidadEnRuta(): number {
    return this.lotes.filter(
      lote => lote.estado === 'EN_RUTA',
    ).length;
  }

  cambiarFiltro(filtro: FiltroLotes): void {
    this.filtroActivo = filtro;
  }

  actualizarLista(): void {
    this.sincronizarLotes();
  }

  abrirLote(lote: LoteConductor): void {
    this.router.navigate(['/conductor/lote', lote.id]);
  }
}
