import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
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
  destinatario: string;
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
  private readonly clavePaquetes = 'riva_paquetes';

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

  private cargarPaquete(tracking: string): void {
    this.operadorService.obtenerPaquete(tracking).subscribe({
      next: (res) => {
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

          this.paquete = {
            tracking: res.tracking_id || tracking,
            remitente: res.remitente?.nombres || 'Cliente Riva',
            destinatario: res.destinatario?.nombres || 'Destinatario',
            destino: res.direccion?.distrito || 'Miraflores',
            estado: estadoCodigo,
            lote: res.lote?.codigo || (res.id_lote ? `L-${res.id_lote}` : 'L-098'),
            fechaIngreso: res.fecha_ingreso ? res.fecha_ingreso.split(' ')[0] : '20/10/2026',
            horaIngreso: res.fecha_ingreso ? res.fecha_ingreso.split(' ')[1]?.slice(0, 5) : '09:05',
            documentoRemitente: res.remitente ? `${res.remitente.tipo_documento} ${res.remitente.numero_documento}` : 'DNI 45678912',
            celularRemitente: res.remitente?.celular || '987654321',
            documentoDestinatario: res.destinatario?.dni || '44102938',
            celularDestinatario: res.destinatario?.celular || '976553210',
            direccionEntrega: dirTexto || 'Calle Shell 320, Miraflores',
            referenciaEntrega: res.direccion?.referencia || 'Esquina con Av. diagonal',
            pesoReal: res.medidas?.peso_kg ? `${res.medidas.peso_kg} kg` : `${res.peso_kg || 3.0} kg`,
            pesoFacturable: `${res.medidas?.peso_kg || 3.0} kg`,
            medidas: res.medidas ? `${res.medidas.largo_cm} x ${res.medidas.ancho_cm} x ${res.medidas.alto_cm} cm` : '30 x 22 x 10 cm',
            pesoVolumetrico: '1.32 kg',
            factorZona: '1.0',
            costo: res.costo_estimado ? `S/ ${res.costo_estimado}` : 'S/ 0.15',
            zonaLote: res.lote?.zona || 'Zona Sur',
            vehiculo: res.vehiculo?.nombre || 'Motorizado',
            conductor: res.conductor?.nombres || 'Carlos Huamán',
            placa: res.conductor?.placa || 'KLM-321',
            fechaAsignacion: '20/10/2026',
            horaAsignacion: '09:05',
            operador: 'Ana Torres (operadora)',
            fechaRuta: '20/10/2026',
            horaRuta: '09:45',
            fechaEntrega: estadoCodigo === 'ENTREGADO' ? '20/10/2026 10:30' : undefined,
            motivoFallo: estadoCodigo === 'FALLIDO' ? 'Cliente ausente' : undefined,
            observacionConductor: estadoCodigo === 'FALLIDO' ? 'Se tocó el timbre 3 veces y se llamó al celular sin respuesta.' : undefined,
          };
        } else {
          this.cargarFallbackLocal(tracking);
        }
      },
      error: () => {
        this.cargarFallbackLocal(tracking);
      },
    });
  }

  private cargarFallbackLocal(tracking: string): void {
    try {
      const registrosGuardados = localStorage.getItem(this.clavePaquetes);
      const paquetesGuardados: PaqueteDetalle[] = registrosGuardados
        ? JSON.parse(registrosGuardados)
        : [];

      const paquetesEjemplo: PaqueteDetalle[] = [
        {
          tracking: 'Q4HN7TZ2KD',
          remitente: 'Juan Perez Quispe',
          destinatario: 'María García',
          destino: 'Miraflores',
          estado: 'EN RUTA',
          lote: 'L-098',
          fechaIngreso: '20/10/2026',
          horaIngreso: '09:05',
          documentoRemitente: 'DNI 45678912',
          celularRemitente: '987654321',
          documentoDestinatario: '44102938',
          celularDestinatario: '976553210',
          direccionEntrega: 'Calle Shell 320, Miraflores',
          referenciaEntrega: 'Esquina con Av. diagonal',
          pesoReal: '3.00 kg',
          pesoFacturable: '3.00 kg',
          medidas: '30 x 22 x 10 cm',
          pesoVolumetrico: '1.32 kg',
          factorZona: '1.0',
          costo: 'S/ 0.15',
          zonaLote: 'Zona sur',
          vehiculo: 'Motorizado',
          conductor: 'Carlos Huamán',
          placa: 'KLM-321',
          fechaAsignacion: '20/10/26',
          horaAsignacion: '09:05',
          operador: 'Ana Torres (operadora)',
          fechaRuta: '20/10/26',
          horaRuta: '09:45',
        },
        {
          tracking: 'RUV7KHBJKD',
          remitente: 'Logística Sur',
          destinatario: 'Tienda Centro',
          destino: 'San Martín de Porres',
          estado: 'EN ALMACEN',
          lote: 'L-098',
          fechaIngreso: '17/10/2026',
          horaIngreso: '07:40',
          pesoReal: '2.50 kg',
          pesoFacturable: '2.50 kg',
          medidas: '25 x 20 x 15 cm',
          pesoVolumetrico: '1.50 kg',
          costo: 'S/ 0.15',
        },
      ];

      const paqueteEncontrado = [
        ...paquetesGuardados,
        ...paquetesEjemplo,
      ].find((item) => item.tracking === tracking);

      if (paqueteEncontrado) {
        this.paquete = paqueteEncontrado;
      } else {
        this.paquete = {
          tracking,
          remitente: 'Remitente General',
          destinatario: 'Destinatario General',
          destino: 'Lima',
          estado: 'EN ALMACEN',
          lote: 'L-101',
          fechaIngreso: '20/10/2026',
          horaIngreso: '09:05',
          pesoReal: '3.00 kg',
          pesoFacturable: '3.00 kg',
          medidas: '30 x 22 x 10 cm',
          costo: 'S/ 0.15',
        };
      }
    } catch {
      this.paquete = null;
    }
  }
}
