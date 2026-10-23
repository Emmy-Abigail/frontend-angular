
import { CommonModule, Location } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LotesConductorService,
  MotivoFallo,
} from '../../core/services/lotes-conductor';

type EstadoPaquete = 'ASIGNADO' | 'EN RUTA';

interface Paquete {
  tracking: string;
  destinatario: string;
  telefono: string;
  direccion: string;
  peso: string;
  dimensiones: string;
}

@Component({
  selector: 'app-detalle-paquete-conductor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detalle-paquete-conductor.html',
  styleUrl: './detalle-paquete-conductor.css',
})
export class DetallePaqueteConductor implements OnInit {
  @ViewChild('inputFoto')
  inputFoto?: ElementRef<HTMLInputElement>;

  loteId = '';
  numeroParada = 1;
  estadoLote: EstadoPaquete = 'ASIGNADO';

  // Flujo de entrega
  mostrarRegistroEntrega = false;
  mostrarConfirmacionEntrega = false;
  mostrarEntregaExitosa = false;
  mostrarErrorFoto = false;

  fotoSeleccionada: File | null = null;
  vistaPreviaFoto: string | null = null;
  comentario = '';

  // Flujo de entrega fallida
  mostrarRegistroFallo = false;
  mostrarConfirmacionFallo = false;
  mostrarErrorFallo = false;

  motivoFallo: MotivoFallo | '' = '';
  observacionFallo = '';

  readonly motivosFallo: MotivoFallo[] = [
    'Cliente ausente',
    'Dirección incorrecta o no encontrada',
    'Paquete rechazado por el cliente',
  ];

  paquete: Paquete = {
    tracking: 'Q4HN7TZ2KD',
    destinatario: 'Juan Carlos Mendoza',
    telefono: '+51 987 654 321',
    direccion: 'Av. La Marina 2345, San Miguel',
    peso: '2.4 kg',
    dimensiones: '30x20x15 cm',
  };

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private lotesService: LotesConductorService,
  ) {}

  ngOnInit(): void {
    this.loteId =
      this.route.snapshot.paramMap.get('id') ?? 'L-098';

    const numero = Number(
      this.route.snapshot.paramMap.get('numero'),
    );

    this.numeroParada =
      Number.isInteger(numero) && numero > 0 ? numero : 1;

    this.estadoLote =
      this.lotesService.obtenerEstado(this.loteId) === 'EN_RUTA'
        ? 'EN RUTA'
        : 'ASIGNADO';

    this.cargarPaquete();
  }

  private cargarPaquete(): void {
    const paquetes: Paquete[] = [
      {
        tracking: 'Q4HN7TZ2KD',
        destinatario: 'Juan Carlos Mendoza',
        telefono: '+51 987 654 321',
        direccion: 'Av. La Marina 2345, San Miguel',
        peso: '2.4 kg',
        dimensiones: '30x20x15 cm',
      },
      {
        tracking: 'M8KP3XR5LA',
        destinatario: 'María Belén Soto',
        telefono: '+51 986 543 210',
        direccion: 'Jr. Ayacucho 456, Surco',
        peso: '1.8 kg',
        dimensiones: '25x18x12 cm',
      },
      {
        tracking: 'P7DN2WC9BT',
        destinatario: 'Andrés Felipe Ramírez',
        telefono: '+51 985 432 109',
        direccion: 'Calle Los Cedros 129, Miraflores',
        peso: '3.1 kg',
        dimensiones: '35x25x20 cm',
      },
      {
        tracking: 'R5FT8HJ4QM',
        destinatario: 'Roberto Jiménez Vargas',
        telefono: '+51 984 321 098',
        direccion: 'Av. Arequipa 3890, Lince',
        peso: '2.0 kg',
        dimensiones: '28x20x15 cm',
      },
      {
        tracking: 'C6VB9LK2XZ',
        destinatario: 'Camila Fernanda Torres',
        telefono: '+51 983 210 987',
        direccion: 'Jr. de la Unión 1020, Cercado',
        peso: '1.5 kg',
        dimensiones: '22x16x10 cm',
      },
      {
        tracking: 'T3GH6NM8YP',
        destinatario: 'Valeria Alejandra Flores',
        telefono: '+51 982 109 876',
        direccion: 'Jr. Huallaga 567, Cercado',
        peso: '2.7 kg',
        dimensiones: '32x22x18 cm',
      },
    ];

    this.paquete =
      paquetes[this.numeroParada - 1] ?? paquetes[0];
  }

  volver(): void {
    this.location.back();
  }

  // -------------------------
  // Registro de entrega
  // -------------------------

  registrarEntrega(): void {
    if (this.estadoLote !== 'EN RUTA') {
      return;
    }

    if (this.lotesService.estaFallida(this.loteId, this.numeroParada)) {
      return;
    }

    if (this.lotesService.estaEntregada(this.loteId, this.numeroParada)) {
      this.mostrarEntregaExitosa = true;
      return;
    }

    this.mostrarRegistroEntrega = true;
    this.mostrarErrorFoto = false;
    this.mostrarConfirmacionEntrega = false;
  }

  abrirSelectorFoto(): void {
    this.inputFoto?.nativeElement.click();
  }

  seleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      this.mostrarErrorFoto = true;
      this.fotoSeleccionada = null;
      this.limpiarVistaPrevia();
      input.value = '';
      return;
    }

    this.limpiarVistaPrevia();

    this.fotoSeleccionada = archivo;
    this.vistaPreviaFoto = URL.createObjectURL(archivo);
    this.mostrarErrorFoto = false;
  }

  quitarFoto(): void {
    this.fotoSeleccionada = null;
    this.limpiarVistaPrevia();

    if (this.inputFoto) {
      this.inputFoto.nativeElement.value = '';
    }

    this.mostrarErrorFoto = false;
  }

  solicitarConfirmacionEntrega(): void {
    if (!this.fotoSeleccionada || !this.vistaPreviaFoto) {
      this.mostrarErrorFoto = true;
      return;
    }

    this.mostrarErrorFoto = false;
    this.mostrarConfirmacionEntrega = true;
  }

  cerrarConfirmacionEntrega(): void {
    this.mostrarConfirmacionEntrega = false;
  }

  confirmarEntregaDefinitiva(): void {
    if (!this.fotoSeleccionada || !this.vistaPreviaFoto) {
      this.mostrarConfirmacionEntrega = false;
      this.mostrarErrorFoto = true;
      return;
    }

    const registrada = this.lotesService.registrarEntrega(
      this.loteId,
      this.numeroParada,
    );

    this.mostrarConfirmacionEntrega = false;
    this.mostrarRegistroEntrega = false;

    if (!registrada) {
      this.mostrarEntregaExitosa = true;
      return;
    }

    this.mostrarEntregaExitosa = true;
  }

  cerrarEntregaExitosa(): void {
    this.mostrarEntregaExitosa = false;
    this.limpiarVistaPrevia();
    this.location.back();
  }

  private limpiarVistaPrevia(): void {
    if (this.vistaPreviaFoto) {
      URL.revokeObjectURL(this.vistaPreviaFoto);
    }

    this.vistaPreviaFoto = null;
  }

  // -------------------------
  // Registro de fallo
  // -------------------------

  registrarFallido(): void {
    if (this.estadoLote !== 'EN RUTA') {
      return;
    }

    // No permitir registrar un fallo si la parada ya tiene
    // una entrega o un fallo registrado.
    if (
      this.lotesService.estaEntregada(this.loteId, this.numeroParada) ||
      this.lotesService.estaFallida(this.loteId, this.numeroParada)
    ) {
      return;
    }

    this.motivoFallo = '';
    this.observacionFallo = '';
    this.mostrarErrorFallo = false;
    this.mostrarConfirmacionFallo = false;
    this.mostrarRegistroFallo = true;
  }

  seleccionarMotivoFallo(motivo: MotivoFallo): void {
    this.motivoFallo = motivo;
    this.mostrarErrorFallo = false;
  }

  solicitarConfirmacionFallo(): void {
    const observacion = this.observacionFallo.trim();

    if (!this.motivoFallo || !observacion) {
      this.mostrarErrorFallo = true;
      return;
    }

    this.mostrarErrorFallo = false;
    this.mostrarConfirmacionFallo = true;
  }

  cerrarConfirmacionFallo(): void {
    this.mostrarConfirmacionFallo = false;
  }

  volverARegistroFallo(): void {
    this.mostrarConfirmacionFallo = false;
  }

  confirmarFalloDefinitivo(): void {
    const observacion = this.observacionFallo.trim();

    if (!this.motivoFallo || !observacion) {
      this.mostrarConfirmacionFallo = false;
      this.mostrarErrorFallo = true;
      return;
    }

    const registrado = this.lotesService.registrarFallo(
      this.loteId,
      this.numeroParada,
      this.motivoFallo,
      observacion,
    );

    if (!registrado) {
      this.mostrarConfirmacionFallo = false;
      this.mostrarErrorFallo = true;
      return;
    }

    this.mostrarConfirmacionFallo = false;
    this.mostrarRegistroFallo = false;
    this.location.back();
  }
}
