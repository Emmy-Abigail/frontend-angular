import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LotesConductorService, LoteConductorItem } from '../../core/services/lotes-conductor';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  selector: 'app-rutas-conductor',
  styleUrl: './rutas-conductor.css',
  templateUrl: './rutas-conductor.html',
})
export class RutasConductor implements OnInit {
  private lotesService = inject(LotesConductorService);
  lotes: LoteConductorItem[] = [];
  cargando = true;

  ngOnInit(): void {
    this.lotesService.cargarMisLotesApi().subscribe({
      next: (items) => {
        this.lotes = items || [];
        this.cargando = false;
      },
      error: () => {
        this.lotes = [];
        this.cargando = false;
      },
    });
  }
}
