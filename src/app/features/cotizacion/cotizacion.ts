
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import {
  CotizacionResponse,
  OperadorService,
} from '../../core/services/operador.service';
import { Department, District } from '../../core/models/catalog.models';
import { GEOGRAPHY_MOCK } from '../../core/data/geography.mock';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  selector: 'app-cotizacion',
  styleUrl: './cotizacion.css',
  templateUrl: './cotizacion.html',
})
export class Cotizacion implements OnInit {
  private catalogService = inject(CatalogService);
  private operadorService = inject(OperadorService);
  private cdr = inject(ChangeDetectorRef);

  departamentos: Department[] = GEOGRAPHY_MOCK;

  origen = '';
  destino = '';

  peso: number | null = null;
  largo: number | null = null;
  ancho: number | null = null;
  alto: number | null = null;

  resultado: CotizacionResponse | null = null;

  cargando = false;
  enviado = false;
  error = '';

  camposTocados = new Set<string>();

  ngOnInit(): void {
    this.catalogService.getGeography().subscribe({
      next: (data) => {
        if (data?.length) {
          this.departamentos = data;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        // Se conserva GEOGRAPHY_MOCK como respaldo.
      },
    });
  }

  get distritos(): District[] {
    return this.departamentos.flatMap((departamento) =>
      departamento.provincias.flatMap((provincia) => provincia.distritos),
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
      case 'origen':
        return !this.origen;
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
      !this.origen ||
      !this.destino ||
      !this.pesoValido ||
      !this.dimensionValida(this.largo) ||
      !this.dimensionValida(this.ancho) ||
      !this.dimensionValida(this.alto)
    ) {
      this.error = 'Revisa los campos indicados antes de continuar.';
      return;
    }

    this.cargando = true;

    this.operadorService.cotizar({
      // Pendiente de que el backend admita también ubigeo_origen.
      ubigeo_destino: this.destino,
      peso_kg: this.peso!,
      largo_cm: this.largo!,
      ancho_cm: this.ancho!,
      alto_cm: this.alto!,
    }).subscribe({
      next: (respuesta) => {
        this.resultado = respuesta;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this.error =
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
