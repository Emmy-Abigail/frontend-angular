
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TrackingService } from '../../core/services/tracking.service';
import { TrackingResponse } from '../../core/models/tracking.models';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-tracking-publico',
  styleUrl: './tracking-publico.css',
  templateUrl: './tracking-publico.html',
})
export class TrackingPublico {
  private trackingService = inject(TrackingService);
  private cdr = inject(ChangeDetectorRef);

  codigo = '';
  resultado: TrackingResponse | null = null;

  cargando = false;
  error = '';

  consultarEnvio(): void {
    this.error = '';
    this.resultado = null;

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
    this.cargando = true;

    this.trackingService.getTracking(codigoNormalizado).subscribe({
      next: (respuesta: TrackingResponse) => {
        this.resultado = respuesta;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;

        if (err.status === 404) {
          this.error = 'No encontramos un envío con ese código de seguimiento.';
        } else if (err.status === 422) {
          this.error = 'El código de seguimiento no tiene un formato válido.';
        } else if (err.status === 429) {
          this.error = 'Has realizado demasiadas consultas. Espera un momento e inténtalo nuevamente.';
        } else {
          this.error = 'No fue posible consultar el envío. Inténtalo nuevamente más tarde.';
        }

        this.cdr.markForCheck();
      },
    });
  }
}
