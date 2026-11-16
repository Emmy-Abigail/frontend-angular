
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TrackingService } from '../../core/services/tracking.service';
import {
  TrackingEvento,
  TrackingResponse,
} from '../../core/models/tracking.models';

interface EtapaSeguimiento {
  codigo: string;
  nombre: string;
  evento: TrackingEvento | null;
  completada: boolean;
  actual: boolean;
}

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-tracking-publico',
  styleUrl: './tracking-publico.css',
  templateUrl: './tracking-publico.html',
})
export class TrackingPublico {
  private trackingService = inject(TrackingService);
  private cdr = inject(ChangeDetectorRef);

  private consultaActual = 0;

  readonly etapasBase = [
    { codigo: 'EN_ALMACEN', nombre: 'En Almacén' },
    { codigo: 'ASIGNADO', nombre: 'Asignado' },
    { codigo: 'EN_RUTA', nombre: 'En Ruta' },
    { codigo: 'ENTREGADO', nombre: 'Entregado' },
  ];

  codigo = '';
  resultado: TrackingResponse | null = null;

  cargando = false;
  error = '';
  fechaConsulta: Date | null = null;

  get esFallido(): boolean {
    return this.resultado?.estado.codigo === 'FALLIDO';
  }

  get etapasSeguimiento(): EtapaSeguimiento[] {
    if (!this.resultado) {
      return [];
    }

    const eventos = this.resultado.linea_de_tiempo ?? [];
    const estadoActual = this.resultado.estado.codigo;

    const indiceActual = this.etapasBase.findIndex(
      (etapa) => etapa.codigo === estadoActual
    );

    return this.etapasBase.map((etapa, indice) => {
      const evento = [...eventos]
        .reverse()
        .find((item) => item.estado === etapa.codigo) ?? null;

      return {
        ...etapa,
        evento,
        completada: evento !== null,
        actual: indice === indiceActual,
      };
    });
  }

  get fechaDespacho(): string {
    if (!this.resultado) {
      return 'Aún no despachado';
    }

    const eventoAsignacion = [...this.resultado.linea_de_tiempo]
      .reverse()
      .find((evento) => evento.estado === 'ASIGNADO');

    return eventoAsignacion
      ? this.formatearFecha(eventoAsignacion.fecha)
      : 'Aún no despachado';
  }

  formatearFecha(fecha: string | Date | null): string {
    if (!fecha) {
      return '';
    }

    const fechaDate = fecha instanceof Date ? fecha : new Date(fecha);

    if (Number.isNaN(fechaDate.getTime())) {
      return '';
    }

    const partes = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(fechaDate);

    const obtener = (tipo: string) =>
      partes.find((parte) => parte.type === tipo)?.value ?? '';

    return `${obtener('day')}/${obtener('month')}/${obtener('year')} ${obtener('hour')}:${obtener('minute')}`;
  }

  consultarEnvio(): void {
    // Limpiar el resultado anterior incluso si el nuevo código es inválido.
    this.resultado = null;
    this.fechaConsulta = null;
    this.error = '';

    const codigoNormalizado = this.codigo.trim().toUpperCase();

    if (!codigoNormalizado) {
      this.error = 'Ingresa un código de seguimiento.';
      return;
    }

    const formatoValido = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}$/.test(
      codigoNormalizado
    );

    if (!formatoValido) {
      this.error = 'El código debe tener 10 caracteres válidos.';
      return;
    }

    this.codigo = codigoNormalizado;
    this.realizarConsulta(codigoNormalizado, false);
  }

  actualizarSeguimiento(): void {
    if (!this.resultado || this.cargando) {
      return;
    }

    this.realizarConsulta(this.resultado.tracking_id, true);
  }

  private realizarConsulta(
    codigo: string,
    conservarResultado: boolean
  ): void {
    const numeroConsulta = ++this.consultaActual;

    this.error = '';

    if (!conservarResultado) {
      this.resultado = null;
      this.fechaConsulta = null;
    }

    this.cargando = true;

    this.trackingService.getTracking(codigo).subscribe({
      next: (respuesta: TrackingResponse) => {
        if (numeroConsulta !== this.consultaActual) {
          return;
        }

        this.resultado = respuesta;
        this.fechaConsulta = new Date();
        this.cargando = false;
        this.cdr.markForCheck();
      },

      error: (err: HttpErrorResponse) => {
        if (numeroConsulta !== this.consultaActual) {
          return;
        }

        this.cargando = false;

        if (err.status === 404) {
          this.error =
            'No encontramos un envío con ese código de seguimiento.';
        } else if (err.status === 422) {
          this.error =
            'El código de seguimiento no tiene un formato válido.';
        } else if (err.status === 429) {
          this.error =
            'Has realizado demasiadas consultas. Espera un momento e inténtalo nuevamente.';
        } else {
          this.error =
            'No fue posible consultar el envío. Inténtalo nuevamente más tarde.';
        }

        this.cdr.markForCheck();
      },
    });
  }
}
