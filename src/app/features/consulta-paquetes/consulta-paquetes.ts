import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OperadorService } from '../../core/services/operador.service';

type EstadoPaquete =
  | 'EN RUTA'
  | 'EN ALMACEN'
  | 'ENTREGADO'
  | 'ASIGNADO'
  | 'FALLIDO';

interface PaqueteConsulta {
  tracking: string;
  remitente: string;
  destinatario: string;
  destino: string;
  estado: EstadoPaquete;
  lote: string;
  fechaIngreso: string;
  horaIngreso: string;
}

@Component({
  selector: 'app-consulta-paquetes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consulta-paquetes.html',
  styleUrl: './consulta-paquetes.css',
})
export class ConsultaPaquetes {
  private readonly router = inject(Router);
  private readonly operadorService = inject(OperadorService);
  busqueda = '';
  estadoSeleccionado = 'TODOS';
  fechaDesde = '';
  fechaHasta = '';

  paginaActual = 1;
  readonly elementosPorPagina = 4;

  paqueteSeleccionado: PaqueteConsulta | null = null;
  ultimaActualizacion = new Date();

  paquetes: PaqueteConsulta[] = [];
  cargando = false;
  mensajeError = '';
  totalItems = 0;
  totalPaginasServidor = 1;

  constructor() {
    this.cargarPaquetes();
  }

  cargarPaquetes(): void {
    this.cargando = true;
    this.mensajeError = '';

    this.operadorService.listarPaquetes({
      q: this.busqueda || undefined,
      estado: this.estadoSeleccionado !== 'TODOS' ? this.estadoSeleccionado : undefined,
      desde: this.fechaDesde || undefined,
      hasta: this.fechaHasta || undefined,
      page: this.paginaActual,
      per_page: this.elementosPorPagina,
    }).subscribe({
      next: (res) => {
        this.cargando = false;
        const items = res?.data ?? [];
        if (res?.meta) {
          this.totalPaginasServidor = res.meta.total_pages || 1;
          this.totalItems = res.meta.total || 0;
        } else {
          this.totalPaginasServidor = 1;
          this.totalItems = items.length;
        }

        this.paquetes = items.map((pkg: any) => {
          let fechaStr = '-';
          let horaStr = '-';
          if (pkg.fecha_ingreso) {
            const d = new Date(pkg.fecha_ingreso);
            fechaStr = !isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : pkg.fecha_ingreso;
            horaStr = !isNaN(d.getTime()) ? d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';
          }

          const estadoCodigo = (pkg.estado?.codigo || pkg.estado || 'EN_ALMACEN')
            .replace(/_/g, ' ')
            .toUpperCase() as EstadoPaquete;

          const destNombre = typeof pkg.destinatario === 'string'
            ? pkg.destinatario
            : (pkg.destinatario?.nombres || '-');

          const remitNombre = typeof pkg.remitente === 'string'
            ? pkg.remitente
            : (pkg.remitente?.nombres || '-');

          const distritoNombre = pkg.destino?.distrito || (typeof pkg.destino === 'string' ? pkg.destino : '-');

          return {
            tracking: pkg.tracking_id || pkg.tracking,
            remitente: remitNombre,
            destinatario: destNombre,
            destino: distritoNombre,
            estado: estadoCodigo,
            lote: pkg.id_lote ? `L-${pkg.id_lote}` : (pkg.lote?.codigo || '-'),
            fechaIngreso: fechaStr,
            horaIngreso: horaStr,
          };
        });
      },
      error: (err) => {
        this.cargando = false;
        this.paquetes = [];
        this.mensajeError = err.error?.message || 'Error al consultar paquetes del servidor.';
      },
    });
  }

  get paquetesFiltrados(): PaqueteConsulta[] {
    const texto = this.busqueda.trim().toLowerCase();

    return this.paquetes.filter((paquete) => {
      const coincideBusqueda =
        !texto ||
        paquete.tracking.toLowerCase().includes(texto) ||
        paquete.remitente.toLowerCase().includes(texto) ||
        paquete.destinatario.toLowerCase().includes(texto) ||
        paquete.destino.toLowerCase().includes(texto);

      const coincideEstado =
        this.estadoSeleccionado === 'TODOS' ||
        paquete.estado === this.estadoSeleccionado;

      const coincideDesde =
        !this.fechaDesde || paquete.fechaIngreso >= this.fechaDesde;

      const coincideHasta =
        !this.fechaHasta || paquete.fechaIngreso <= this.fechaHasta;

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideDesde &&
        coincideHasta
      );
    });
  }

  get totalPaginas(): number {
    return Math.max(1, this.totalPaginasServidor);
  }

  get paquetesVisibles(): PaqueteConsulta[] {
    return this.paquetes;
  }

  get paginas(): number[] {
    return Array.from(
      { length: this.totalPaginas },
      (_, indice) => indice + 1,
    );
  }

  get totalRegistros(): number {
    return this.totalItems || this.paquetes.length;
  }

  cambiarFiltro(): void {
    this.paginaActual = 1;
    this.cargarPaquetes();
  }

  actualizar(): void {
    this.paginaActual = 1;
    this.cargarPaquetes();
    this.ultimaActualizacion = new Date();
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas && pagina !== this.paginaActual) {
      this.paginaActual = pagina;
      this.cargarPaquetes();
    }
  }

  verDetalle(paquete: PaqueteConsulta): void {
    this.router.navigate([
      '/operador/consulta-paquetes',
      paquete.tracking,
    ]);
  }

  cerrarDetalle(): void {
    this.paqueteSeleccionado = null;
  }

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    if (!anio || !mes || !dia) {
      return fecha;
    }
    return `${dia}/${mes}`;
  }
}
