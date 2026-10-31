import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { OperadorService } from '../../core/services/operador.service';

type EstadoPaquete =
  | 'EN RUTA'
  | 'EN ALMACEN'
  | 'ASIGNADO'
  | 'ENTREGADO'
  | 'FALLIDO';

interface PaqueteDetalle {
  id?: number;
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
  fechaEstimadaEntrega: string;
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
  tieneEvidencia?: boolean;
}

@Component({
  selector: 'app-detalle-paquete',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  reasignando = false;
  errorReasignacion = '';
  mensajeReasignacion = '';
  paqueteReintentadoId: number | null = null;
  mostrarModalConfirmacionReasignar = false;

  requiereCorregirDireccion = false;
  direccionGuardada = false;
  errorDireccion = '';
  mensajeDireccionGuardada = '';

  formDireccion = {
    tipo_via: 'Av.',
    nombre_via: '',
    numero: '',
    manzana: '',
    lote: '',
    referencia: '',
  };

  direccionOriginal = {
    tipo_via: '',
    nombre_via: '',
    numero: '',
    manzana: '',
    lote: '',
    referencia: '',
  };

  guardarCorreccionDireccion(): void {
    this.errorDireccion = '';
    this.mensajeDireccionGuardada = '';

    const nombreVia = this.formDireccion.nombre_via.trim();
    if (!nombreVia) {
      this.errorDireccion = 'El nombre de la vía es obligatorio.';
      this.cdr.markForCheck();
      return;
    }

    const tieneNumero = !!this.formDireccion.numero?.trim();
    const tieneMzLt = !!this.formDireccion.manzana?.trim() || !!this.formDireccion.lote?.trim();
    if (!tieneNumero && !tieneMzLt) {
      this.errorDireccion = 'Debes ingresar el número o la manzana/lote.';
      this.cdr.markForCheck();
      return;
    }

    const cambio =
      this.formDireccion.tipo_via !== this.direccionOriginal.tipo_via ||
      this.formDireccion.nombre_via.trim() !== this.direccionOriginal.nombre_via.trim() ||
      (this.formDireccion.numero || '').trim() !== (this.direccionOriginal.numero || '').trim() ||
      (this.formDireccion.manzana || '').trim() !== (this.direccionOriginal.manzana || '').trim() ||
      (this.formDireccion.lote || '').trim() !== (this.direccionOriginal.lote || '').trim() ||
      (this.formDireccion.referencia || '').trim() !== (this.direccionOriginal.referencia || '').trim();

    if (!cambio) {
      this.errorDireccion = 'Debes corregir al menos un campo de la dirección antes de continuar.';
      this.cdr.markForCheck();
      return;
    }

    this.direccionGuardada = true;
    this.mensajeDireccionGuardada = 'Dirección actualizada correctamente. Ahora puedes proceder a reasignar el paquete.';

    if (this.paquete) {
      const via = [this.formDireccion.tipo_via, this.formDireccion.nombre_via.trim()].filter(Boolean).join(' ');
      const num = this.formDireccion.numero?.trim()
        ? `N° ${this.formDireccion.numero.trim()}`
        : (this.formDireccion.manzana?.trim() ? `Mz. ${this.formDireccion.manzana.trim()} Lt. ${this.formDireccion.lote?.trim() || ''}` : '');
      this.paquete.direccionEntrega = [via, num, this.paquete.destino].filter(Boolean).join(', ');
      if (this.formDireccion.referencia?.trim()) {
        this.paquete.referenciaEntrega = this.formDireccion.referencia.trim();
      }
    }
    this.cdr.markForCheck();
  }

  solicitarReasignacion(): void {
    if (!this.paquete?.id || this.paquete.estado !== 'FALLIDO' || this.cargando || this.reasignando || this.paqueteReintentadoId === this.paquete.id) {
      return;
    }
    if (this.requiereCorregirDireccion && !this.direccionGuardada) {
      this.errorReasignacion = 'Debes corregir y guardar la dirección antes de reasignar.';
      this.cdr.markForCheck();
      return;
    }
    this.errorReasignacion = '';
    this.mostrarModalConfirmacionReasignar = true;
    this.cdr.markForCheck();
  }

  cerrarModalReasignar(): void {
    this.mostrarModalConfirmacionReasignar = false;
    this.cdr.markForCheck();
  }

  confirmarReasignacionDefinitiva(): void {
    this.cerrarModalReasignar();
    this.reasignarPaquete();
  }

  reasignarPaquete(): void {
    const paquete = this.paquete;
    if (!paquete?.id || paquete.estado !== 'FALLIDO' || this.cargando || this.reasignando || this.paqueteReintentadoId === paquete.id) {
      return;
    }

    if (this.requiereCorregirDireccion && !this.direccionGuardada) {
      this.errorReasignacion = 'Debes corregir y guardar la dirección antes de reasignar.';
      this.cdr.markForCheck();
      return;
    }

    const paqueteId = paquete.id;
    this.reasignando = true;
    this.errorReasignacion = '';
    this.mensajeReasignacion = '';

    const payload: any = {};
    if (this.requiereCorregirDireccion) {
      const dirPayload: any = {
        tipo_via: this.formDireccion.tipo_via,
        nombre_via: this.formDireccion.nombre_via.trim(),
      };
      if (this.formDireccion.numero?.trim()) dirPayload.numero = this.formDireccion.numero.trim();
      if (this.formDireccion.manzana?.trim()) dirPayload.manzana = this.formDireccion.manzana.trim();
      if (this.formDireccion.lote?.trim()) dirPayload.lote = this.formDireccion.lote.trim();
      if (this.formDireccion.referencia?.trim()) dirPayload.referencia = this.formDireccion.referencia.trim();
      payload.direccion = dirPayload;
    }

    this.operadorService.reintentarPaquete(paqueteId, payload).pipe(
      finalize(() => {
        this.reasignando = false;
        this.cdr.markForCheck();
      }),
    ).subscribe({
      next: (resultado) => {
        this.paqueteReintentadoId = paqueteId;
        this.mensajeReasignacion = `Reintento creado con tracking ${resultado.tracking_id}. Pendiente de despacho.`;
        void this.router.navigate(['/operador/consulta-paquetes', resultado.id]);
      },
      error: (err) => {
        this.errorReasignacion = err.error?.message || 'No se pudo reasignar el paquete. Inténtalo nuevamente.';
      },
    });
  }

  // Modal de evidencia fotográfica
  mostrarModalEvidencia = false;
  cargandoEvidencia = false;
  urlEvidencia: string | null = null;
  urlEvidenciaPreview: string | null = null;

  verEvidencia(): void {
    if (!this.paquete?.id) return;
    this.mostrarModalEvidencia = true;
    if (this.urlEvidencia) return;

    this.cargandoEvidencia = true;
    this.operadorService.obtenerEvidencia(this.paquete.id).subscribe({
      next: (blob) => {
        this.cargandoEvidencia = false;
        if (this.urlEvidencia) {
          URL.revokeObjectURL(this.urlEvidencia);
        }
        this.urlEvidencia = URL.createObjectURL(blob);
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoEvidencia = false;
        this.cdr.markForCheck();
      },
    });
  }

  cerrarEvidencia(): void {
    this.mostrarModalEvidencia = false;
    if (this.urlEvidencia) {
      URL.revokeObjectURL(this.urlEvidencia);
      this.urlEvidencia = null;
    }
    this.cdr.markForCheck();
  }

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

          this.requiereCorregirDireccion = !!res.requiere_corregir_direccion;
          this.direccionGuardada = false;
          this.mensajeDireccionGuardada = '';
          this.errorDireccion = '';

          if (res.direccion && typeof res.direccion === 'object') {
            this.formDireccion = {
              tipo_via: res.direccion.tipo_via || 'Av.',
              nombre_via: res.direccion.nombre_via || '',
              numero: res.direccion.numero || '',
              manzana: res.direccion.manzana || '',
              lote: res.direccion.lote || '',
              referencia: res.direccion.referencia || '',
            };
            this.direccionOriginal = { ...this.formDireccion };
          }

          const estadoCodigo = (res.estado?.codigo || res.estado || 'EN_ALMACEN')
            .replace(/_/g, ' ')
            .toUpperCase() as EstadoPaquete;

          let fechaIngresoStr = '-';
          let horaIngresoStr = '-';
          let fechaEstimadaEntregaStr = '-';
          if (res.fecha_ingreso) {
            const d = new Date(res.fecha_ingreso);
            fechaIngresoStr = !isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : res.fecha_ingreso;
            horaIngresoStr = !isNaN(d.getTime()) ? d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';
            if (!isNaN(d.getTime())) {
              const estimada = new Date(d);
              estimada.setDate(estimada.getDate() + 2);
              fechaEstimadaEntregaStr = estimada.toLocaleDateString('es-PE');
            }
          }

          let conductorNombre = res.lote?.conductor?.nombres || res.conductor?.nombres || '';
          let conductorPlaca = res.lote?.conductor?.placa || res.conductor?.placa || '';
          let fechaAsignacionStr = '';
          let horaAsignacionStr = '';
          let fechaRutaStr = '';
          let horaRutaStr = '';
          let fechaEntregaStr = '';
          let comentarioEntregaStr = '';
          let motivoFalloStr = '';
          let observacionConductorStr = '';
          let operadorNombre = '';
          let tieneEvidencia = false;

          if (Array.isArray(res.historial)) {
            for (const h of res.historial) {
              const d = h.fecha ? new Date(h.fecha) : null;
              const fStr = d && !isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : (h.fecha || '');
              const hStr = d && !isNaN(d.getTime()) ? d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';

              if (h.estado_nuevo === 'ASIGNADO') {
                fechaAsignacionStr = fStr;
                horaAsignacionStr = hStr;
                operadorNombre = h.usuario?.nombres || '';
              } else if (h.estado_nuevo === 'EN_RUTA') {
                fechaRutaStr = fStr;
                horaRutaStr = hStr;
                if (!conductorNombre && h.usuario?.nombres) conductorNombre = h.usuario.nombres;
              } else if (h.estado_nuevo === 'ENTREGADO') {
                fechaEntregaStr = fStr;
                comentarioEntregaStr = h.comentario || '';
                tieneEvidencia = !!h.tiene_evidencia;
              } else if (h.estado_nuevo === 'FALLIDO') {
                if (h.motivo_fallo) {
                  motivoFalloStr = typeof h.motivo_fallo === 'object'
                    ? (
                        h.motivo_fallo.detalle
                          ? `${h.motivo_fallo.nombre || 'Otros'}: ${h.motivo_fallo.detalle}`
                          : (h.motivo_fallo.nombre || h.motivo_fallo.descripcion || h.motivo_fallo.codigo || 'Cliente ausente')
                      )
                    : String(h.motivo_fallo);
                }
                observacionConductorStr = h.comentario || '';
              }
            }
          }

          if (!motivoFalloStr && res.motivo_fallo) {
            motivoFalloStr = typeof res.motivo_fallo === 'object'
              ? (
                  res.motivo_fallo.detalle
                    ? `${res.motivo_fallo.nombre || 'Otros'}: ${res.motivo_fallo.detalle}`
                    : (res.motivo_fallo.nombre || res.motivo_fallo.descripcion || res.motivo_fallo.codigo || 'Cliente ausente')
                )
              : String(res.motivo_fallo);
          }

          // Cargar vista previa de la evidencia si existe
          if (tieneEvidencia && res.id) {
            this.operadorService.obtenerEvidencia(res.id).subscribe({
              next: (blob) => {
                if (this.urlEvidenciaPreview) {
                  URL.revokeObjectURL(this.urlEvidenciaPreview);
                }
                this.urlEvidenciaPreview = URL.createObjectURL(blob);
                this.cdr.markForCheck();
              },
              error: () => {},
            });
          }

          const largo = Number(res.medidas?.largo_cm || 0);
          const ancho = Number(res.medidas?.ancho_cm || 0);
          const alto = Number(res.medidas?.alto_cm || 0);
          const pesoVolStr = (largo > 0 && ancho > 0 && alto > 0)
            ? `${((largo * ancho * alto) / 5000).toFixed(2)} kg`
            : '1.32 kg';

          const enAlmacen = estadoCodigo === 'EN ALMACEN' || !conductorNombre;
          const conductorFinal = enAlmacen ? 'Por asignar' : conductorNombre;
          const placaFinal = enAlmacen ? '-' : (conductorPlaca || '-');

          this.paquete = {
            id: res.id,
            tracking: res.tracking_id || tracking,
            remitente: res.remitente?.nombres || 'Cliente Riva',
            correoRemitente: res.remitente?.correo || '-',
            documentoRemitente: res.remitente ? `${res.remitente.tipo_documento || 'DNI'} ${res.remitente.numero_documento || ''}` : '-',
            celularRemitente: res.remitente?.celular || '-',

            destinatario: res.destinatario?.nombres || 'Destinatario',
            correoDestinatario: res.destinatario?.correo || '-',
            documentoDestinatario: res.destinatario?.dni || '-',
            celularDestinatario: res.destinatario?.celular || '-',

            destino: res.direccion?.distrito || (typeof res.destino === 'string' ? res.destino : 'Lima'),
            estado: estadoCodigo,
            lote: res.lote?.codigo || (res.id_lote ? `L-${res.id_lote}` : '-'),
            fechaIngreso: fechaIngresoStr,
            fechaEstimadaEntrega: fechaEstimadaEntregaStr,
            horaIngreso: horaIngresoStr,

            direccionEntrega: dirTexto || '-',
            referenciaEntrega: res.direccion?.referencia || '-',
            coordenadas: res.direccion?.coordenadas || (res.direccion?.lat ? { lat: res.direccion.lat, lng: res.direccion.lng } : undefined),

            pesoReal: res.medidas?.peso_kg ? `${res.medidas.peso_kg} kg` : (res.peso_kg ? `${res.peso_kg} kg` : '-'),
            pesoFacturable: res.medidas?.peso_kg ? `${res.medidas.peso_kg} kg` : (res.peso_kg ? `${res.peso_kg} kg` : '-'),
            medidas: res.medidas ? `${res.medidas.largo_cm} x ${res.medidas.ancho_cm} x ${res.medidas.alto_cm} cm` : '-',
            pesoVolumetrico: pesoVolStr,
            factorZona: res.factor || '1.0',
            costo: res.costo_estimado ? `S/ ${Number(res.costo_estimado).toFixed(2)}` : 'S/ 0.00',

            zonaLote: res.lote?.zona || res.zona_destino?.nombre || 'Zona Norte',
            vehiculo: res.vehiculo?.nombre || res.lote?.vehiculo || 'Motorizado',
            conductor: conductorFinal,
            placa: placaFinal,

            fechaAsignacion: fechaAsignacionStr,
            horaAsignacion: horaAsignacionStr,
            operador: operadorNombre,
            fechaRuta: fechaRutaStr,
            horaRuta: horaRutaStr,
            fechaEntrega: fechaEntregaStr,
            comentarioEntrega: comentarioEntregaStr,
            motivoFallo: motivoFalloStr,
            observacionConductor: observacionConductorStr,
            tieneEvidencia,
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
