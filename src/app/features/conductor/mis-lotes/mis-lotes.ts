import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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

  lotes: LoteConductor[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private lotesService: LotesConductorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarLotes();

    const filtro = this.route.snapshot.queryParamMap.get('filtro');

    if (
      filtro === 'TODOS' ||
      filtro === 'ASIGNADO' ||
      filtro === 'EN_RUTA'
    ) {
      this.filtroActivo = filtro;
    }
  }

  cargarLotes(): void {
    this.lotesService.cargarMisLotesApi().subscribe({
      next: (lotes) => {
        this.lotes = lotes ?? [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.lotes = [];
        this.cdr.markForCheck();
      },
    });
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
    this.cargarLotes();
  }

  abrirLote(lote: LoteConductor): void {
    this.router.navigate(['/conductor/lote', lote.id]);
  }
}
