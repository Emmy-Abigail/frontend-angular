import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-mis-lotes',
  styleUrl: './mis-lotes.css',
  templateUrl: './mis-lotes.html',
})
export class MisLotes {
  busqueda = '';
  tabActiva: 'TODOS' | 'EN_RUTA' | 'PENDIENTE' = 'TODOS';

  cambiarTab(tab: 'TODOS' | 'EN_RUTA' | 'PENDIENTE'): void {
    this.tabActiva = tab;
  }
}
