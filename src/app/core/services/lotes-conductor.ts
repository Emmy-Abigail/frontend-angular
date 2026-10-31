import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoLoteConductor = 'ASIGNADO' | 'EN_RUTA';

export type MotivoFallo = string;

export interface RegistroFallo {
  motivo: MotivoFallo;
  observacion: string;
  fecha: Date;
}

export interface LoteConductorItem {
  id: string;
  codigo: string;
  zonaOrigen: string;
  zonaDestino: string;
  paquetes: number;
  paradas: number;
  horaAsignacion: string;
  estado: EstadoLoteConductor;
}

export interface ParadaLote {
  numero: number;
  paqueteId?: number;
  destinatario: string;
  direccion: string;
  codigoSeguimiento: string;
  telefono?: string;
  peso?: string;
  dimensiones?: string;
  estado: 'Pendiente' | 'Entregado' | 'Fallido';
  coordenadas?: { lat: number; lng: number } | null;
}

@Injectable({
  providedIn: 'root',
})
export class LotesConductorService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private estadosLotes: Record<string, EstadoLoteConductor> = {
    'L-098': 'ASIGNADO',
    'LOT-9922': 'ASIGNADO',
    'LOT-9923': 'ASIGNADO',
  };

  private paradasEntregadas: Record<string, Set<number>> = {
    'L-098': new Set([4, 5, 6]),
    'LOT-9922': new Set([4, 5]),
    'LOT-9923': new Set(),
  };

  private paradasFallidas: Record<string, Map<number, RegistroFallo>> = {};

  // ==========================================
  // Métodos API Conectados al Backend
  // ==========================================

  /**
   * Obtiene los lotes asignados o en ruta del conductor desde el Backend.
   */
  cargarMisLotesApi(): Observable<LoteConductorItem[]> {
    return this.http.get<any>(`${this.baseUrl}/batches`).pipe(
      map((res) => {
        const items = res?.data ?? (Array.isArray(res) ? res : []);
        if (!items || items.length === 0) {
          return [];
        }

        return items.map((lote: any) => {
          const idStr = String(lote.id);
          const estado: EstadoLoteConductor = lote.estado === 'EN_RUTA' ? 'EN_RUTA' : 'ASIGNADO';
          this.estadosLotes[idStr] = estado;

          let horaStr = '08:30';
          const fechaRef = lote.despachado_at || lote.created_at;
          if (fechaRef) {
            const d = new Date(fechaRef);
            horaStr = !isNaN(d.getTime()) ? d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : horaStr;
          }

          return {
            id: idStr,
            codigo: lote.codigo || `L-${lote.id}`,
            zonaOrigen: lote.sede?.nombre || 'Sede Norte',
            zonaDestino: lote.zona_destino?.nombre || 'Zona Norte',
            paquetes: lote.cantidad_paquetes ?? lote.total_paquetes ?? 0,
            paradas: lote.cantidad_paquetes ?? lote.total_paquetes ?? 0,
            horaAsignacion: horaStr,
            estado,
          };
        });
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Obtiene el detalle de un lote con sus paradas desde el Backend (res.paradas).
   */
  cargarDetalleLoteApi(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/batches/${id}`).pipe(
      map((res) => {
        if (!res) return null;
        const summary = res.data ?? res;
        const paradasList = res.paradas ?? summary.paradas ?? [];

        const idStr = String(summary.id ?? id);
        const estadoLote: EstadoLoteConductor = summary.estado === 'EN_RUTA' ? 'EN_RUTA' : 'ASIGNADO';
        this.estadosLotes[idStr] = estadoLote;

        const paradas: ParadaLote[] = paradasList.map((p: any, index: number) => {
          const numero = p.orden ?? (index + 1);
          const estadoPkg = p.estado === 'ENTREGADO' ? 'Entregado' : p.estado === 'FALLIDO' ? 'Fallido' : 'Pendiente';

          if (estadoPkg === 'Entregado') {
            if (!this.paradasEntregadas[idStr]) this.paradasEntregadas[idStr] = new Set();
            this.paradasEntregadas[idStr].add(numero);
          }

          const dir = p.direccion;
          let dirTexto = '';
          if (typeof dir === 'string') {
            dirTexto = dir;
          } else if (dir) {
            const via = [dir.tipo_via, dir.nombre_via].filter(Boolean).join(' ');
            const num = dir.numero ? `N° ${dir.numero}` : (dir.manzana ? `Mz. ${dir.manzana} Lt. ${dir.lote}` : '');
            const dist = p.distrito?.nombre || dir.distrito || '';
            dirTexto = [via, num, dist].filter(Boolean).join(', ');
          }

          return {
            numero,
            paqueteId: p.id_paquete ?? p.id,
            destinatario: p.destinatario?.nombres || 'Cliente Riva',
            direccion: dirTexto || 'Dirección de entrega',
            codigoSeguimiento: p.tracking_id || p.tracking || '',
            telefono: p.destinatario?.celular || '',
            peso: p.peso_kg ? `${p.peso_kg} kg` : '',
            dimensiones: p.medidas ? `${p.medidas.largo_cm}x${p.medidas.ancho_cm}x${p.medidas.alto_cm} cm` : '',
            estado: estadoPkg,
            coordenadas: p.coordenadas ?? null,
          };
        });

        let fechaAsig = '12 Oct 2026';
        const fechaRef = summary.despachado_at || summary.created_at;
        if (fechaRef) {
          const d = new Date(fechaRef);
          fechaAsig = !isNaN(d.getTime()) ? d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : fechaAsig;
        }

        return {
          id: idStr,
          codigo: summary.codigo || `L-${idStr}`,
          origen: summary.sede?.nombre || 'Sede Norte',
          destino: summary.zona_destino?.nombre || 'Zona Norte',
          totalPaquetes: summary.cantidad_paquetes ?? paradas.length,
          estado: estadoLote === 'EN_RUTA' ? 'En ruta' : 'Asignado',
          fechaAsignacion: fechaAsig,
          paradas,
        };
      })
    );
  }

  /**
   * Inicia la ruta de un lote en el Backend.
   */
  iniciarRutaApi(id: string): Observable<{ ok: boolean; error?: string; message?: string }> {
    return this.http.post<any>(`${this.baseUrl}/batches/${id}/start-route`, {}).pipe(
      map(() => {
        this.iniciarRuta(id);
        return { ok: true };
      }),
      catchError((err) => {
        const errorData = err?.error || {};
        return of({
          ok: false,
          error: errorData.error || 'error_iniciar_ruta',
          message: errorData.message || 'No se pudo iniciar la ruta en el servidor',
        });
      })
    );
  }

  /**
   * Carga el detalle de un paquete específico desde el Backend.
   */
  cargarDetallePaqueteApi(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/packages/${id}`).pipe(
      map((pkg) => {
        const dir = pkg.direccion;
        let dirTexto = '';
        if (typeof dir === 'string') {
          dirTexto = dir;
        } else if (dir) {
          const via = [dir.tipo_via, dir.nombre_via].filter(Boolean).join(' ');
          const num = dir.numero ? `N° ${dir.numero}` : (dir.manzana ? `Mz. ${dir.manzana} Lt. ${dir.lote}` : '');
          dirTexto = [via, num, dir.distrito].filter(Boolean).join(', ');
        }

        const pesoKg = pkg.medidas?.peso_kg ?? pkg.peso_kg;
        const dimensiones = [pkg.medidas?.largo_cm, pkg.medidas?.ancho_cm, pkg.medidas?.alto_cm];

        return {
          id: pkg.id,
          tracking: pkg.tracking_id || pkg.tracking,
          destinatario: pkg.destinatario?.nombres || '',
          telefono: pkg.destinatario?.celular || '',
          direccion: dirTexto || 'Dirección de entrega',
          peso: pesoKg != null ? `${pesoKg} kg` : 'No disponible',
          dimensiones: dimensiones.every((valor) => valor != null)
            ? `${dimensiones.join(' × ')} cm`
            : 'No disponible',
          coordenadas: pkg.direccion?.coordenadas ?? null,
          estado: pkg.estado?.codigo || pkg.estado || 'EN_RUTA',
        };
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Registra la entrega exitosa del paquete enviando la evidencia fotográfica (Multipart FormData).
   */
  registrarEntregaApi(id: string | number, foto: File, observacion?: string): Observable<any> {
    const formData = new FormData();
    formData.append('estado', 'ENTREGADO');
    formData.append('foto', foto, foto.name || 'evidencia.jpg');
    if (observacion) {
      formData.append('observacion', observacion.trim());
    }

    return this.http.post<any>(`${this.baseUrl}/packages/${id}/final-status`, formData);
  }

  /**
   * Registra la entrega fallida del paquete con el motivo y la observación obligatoria.
   */
  registrarFalloApi(id: string | number, idMotivo: number, observacion: string, motivoOtro?: string): Observable<any> {
    const formData = new FormData();
    formData.append('estado', 'FALLIDO');
    formData.append('id_motivo', String(idMotivo));
    formData.append('observacion', observacion.trim());
    if (motivoOtro && motivoOtro.trim()) {
      formData.append('motivo_otro', motivoOtro.trim());
    }

    return this.http.post<any>(`${this.baseUrl}/packages/${id}/final-status`, formData);
  }

  // ==========================================
  // Métodos en memoria / soporte Offline
  // ==========================================

  private obtenerLotesMock(): LoteConductorItem[] {
    return [
      {
        id: 'L-098',
        codigo: 'L - 098',
        zonaOrigen: 'Sede Norte',
        zonaDestino: 'Zona Norte',
        paquetes: 20,
        paradas: 6,
        horaAsignacion: '08:30',
        estado: this.obtenerEstado('L-098'),
      },
      {
        id: 'LOT-9922',
        codigo: 'LOT-9922',
        zonaOrigen: 'Sede Norte',
        zonaDestino: 'Zona norte',
        paquetes: 5,
        paradas: 5,
        horaAsignacion: '08:30',
        estado: this.obtenerEstado('LOT-9922'),
      },
      {
        id: 'LOT-9923',
        codigo: 'LOT-9923',
        zonaOrigen: 'Sede Norte',
        zonaDestino: 'Zona Norte',
        paquetes: 0,
        paradas: 0,
        horaAsignacion: '08:30',
        estado: this.obtenerEstado('LOT-9923'),
      },
    ];
  }

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
    if (this.estaEntregada(id, numeroParada)) return false;
    if (this.estaFallida(id, numeroParada)) return false;

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
    if (this.estaEntregada(id, numeroParada)) return false;
    if (this.estaFallida(id, numeroParada)) return false;

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

  obtenerFallo(id: string, numeroParada: number): RegistroFallo | undefined {
    return this.paradasFallidas[id]?.get(numeroParada);
  }

  obtenerParadasFallidas(id: string): number[] {
    return Array.from(this.paradasFallidas[id]?.keys() ?? []);
  }

  obtenerCantidadParadasFallidas(id: string): number {
    return this.paradasFallidas[id]?.size ?? 0;
  }

  obtenerCantidadPorEstado(estado: EstadoLoteConductor): number {
    return Object.values(this.estadosLotes).filter((e) => e === estado).length;
  }

  obtenerLoteEnRuta(excluirId?: string): string | null {
    const loteActivo = Object.entries(this.estadosLotes).find(
      ([id, estado]) => estado === 'EN_RUTA' && id !== excluirId,
    );

    return loteActivo?.[0] ?? null;
  }
}
