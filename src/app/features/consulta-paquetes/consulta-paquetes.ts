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
  private readonly clavePaquetes = 'riva_paquetes';

  busqueda = '';
  estadoSeleccionado = 'TODOS';
  fechaDesde = '';
  fechaHasta = '';

  paginaActual = 1;
  readonly elementosPorPagina = 4;

  paqueteSeleccionado: PaqueteConsulta | null = null;
  ultimaActualizacion = new Date();

  private readonly paquetesEjemplo: PaqueteConsulta[] = [
    {
      tracking: 'Q4HN7TZ2KD',
      remitente: 'Juan Pérez',
      destinatario: 'María García',
      destino: 'Jesús María',
      estado: 'EN RUTA',
      lote: 'L-101',
      fechaIngreso: '2026-10-17',
      horaIngreso: '08:00',
    },
    {
      tracking: 'RUV7KHBJKD',
      remitente: 'Logística Sur',
      destinatario: 'Tienda Centro',
      destino: 'San Martín de Porres',
      estado: 'EN ALMACEN',
      lote: 'L-098',
      fechaIngreso: '2026-10-17',
      horaIngreso: '07:40',
    },
    {
      tracking: 'K3P8WZ2MNA',
      remitente: 'Electrónica S.A.',
      destinatario: 'Roberto Gómez',
      destino: 'Villa El Salvador',
      estado: 'ENTREGADO',
      lote: 'L-095',
      fechaIngreso: '2026-10-18',
      horaIngreso: '18:10',
    },
    {
      tracking: 'W8FJ3KN6RA',
      remitente: 'Almacén Norte',
      destinatario: 'Ana Belén',
      destino: 'Los Ángeles',
      estado: 'ASIGNADO',
      lote: 'L-090',
      fechaIngreso: '2026-10-18',
      horaIngreso: '15:25',
    },
    {
      tracking: 'F8M2QX7LPA',
      remitente: 'Juan Pérez Quispe',
      destinatario: 'María García',
      destino: 'Miraflores',
      estado: 'FALLIDO',
      lote: 'L-098',
      fechaIngreso: '2026-10-20',
      horaIngreso: '09:05',
    },
  ];

  paquetes: PaqueteConsulta[] = [];

  constructor() {
    this.cargarPaquetes();
  }

  private cargarPaquetes(): void {
    this.operadorService.listarPaquetes({
      q: this.busqueda || undefined,
      estado: this.estadoSeleccionado !== 'TODOS' ? this.estadoSeleccionado : undefined,
      desde: this.fechaDesde || undefined,
      hasta: this.fechaHasta || undefined,
      page: 1,
      per_page: 50,
    }).subscribe({
      next: (res) => {
        const items = res?.items ?? [];
        if (items.length > 0) {
          this.paquetes = items.map((pkg: any) => {
            let fechaStr = '2026-10-20';
            let horaStr = '09:00';
            if (pkg.fecha_ingreso) {
              const partes = pkg.fecha_ingreso.split(' ');
              fechaStr = partes[0] || fechaStr;
              horaStr = partes[1]?.slice(0, 5) || horaStr;
            }

            const estadoCodigo = (pkg.estado?.codigo || pkg.estado || 'EN_ALMACEN')
              .replace(/_/g, ' ')
              .toUpperCase() as EstadoPaquete;

            return {
              tracking: pkg.tracking_id || pkg.tracking,
              remitente: pkg.remitente?.nombres || 'Cliente Riva',
              destinatario: pkg.destinatario?.nombres || 'Destinatario',
              destino: pkg.destino?.distrito || 'Lima',
              estado: estadoCodigo,
              lote: pkg.id_lote ? `L-${pkg.id_lote}` : 'L-101',
              fechaIngreso: fechaStr,
              horaIngreso: horaStr,
            };
          });
        } else {
          this.cargarFallbackLocal();
        }
      },
      error: () => {
        this.cargarFallbackLocal();
      },
    });
  }

  private cargarFallbackLocal(): void {
    try {
      const registrosGuardados = localStorage.getItem(this.clavePaquetes);
      const paquetesGuardados: PaqueteConsulta[] = registrosGuardados
        ? JSON.parse(registrosGuardados)
        : [];

      this.paquetes = [
        ...paquetesGuardados,
        ...this.paquetesEjemplo.filter(
          (ejemplo) =>
            !paquetesGuardados.some(
              (guardado) => guardado.tracking === ejemplo.tracking,
            ),
        ),
      ];
    } catch {
      this.paquetes = [...this.paquetesEjemplo];
    }
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
    return Math.max(
      1,
      Math.ceil(this.paquetesFiltrados.length / this.elementosPorPagina),
    );
  }

  get paquetesVisibles(): PaqueteConsulta[] {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;

    return this.paquetesFiltrados.slice(
      inicio,
      inicio + this.elementosPorPagina,
    );
  }

  get paginas(): number[] {
    return Array.from(
      { length: this.totalPaginas },
      (_, indice) => indice + 1,
    );
  }

  get totalRegistros(): number {
    return this.paquetesFiltrados.length;
  }

  cambiarFiltro(): void {
    this.paginaActual = 1;
    this.cargarPaquetes();
  }

  actualizar(): void {
    this.cargarPaquetes();
    this.ultimaActualizacion = new Date();
    this.paginaActual = 1;
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
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
