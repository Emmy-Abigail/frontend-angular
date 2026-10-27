import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OperadorService } from '../../core/services/operador.service';

type EstadoPaquete =
  | 'EN RUTA'
  | 'EN ALMACEN'
  | 'ASIGNADO'
  | 'ENTREGADO'
  | 'FALLIDO';

interface PaqueteDetalle {
  tracking: string;
  remitente: string;
  correoRemitente?: string;
  destinatario: string;
  correoDestinatario?: string;
  destino: string;
  estado: EstadoPaquete;
  lote: string;
  fechaIngreso: string;
  horaIngreso: string;
  documentoRemitente?: string;
  celularRemitente?: string;
  documentoDestinatario?: string;
  celularDestinatario?: string;
  direccionEntrega?: string;
  referenciaEntrega?: string;
  coordenadas?: { lat: number; lng: number };
  pesoReal?: string;
  pesoFacturable?: string;
  medidas?: string;
  pesoVolumetrico?: string;
  factorZona?: string;
  costo?: string;
  zonaLote?: string;
  vehiculo?: string;
  conductor?: string;
  placa?: string;
  fechaAsignacion?: string;
  horaAsignacion?: string;
  operador?: string;
  fechaRuta?: string;
  horaRuta?: string;
  fechaEntrega?: string;
  comentarioEntrega?: string;
  motivoFallo?: string;
  observacionConductor?: string;
  historial?: any[];
}

@Component({
  selector: 'app-detalle-paquete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-paquete.html',
  styleUrl: './detalle-paquete.css',
})
export class DetallePaquete {
  private readonly operadorService = inject(OperadorService);
  private readonly cdr = inject(ChangeDetectorRef);

  paquete: PaqueteDetalle | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.route.paramMap.subscribe((params) => {
      const tracking = params.get('tracking');

      if (tracking) {
        this.cargarPaquete(tracking);
      }
    });
  }

  get estadoEsEnRuta(): boolean {
    return this.paquete?.estado === 'EN RUTA';
  }

  get estadoEsEntregado(): boolean {
    return this.paquete?.estado === 'ENTREGADO';
  }

  get estadoEsFallido(): boolean {
    return this.paquete?.estado === 'FALLIDO';
  }

  volverAConsulta(): void {
    void this.router.navigate(['/operador/consulta-paquetes']);
  }

  volver(): void {
    this.volverAConsulta();
  }

  cargando = false;
  errorMensaje = '';

  private cargarPaquete(tracking: string): void {
    this.cargando = true;
    this.errorMensaje = '';

    this.operadorService.obtenerPaquete(tracking).subscribe({
      next: (res) => {
        this.cargando = false;
        if (res && (res.tracking_id || res.id)) {
          const dir = res.direccion;
          let dirTexto = '';
          if (typeof dir === 'string') {
            dirTexto = dir;
          } else if (dir) {
            const via = [dir.tipo_via, dir.nombre_via].filter(Boolean).join(' ');
            const num = dir.numero ? `N° ${dir.numero}` : (dir.manzana ? `Mz. ${dir.manzana} Lt. ${dir.lote}` : '');
            dirTexto = [via, num, dir.distrito].filter(Boolean).join(', ');
          }

          const estadoCodigo = (res.estado?.codigo || res.estado || 'EN_ALMACEN')
            .replace(/_/g, ' ')
            .toUpperCase() as EstadoPaquete;

          let fechaIngresoStr = '-';
          let horaIngresoStr = '-';
          if (res.fecha_ingreso) {
            const d = new Date(res.fecha_ingreso);
            fechaIngresoStr = !isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : res.fecha_ingreso;
            horaIngresoStr = !isNaN(d.getTime()) ? d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';
          }

          this.paquete = {
            tracking: res.tracking_id || tracking,
            remitente: res.remitente?.nombres || 'Cliente Riva',
            correoRemitente: res.remitente?.correo,
            documentoRemitente: res.remitente ? `${res.remitente.tipo_documento || 'DNI'} ${res.remitente.numero_documento || ''}` : '',
            celularRemitente: res.remitente?.celular || '',

            destinatario: res.destinatario?.nombres || 'Destinatario',
            correoDestinatario: res.destinatario?.correo,
            documentoDestinatario: res.destinatario?.dni || '',
            celularDestinatario: res.destinatario?.celular || '',

            destino: res.direccion?.distrito || (typeof res.destino === 'string' ? res.destino : 'Lima'),
            estado: estadoCodigo,
            lote: res.lote?.codigo || (res.id_lote ? `L-${res.id_lote}` : '-'),
            fechaIngreso: fechaIngresoStr,
            horaIngreso: horaIngresoStr,

            direccionEntrega: dirTexto || '-',
            referenciaEntrega: res.direccion?.referencia || '',
            coordenadas: res.direccion?.coordenadas || (res.direccion?.lat ? { lat: res.direccion.lat, lng: res.direccion.lng } : undefined),

            pesoReal: res.medidas?.peso_kg ? `${res.medidas.peso_kg} kg` : (res.peso_kg ? `${res.peso_kg} kg` : '-'),
            pesoFacturable: res.medidas?.peso_kg ? `${res.medidas.peso_kg} kg` : (res.peso_kg ? `${res.peso_kg} kg` : '-'),
            medidas: res.medidas ? `${res.medidas.largo_cm} x ${res.medidas.ancho_cm} x ${res.medidas.alto_cm} cm` : '',
            costo: res.costo_estimado ? `S/ ${Number(res.costo_estimado).toFixed(2)}` : undefined,

            zonaLote: res.lote?.zona || res.zona_destino?.nombre || '',
            vehiculo: res.vehiculo?.nombre || res.lote?.vehiculo || '',
            conductor: res.conductor?.nombres,
            placa: res.conductor?.placa,
            historial: res.historial || [],
          };
        } else {
          this.paquete = null;
          this.errorMensaje = 'No se encontró el paquete solicitado.';
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        this.paquete = null;
        this.errorMensaje = err.error?.message || 'Error al obtener el detalle del paquete.';
        this.cdr.markForCheck();
      },
    });
  }
}
