
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

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

  private cargarPaquete(tracking: string): void {
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
          operador: 'Ana Torres',
          fechaRuta: '20/10/26',
          horaRuta: '09:45',
        },
        {
          tracking: 'K3P8WZ2MNA',
          remitente: 'Juan Perez Quispe',
          destinatario: 'María García',
          destino: 'Miraflores',
          estado: 'ENTREGADO',
          lote: 'L-098',
          fechaIngreso: '18/10/2026',
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
          fechaAsignacion: '18/10/26',
          horaAsignacion: '09:05',
          operador: 'Ana Torres',
          fechaRuta: '18/10/26',
          horaRuta: '09:45',
          fechaEntrega: '20/10/2026',
          comentarioEntrega: 'Entregado al destinatario',
        },
        {
          tracking: 'F8M2QX7LPA',
          remitente: 'Juan Perez Quispe',
          destinatario: 'María García',
          destino: 'Miraflores',
          estado: 'FALLIDO',
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
          operador: 'Ana Torres',
          fechaRuta: '20/10/26',
          horaRuta: '09:45',
          motivoFallo: 'Cliente ausente',
          observacionConductor:
            'Se tocó el timbre 3 veces y se llamó al celular sin respuesta.',
        },
      ];

      const todosLosPaquetes = [
        ...paquetesEjemplo.map((ejemplo) => {
          const guardado = paquetesGuardados.find(
            (item) => item.tracking === ejemplo.tracking,
          );

          // Los datos de demostración prevalecen para estos códigos.
          return guardado ? { ...guardado, ...ejemplo } : ejemplo;
        }),
        ...paquetesGuardados.filter(
          (guardado) =>
            !paquetesEjemplo.some(
              (ejemplo) => ejemplo.tracking === guardado.tracking,
            ),
        ),
      ];

      this.paquete =
        todosLosPaquetes.find((item) => item.tracking === tracking) ?? null;
    } catch (error) {
      console.error('No se pudo cargar el detalle del paquete.', error);
      this.paquete = null;
    }
  }

  volverAConsulta(): void {
    this.router.navigate(['/operador/consulta-paquetes']);
  }

  get estadoEsEntregado(): boolean {
    return this.paquete?.estado === 'ENTREGADO';
  }

  get estadoEsFallido(): boolean {
    return this.paquete?.estado === 'FALLIDO';
  }

  get estadoEsEnRuta(): boolean {
    return this.paquete?.estado === 'EN RUTA';
  }
}
