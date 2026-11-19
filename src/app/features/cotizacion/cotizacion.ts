import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import {
  PublicQuoteResponse,
  PublicQuoteService,
} from '../../core/services/public-quote.service';
import {
  Department,
  District,
  Sede,
} from '../../core/models/catalog.models';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  selector: 'app-cotizacion',
  styleUrl: './cotizacion.css',
  templateUrl: './cotizacion.html',
})
export class Cotizacion implements OnInit {
  private catalogService = inject(CatalogService);
  private publicQuoteService = inject(PublicQuoteService);
  private cdr = inject(ChangeDetectorRef);

  sedes: Sede[] = [];
  departamentos: Department[] = [];

  idSede: number | '' = '';
  destino = '';

  peso: number | null = null;
  largo: number | null = null;
  ancho: number | null = null;
  alto: number | null = null;

  resultado: PublicQuoteResponse | null = null;

  cargando = false;
  cargandoSedes = true;
  cargandoGeografia = true;

  enviado = false;
  error = '';
  errorCatalogos = '';

  camposTocados = new Set<string>();

  ngOnInit(): void {
    this.cargarSedes();
    this.cargarGeografia();
  }

  private cargarSedes(): void {
    this.catalogService.getPublicSedes().subscribe({
      next: (data) => {
        this.sedes = (data ?? []).filter((sede) => sede.activa);
        this.cargandoSedes = false;

        if (!this.sedes.length) {
          this.errorCatalogos =
            'No hay sedes disponibles para realizar una cotización.';
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoSedes = false;
        this.errorCatalogos =
          'No fue posible cargar las sedes. Actualiza la página e inténtalo nuevamente.';
        this.cdr.markForCheck();
      },
    });
  }

  private cargarGeografia(): void {
    this.catalogService.getPublicGeography().subscribe({
      next: (data) => {
        this.departamentos = data ?? [];
        this.cargandoGeografia = false;

        if (!this.departamentos.length) {
          this.errorCatalogos =
            'No fue posible cargar los distritos disponibles.';
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoGeografia = false;
        this.errorCatalogos =
          'No fue posible cargar los distritos. Actualiza la página e inténtalo nuevamente.';
        this.cdr.markForCheck();
      },
    });
  }

  get distritos(): District[] {
    return this.departamentos.flatMap((departamento) =>
      departamento.provincias.flatMap((provincia) => provincia.distritos),
    );
  }

  get catalogosCargados(): boolean {
    return (
      !this.cargandoSedes &&
      !this.cargandoGeografia &&
      this.sedes.length > 0 &&
      this.distritos.length > 0
    );
  }

  get montoFormateado(): string {
    if (!this.resultado) return '0.00';

    const monto = Number(this.resultado.monto);
    return Number.isFinite(monto) ? monto.toFixed(2) : '0.00';
  }

  get pesoValido(): boolean {
    return (
      this.peso !== null &&
      Number.isFinite(this.peso) &&
      this.peso >= 0.1 &&
      this.peso <= 50
    );
  }

  dimensionValida(valor: number | null): boolean {
    return (
      valor !== null &&
      Number.isFinite(valor) &&
      valor >= 10 &&
      valor <= 150
    );
  }

  marcarTocado(campo: string): void {
    this.camposTocados.add(campo);
  }

  mostrarError(campo: string): boolean {
    if (!this.enviado && !this.camposTocados.has(campo)) {
      return false;
    }

    switch (campo) {
      case 'idSede':
        return !this.idSede;
      case 'destino':
        return !this.destino;
      case 'peso':
        return !this.pesoValido;
      case 'largo':
        return !this.dimensionValida(this.largo);
      case 'ancho':
        return !this.dimensionValida(this.ancho);
      case 'alto':
        return !this.dimensionValida(this.alto);
      default:
        return false;
    }
  }

  calcularCotizacion(): void {
    this.enviado = true;
    this.error = '';
    this.resultado = null;

    if (
      !this.idSede ||
      !this.destino ||
      !this.pesoValido ||
      !this.dimensionValida(this.largo) ||
      !this.dimensionValida(this.ancho) ||
      !this.dimensionValida(this.alto)
    ) {
      this.error = 'Revisa los campos indicados antes de continuar.';
      return;
    }

    if (!this.catalogosCargados) {
      this.error = 'Los catálogos todavía no están disponibles.';
      return;
    }

    this.cargando = true;

    this.publicQuoteService
      .cotizar({
        id_sede: Number(this.idSede),
        ubigeo_destino: this.destino,
        peso_kg: this.peso!,
        largo_cm: this.largo!,
        ancho_cm: this.ancho!,
        alto_cm: this.alto!,
      })
      .subscribe({
        next: (respuesta) => {
          this.resultado = respuesta;
          this.cargando = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cargando = false;
          this.error =
            err?.error?.message ??
            'No fue posible calcular la cotización. Inténtalo nuevamente.';
          this.cdr.markForCheck();
        },
      });
  }

  limpiarResultado(): void {
    this.resultado = null;
    this.error = '';
  }
}
