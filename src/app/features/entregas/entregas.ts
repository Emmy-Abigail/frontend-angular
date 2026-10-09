import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface Lote {
  id: string;
  zona: string;
  totalPaquetes: number;
  estado: string;
}

@Component({
  imports: [],
  selector: 'app-entregas',
  styleUrl: './entregas.css',
  templateUrl: './entregas.html',
})
export class Entregas implements OnInit {

  lote: Lote = {
    id: '',
    zona: '',
    totalPaquetes: 0,
    estado: ''
  };

  constructor(
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');

    if (id === 'LOTE-2026-001') {

      this.lote = {
        id: 'LOTE-2026-001',
        zona: 'Miraflores',
        totalPaquetes: 8,
        estado: 'Asignado'
      };

      return;
    }

    if (id === 'LOTE-2026-002') {

      this.lote = {
        id: 'LOTE-2026-002',
        zona: 'San Isidro',
        totalPaquetes: 5,
        estado: 'En ruta'
      };

    }

  }

}