
import { Injectable } from '@angular/core';

export type EstadoLoteConductor = 'ASIGNADO' | 'EN_RUTA';

export type MotivoFallo =
  | 'Cliente ausente'
  | 'Dirección incorrecta o no encontrada'
  | 'Paquete rechazado por el cliente';

export interface RegistroFallo {
  motivo: MotivoFallo;
  observacion: string;
  fecha: Date;
}

@Injectable({
  providedIn: 'root',
})
export class LotesConductorService {
  private estadosLotes: Record<string, EstadoLoteConductor> = {
    'L-098': 'ASIGNADO',
    'LOT-9922': 'ASIGNADO',
    'LOT-9923': 'ASIGNADO',
  };

  // Se mantienen tres paradas completadas inicialmente por lote.
  private paradasEntregadas: Record<string, Set<number>> = {
    'L-098': new Set([4, 5, 6]),
    'LOT-9922': new Set([4, 5]),
    'LOT-9923': new Set(),
  };

  // Registro de las paradas que no pudieron entregarse.
  private paradasFallidas: Record<string, Map<number, RegistroFallo>> = {};

  obtenerEstado(id: string): EstadoLoteConductor {
    return this.estadosLotes[id] ?? 'ASIGNADO';
  }

  iniciarRuta(id: string): void {
    this.estadosLotes[id] = 'EN_RUTA';

    if (!this.paradasEntregadas[id]) {
      this.paradasEntregadas[id] = new Set<number>();
    }

    if (!this.paradasFallidas[id]) {
      this.paradasFallidas[id] = new Map<number, RegistroFallo>();
    }
  }

  obtenerParadasEntregadas(id: string): number[] {
    return Array.from(this.paradasEntregadas[id] ?? []);
  }

  obtenerCantidadParadasCompletadas(id: string): number {
    return this.paradasEntregadas[id]?.size ?? 0;
  }

  estaEntregada(id: string, numeroParada: number): boolean {
    return this.paradasEntregadas[id]?.has(numeroParada) ?? false;
  }

  registrarEntrega(id: string, numeroParada: number): boolean {
    if (this.estaEntregada(id, numeroParada)) {
      return false;
    }

    // Una parada registrada como fallida no puede entregarse también.
    if (this.estaFallida(id, numeroParada)) {
      return false;
    }

    if (!this.paradasEntregadas[id]) {
      this.paradasEntregadas[id] = new Set<number>();
    }

    this.paradasEntregadas[id].add(numeroParada);
    return true;
  }

  estaFallida(id: string, numeroParada: number): boolean {
    return this.paradasFallidas[id]?.has(numeroParada) ?? false;
  }

  registrarFallo(
    id: string,
    numeroParada: number,
    motivo: MotivoFallo,
    observacion: string,
  ): boolean {
    // No se puede registrar como fallida una parada ya entregada.
    if (this.estaEntregada(id, numeroParada)) {
      return false;
    }

    // Evita registrar dos veces el fallo de la misma parada.
    if (this.estaFallida(id, numeroParada)) {
      return false;
    }

    if (!this.paradasFallidas[id]) {
      this.paradasFallidas[id] = new Map<number, RegistroFallo>();
    }

    this.paradasFallidas[id].set(numeroParada, {
      motivo,
      observacion: observacion.trim(),
      fecha: new Date(),
    });

    return true;
  }

  obtenerFallo(
    id: string,
    numeroParada: number,
  ): RegistroFallo | undefined {
    return this.paradasFallidas[id]?.get(numeroParada);
  }

  obtenerParadasFallidas(id: string): number[] {
    return Array.from(this.paradasFallidas[id]?.keys() ?? []);
  }

  obtenerCantidadParadasFallidas(id: string): number {
    return this.paradasFallidas[id]?.size ?? 0;
  }

  obtenerCantidadPorEstado(
    estado: EstadoLoteConductor,
  ): number {
    return Object.values(this.estadosLotes).filter(
      estadoLote => estadoLote === estado,
    ).length;
  }

  obtenerLoteEnRuta(excluirId?: string): string | null {
    const loteActivo = Object.entries(this.estadosLotes).find(
      ([id, estado]) =>
        estado === 'EN_RUTA' && id !== excluirId,
    );

    return loteActivo?.[0] ?? null;
  }
}
