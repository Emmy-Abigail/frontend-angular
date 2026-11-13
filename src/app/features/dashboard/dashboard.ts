import { Component, OnInit, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { CatalogService } from '../../core/services/catalog.service';
import { DashboardService } from '../../core/services/dashboard.service';
import {
  DashboardMetrics,
  DashboardSedeRanking,
  DashboardOperadorDesempenoItem,
  FailedDeliveryItem,
  PeriodoFiltro,
  TipoVehiculoTab,
  ConductorRankingItem,
} from '../../core/models/dashboard.models';
import { Sede } from '../../core/models/catalog.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private authService = inject(AuthService);
  private catalogService = inject(CatalogService);
  private dashboardService = inject(DashboardService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Perfil del usuario
  readonly currentUser = computed(() => this.authService.currentUser());
  readonly isAdmin = computed(() => this.authService.userRole() === 'ADMINISTRADOR');
  readonly isOperador = computed(() => this.authService.userRole() === 'OPERADOR');

  readonly sedeOperadorNombre = computed(() => this.currentUser()?.sede?.nombre || 'Sede');
  readonly sedeOperadorId = computed(() => this.currentUser()?.sede?.id ?? null);

  // Lista de sedes para administrador
  sedes: Sede[] = [];

  // Filtros principales
  periodoSeleccionado: PeriodoFiltro = 'ESTE_MES';
  desde = '';
  hasta = '';
  idSedeSeleccionada: number | null = null; // null = Todas las sedes (Admin)

  // Estado de UI
  mostrarPickerFechas = false;
  cargando = false;
  errorMensaje = '';
  tabVehiculoConductor: TipoVehiculoTab = 'TODOS';
  soloMasBaja = false;

  // Datos del backend
  metricas: DashboardMetrics | null = null;

  // Operadores (tabla admin)
  busquedaOperador = '';
  columnaOrdenOperador: keyof DashboardOperadorDesempenoItem = 'registrados';
  ordenOperadorAsc = false;
  paginaOperador = 1;
  porPaginaOperador = 5;

  // Ranking sedes (tabla admin)
  columnaOrdenSedes: keyof DashboardSedeRanking = 'paquetes_registrados';
  ordenSedesAsc = false;

  // Modal Entregas Fallidas (Operador)
  modalFallidosAbierto = false;
  cargandoFallidos = false;
  fallidosList: FailedDeliveryItem[] = [];
  fallidosTotal = 0;
  fallidosPagina = 1;
  fallidosPorPagina = 8;
  fallidosTotalPaginas = 1;

  ngOnInit(): void {
    this.inicializarFechas('ESTE_MES');

    if (this.isOperador()) {
      this.idSedeSeleccionada = this.sedeOperadorId();
    } else if (this.isAdmin()) {
      this.cargarSedes();
    }

    this.consultarMetricas();
  }

  // --- Manejo de Fechas (Hora de Lima UTC-5) ---

  private getFechaLimaActual(): Date {
    const ahora = new Date();
    const utcMs = ahora.getTime() + ahora.getTimezoneOffset() * 60000;
    return new Date(utcMs - 5 * 3600000);
  }

  private formatearISO(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  formatearDisplay(iso: string): string {
    if (!iso) return '';
    const partes = iso.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return iso;
  }

  inicializarFechas(periodo: PeriodoFiltro): void {
    this.periodoSeleccionado = periodo;
    const hoy = this.getFechaLimaActual();

    switch (periodo) {
      case 'HOY':
        this.desde = this.formatearISO(hoy);
        this.hasta = this.formatearISO(hoy);
        break;
      case '7_DIAS': {
        const d = new Date(hoy);
        d.setDate(d.getDate() - 6);
        this.desde = this.formatearISO(d);
        this.hasta = this.formatearISO(hoy);
        break;
      }
      case 'ESTE_MES': {
        const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        this.desde = this.formatearISO(primero);
        this.hasta = this.formatearISO(ultimo);
        break;
      }
      case 'PERSONALIZADO':
        // Mantiene desde y hasta actuales
        break;
    }
  }

  cambiarPeriodo(periodo: PeriodoFiltro): void {
    this.periodoSeleccionado = periodo;
    if (periodo !== 'PERSONALIZADO') {
      this.mostrarPickerFechas = false;
      this.inicializarFechas(periodo);
      this.consultarMetricas();
    } else {
      this.mostrarPickerFechas = true;
    }
  }

  togglePickerFechas(): void {
    if (this.periodoSeleccionado !== 'PERSONALIZADO') {
      this.periodoSeleccionado = 'PERSONALIZADO';
    }
    this.mostrarPickerFechas = !this.mostrarPickerFechas;
  }

  aplicarFechasPersonalizadas(): void {
    this.mostrarPickerFechas = false;
    this.consultarMetricas();
  }

  get esRangoInvalido(): boolean {
    if (!this.desde || !this.hasta) return false;
    return this.desde > this.hasta;
  }

  // --- Carga de Sedes ---

  cargarSedes(): void {
    this.catalogService.getSedes().subscribe({
      next: (res) => {
        this.sedes = res || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.sedes = [];
      },
    });
  }

  cambiarSede(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.idSedeSeleccionada = val ? Number(val) : null;
    this.consultarMetricas();
  }

  // --- Consulta de Métricas ---

  consultarMetricas(): void {
    if (this.esRangoInvalido) {
      this.metricas = null;
      return;
    }

    this.cargando = true;
    this.errorMensaje = '';

    const idSede = this.isOperador() ? this.sedeOperadorId() : this.idSedeSeleccionada;

    this.dashboardService
      .getMetrics({
        desde: this.desde,
        hasta: this.hasta,
        id_sede: idSede,
      })
      .subscribe({
        next: (resp) => {
          this.metricas = resp.data;
          this.cargando = false;
          this.paginaOperador = 1;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cargando = false;
          if (err.status === 422) {
            this.errorMensaje = err.error?.message || 'El rango de fechas no es válido.';
          } else {
            this.errorMensaje =
              err.error?.message || 'Ocurrió un error al obtener las métricas del dashboard.';
          }
          this.cdr.markForCheck();
        },
      });
  }

  // --- Donut Chart Helpers ---

  get donutSlices(): { strokeDasharray: string; strokeDashoffset: number; color: string; label: string; pct: number }[] {
    const v = this.metricas?.entregas_vehiculo;
    if (!v || v.total <= 0) return [];

    const circumference = 2 * Math.PI * 40; // r=40 -> ~251.327
    const mPct = (v.motorizado?.porcentaje || 0) / 100;
    const aPct = (v.auto?.porcentaje || 0) / 100;
    const cPct = (v.camion?.porcentaje || 0) / 100;

    const mLen = mPct * circumference;
    const aLen = aPct * circumference;
    const cLen = cPct * circumference;

    let offset = 0;

    const slices = [
      {
        strokeDasharray: `${mLen} ${circumference - mLen}`,
        strokeDashoffset: -offset,
        color: '#3B82F6', // Azul Motorizado
        label: 'Motorizado',
        pct: v.motorizado?.porcentaje || 0,
      },
    ];
    offset += mLen;

    slices.push({
      strokeDasharray: `${aLen} ${circumference - aLen}`,
      strokeDashoffset: -offset,
      color: '#F59E0B', // Amarillo/Ámbar Auto
      label: 'Auto',
      pct: v.auto?.porcentaje || 0,
    });
    offset += aLen;

    slices.push({
      strokeDasharray: `${cLen} ${circumference - cLen}`,
      strokeDashoffset: -offset,
      color: '#10B981', // Verde/Teal Camión
      label: 'Camión',
      pct: v.camion?.porcentaje || 0,
    });

    return slices;
  }

  // --- Top 5 Conductores Tab ---

  cambiarTabVehiculo(tab: TipoVehiculoTab): void {
    this.tabVehiculoConductor = tab;
  }

  get conductoresFiltrados(): ConductorRankingItem[] {
    const top = this.metricas?.top_conductores;
    if (!top) return [];

    switch (this.tabVehiculoConductor) {
      case 'MOTORIZADO':
        return top.motorizado || [];
      case 'AUTO':
        return top.auto || [];
      case 'CAMION':
        return top.camion || [];
      case 'TODOS':
      default:
        return top.todos || [];
    }
  }

  // --- Ranking de Sedes (Admin) ---

  ordenarSedesPor(columna: keyof DashboardSedeRanking): void {
    if (this.columnaOrdenSedes === columna) {
      this.ordenSedesAsc = !this.ordenSedesAsc;
    } else {
      this.columnaOrdenSedes = columna;
      this.ordenSedesAsc = false;
    }
  }

  get sedesRankingOrdenadas(): DashboardSedeRanking[] {
    const ranking = this.metricas?.ranking_sedes;
    if (!ranking) return [];

    const lista = [...ranking];
    const col = this.columnaOrdenSedes;
    const asc = this.ordenSedesAsc;

    return lista.sort((a, b) => {
      const valA = a[col] ?? -999999;
      const valB = b[col] ?? -999999;
      if (typeof valA === 'string' && typeof valB === 'string') {
        return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return asc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }

  // --- Tabla de Operadores (Admin) ---

  ordenarOperadoresPor(columna: keyof DashboardOperadorDesempenoItem): void {
    if (this.columnaOrdenOperador === columna) {
      this.ordenOperadorAsc = !this.ordenOperadorAsc;
    } else {
      this.columnaOrdenOperador = columna;
      this.ordenOperadorAsc = false;
    }
  }

  get operadoresFiltrados(): DashboardOperadorDesempenoItem[] {
    const ops = this.metricas?.operadores;
    if (!ops) return [];

    let lista = ops;
    const q = this.busquedaOperador.trim().toLowerCase();
    if (q) {
      lista = lista.filter(
        (o) =>
          o.nombre.toLowerCase().includes(q) ||
          o.sede.toLowerCase().includes(q)
      );
    }

    const col = this.columnaOrdenOperador;
    const asc = this.ordenOperadorAsc;

    return [...lista].sort((a, b) => {
      const valA = a[col] ?? -999999;
      const valB = b[col] ?? -999999;
      if (typeof valA === 'string' && typeof valB === 'string') {
        return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return asc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }

  get operadoresPaginados(): DashboardOperadorDesempenoItem[] {
    const filtrados = this.operadoresFiltrados;
    const start = (this.paginaOperador - 1) * this.porPaginaOperador;
    return filtrados.slice(start, start + this.porPaginaOperador);
  }

  get totalPaginasOperadores(): number {
    return Math.max(1, Math.ceil(this.operadoresFiltrados.length / this.porPaginaOperador));
  }

  cambiarPaginaOperador(pag: number): void {
    if (pag >= 1 && pag <= this.totalPaginasOperadores) {
      this.paginaOperador = pag;
    }
  }

  // --- Modal Entregas Fallidas (Operador) ---

  abrirModalFallidos(): void {
    this.modalFallidosAbierto = true;
    this.fallidosPagina = 1;
    this.cargarFallidosPaginados();
  }

  cerrarModalFallidos(): void {
    this.modalFallidosAbierto = false;
  }

  cargarFallidosPaginados(): void {
    this.cargandoFallidos = true;
    const idSede = this.isOperador() ? this.sedeOperadorId() : this.idSedeSeleccionada;

    this.dashboardService
      .getFailedDeliveries({
        desde: this.desde,
        hasta: this.hasta,
        id_sede: idSede,
        page: this.fallidosPagina,
        per_page: this.fallidosPorPagina,
      })
      .subscribe({
        next: (res) => {
          this.fallidosList = res.data || [];
          this.fallidosTotal = res.meta?.total || 0;
          this.fallidosTotalPaginas = res.meta?.total_pages || Math.max(1, Math.ceil(this.fallidosTotal / this.fallidosPorPagina));
          this.cargandoFallidos = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.fallidosList = [];
          this.fallidosTotal = 0;
          this.cargandoFallidos = false;
          this.cdr.markForCheck();
        },
      });
  }

  cambiarPaginaFallidos(pag: number): void {
    if (pag >= 1 && pag <= this.fallidosTotalPaginas) {
      this.fallidosPagina = pag;
      this.cargarFallidosPaginados();
    }
  }

  irADetallePaquete(tracking: string): void {
    this.cerrarModalFallidos();
    const rutaBase = this.isOperador() ? '/operador/consulta-paquetes' : '/admin/paquetes';
    this.router.navigate([rutaBase, tracking]);
  }

  get rangoFallidosTexto(): string {
    if (this.fallidosTotal === 0) return '0 de 0';
    const inicio = (this.fallidosPagina - 1) * this.fallidosPorPagina + 1;
    const fin = Math.min(this.fallidosPagina * this.fallidosPorPagina, this.fallidosTotal);
    return `${inicio}-${fin} de ${this.fallidosTotal}`;
  }

  get sedeActualLabel(): string {
    if (this.isOperador()) {
      return this.sedeOperadorNombre();
    }
    if (!this.idSedeSeleccionada) {
      return 'Todas las sedes';
    }
    const encontrada = this.sedes.find((s) => s.id === this.idSedeSeleccionada);
    return encontrada ? encontrada.nombre : 'Sede';
  }
}
