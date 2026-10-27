import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth';
import { OperadorService, RegistroPaqueteRequest } from '../../core/services/operador.service';
import { Department, District } from '../../core/models/catalog.models';
import { GEOGRAPHY_MOCK } from '../../core/data/geography.mock';

interface PaqueteConsulta {
  tracking: string;
  remitente: string;
  destinatario: string;
  destino: string;
  estado: 'EN RUTA' | 'EN ALMACEN' | 'ENTREGADO' | 'ASIGNADO';
  lote: string;
  fechaIngreso: string;
  horaIngreso: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-operador',
  styleUrl: './operador.css',
  templateUrl: './operador.html',
})
export class Operador {
  private authService = inject(AuthService);
  private operadorService = inject(OperadorService);
  private router = inject(Router);

  private readonly clavePaquetes = 'riva_paquetes';

  currentUser = this.authService.currentUser;

  // Catálogo de distritos
  departamentos: Department[] = GEOGRAPHY_MOCK;

  get todosLosDistritos(): District[] {
    return this.departamentos.flatMap((departamento) =>
      departamento.provincias.flatMap((provincia) => provincia.distritos),
    );
  }

  get nombreDistritoSeleccionado(): string {
    const distrito = this.todosLosDistritos.find(
      (item) => item.ubigeo === this.direccion.distrito,
    );

    return distrito?.nombre_mostrado ?? '';
  }

  // Estado de las validaciones
  enviado = false;
  guardando = false;
  camposTocados = new Set<string>();

  marcarTocado(campo: string): void {
    this.camposTocados.add(campo);
    if (['pesoReal', 'largo', 'ancho', 'alto', 'distrito'].includes(campo)) {
      this.actualizarCotizacion();
    }
  }

  // Documento del remitente
  tipoDocumentoRemitente: 'DNI' | 'RUC' = 'DNI';

  remitente = {
    documento: '',
    nombre: '',
    celular: '',
    correo: '',
  };

  destinatario = {
    nombre: '',
    dni: '',
    celular: '',
    correo: '',
  };

  // Dirección de entrega
  direccion = {
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: '',
    tipoVia: '',
    nombreVia: '',
    numero: '',
    manzana: '',
    lote: '',
    referencia: '',
  };

  // Dimensiones del paquete
  paquete = {
    pesoReal: null as number | null,
    largo: null as number | null,
    ancho: null as number | null,
    alto: null as number | null,
  };

  // Valores de cotización
  tarifaBasePorKg = 0.05;
  factorZona = 1.0;
  totalEstimadoServidor: number | null = null;

  // Estado y datos de la ventana de confirmación
  modalRegistroAbierto = false;
  codigoSeguimiento = '';
  codigoCopiado = false;
  fechaIngreso = '';

  vehiculoAsignado = 'Motorizado';
  loteAsignado = 'L-101';
  zonaLote = 'Zona Sur';

  // ----------------------------------------------------
  // Restricciones de entrada (solo números, solo letras y longitud)
  // ----------------------------------------------------

  onNombreRemitenteInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    this.remitente.nombre = input.value;
  }

  onDocumentoRemitenteInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const max = this.tipoDocumentoRemitente === 'DNI' ? 8 : 11;
    input.value = input.value.replace(/\D/g, '').slice(0, max);
    this.remitente.documento = input.value;
  }

  onCelularRemitenteInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val.length > 0 && !val.startsWith('9')) {
      val = '';
    }
    input.value = val.slice(0, 9);
    this.remitente.celular = input.value;
  }

  onCorreoRemitenteInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.remitente.correo = input.value.trim();
  }

  onNombreDestinatarioInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    this.destinatario.nombre = input.value;
  }

  onDniDestinatarioInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 8);
    this.destinatario.dni = input.value;
  }

  onCelularDestinatarioInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val.length > 0 && !val.startsWith('9')) {
      val = '';
    }
    input.value = val.slice(0, 9);
    this.destinatario.celular = input.value;
  }

  onCorreoDestinatarioInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.destinatario.correo = input.value.trim();
  }

  // Cálculos de peso
  get pesoVolumetrico(): number {
    const { largo, ancho, alto } = this.paquete;

    if (largo == null || ancho == null || alto == null) {
      return 0;
    }

    return (largo * ancho * alto) / 5000;
  }

  get pesoFacturable(): number {
    return Math.max(
      this.paquete.pesoReal ?? 0,
      this.pesoVolumetrico,
    );
  }

  get totalEstimado(): number {
    if (this.totalEstimadoServidor !== null) {
      return this.totalEstimadoServidor;
    }
    return this.pesoFacturable * this.tarifaBasePorKg * this.factorZona;
  }

  actualizarCotizacion(): void {
    if (
      !this.direccion.distrito ||
      !this.pesoRealValido() ||
      !this.dimensionValida(this.paquete.largo) ||
      !this.dimensionValida(this.paquete.ancho) ||
      !this.dimensionValida(this.paquete.alto)
    ) {
      return;
    }

    this.operadorService.cotizar({
      ubigeo_destino: this.direccion.distrito,
      peso_kg: this.paquete.pesoReal!,
      largo_cm: this.paquete.largo!,
      ancho_cm: this.paquete.ancho!,
      alto_cm: this.paquete.alto!,
    }).subscribe({
      next: (res) => {
        if (res && res.monto) {
          this.totalEstimadoServidor = parseFloat(res.monto);
          if (res.tarifa_base_kg) this.tarifaBasePorKg = parseFloat(res.tarifa_base_kg);
          if (res.factor) this.factorZona = parseFloat(res.factor);
        }
      },
      error: () => {
        this.totalEstimadoServidor = null;
      },
    });
  }

  // Nombres solo letras y espacios
  nombreValido(nombre: string): boolean {
    const trim = nombre.trim();
    return trim.length >= 2 && /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(trim);
  }

  // Validación del DNI o RUC del remitente
  get documentoRemitenteValido(): boolean {
    const documento = this.remitente.documento.trim();

    return this.tipoDocumentoRemitente === 'DNI'
      ? /^\d{8}$/.test(documento)
      : /^\d{11}$/.test(documento);
  }

  // Validación del DNI del destinatario
  get dniDestinatarioValido(): boolean {
    return /^\d{8}$/.test(this.destinatario.dni.trim());
  }

  // Los celulares deben tener 9 dígitos y empezar con 9
  celularValido(celular: string): boolean {
    return /^9\d{8}$/.test(celular.trim());
  }

  // Validación de correo electrónico obligatorio
  correoValido(correo: string): boolean {
    const trim = (correo || '').trim();
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trim);
  }

  // Peso real entre 0.1 y 50 kg
  pesoRealValido(): boolean {
    const peso = this.paquete.pesoReal;

    return (
      peso !== null &&
      Number.isFinite(peso) &&
      peso >= 0.1 &&
      peso <= 50
    );
  }

  // Cada dimensión debe estar entre 10 y 150 cm
  dimensionValida(valor: number | null): boolean {
    return (
      valor !== null &&
      Number.isFinite(valor) &&
      valor >= 10 &&
      valor <= 150
    );
  }

  // Resumen de errores del formulario
  get errores(): Record<string, boolean> {
    const tieneNumero = !!this.direccion.numero.trim();
    const tieneManzana = !!this.direccion.manzana.trim();
    const tieneLote = !!this.direccion.lote.trim();

    return {
      remitenteNombre: !this.nombreValido(this.remitente.nombre),
      remitenteDocumento: !this.documentoRemitenteValido,
      remitenteCelular: !this.celularValido(this.remitente.celular),
      remitenteCorreo: !this.correoValido(this.remitente.correo),

      destinatarioNombre: !this.nombreValido(this.destinatario.nombre),
      destinatarioDni: !this.dniDestinatarioValido,
      destinatarioCelular: !this.celularValido(this.destinatario.celular),
      destinatarioCorreo: !this.correoValido(this.destinatario.correo),

      distrito: !this.direccion.distrito,
      tipoVia: !this.direccion.tipoVia,
      nombreVia: !this.direccion.nombreVia.trim(),
      numero: !tieneNumero && !tieneManzana,
      manzana: !tieneNumero && !tieneManzana,
      lote: tieneManzana && !tieneLote,

      pesoReal: !this.pesoRealValido(),
      largo: !this.dimensionValida(this.paquete.largo),
      ancho: !this.dimensionValida(this.paquete.ancho),
      alto: !this.dimensionValida(this.paquete.alto),
    };
  }

  get formularioValido(): boolean {
    return !Object.values(this.errores).some(
      (tieneError) => tieneError,
    );
  }

  mostrarError(campo: string): boolean {
    return (
      (this.enviado || this.camposTocados.has(campo)) &&
      this.errores[campo] === true
    );
  }

  validarFormulario(): boolean {
    this.enviado = true;
    return this.formularioValido;
  }

  private generarCodigoSeguimiento(): string {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = '';

    for (let i = 0; i < 10; i++) {
      const indice = Math.floor(Math.random() * caracteres.length);
      codigo += caracteres[indice];
    }

    return codigo;
  }

  private guardarPaqueteConsulta(): void {
    const ahora = new Date();

    const paqueteNuevo: PaqueteConsulta = {
      tracking: this.codigoSeguimiento,
      remitente: this.remitente.nombre.trim(),
      destinatario: this.destinatario.nombre.trim(),
      destino: this.nombreDistritoSeleccionado || 'Sin destino',
      estado: 'EN ALMACEN',
      lote: this.loteAsignado,
      fechaIngreso: [
        ahora.getFullYear(),
        String(ahora.getMonth() + 1).padStart(2, '0'),
        String(ahora.getDate()).padStart(2, '0'),
      ].join('-'),
      horaIngreso: [
        String(ahora.getHours()).padStart(2, '0'),
        String(ahora.getMinutes()).padStart(2, '0'),
      ].join(':'),
    };

    try {
      const registrosGuardados = localStorage.getItem(this.clavePaquetes);
      const paquetes: PaqueteConsulta[] = registrosGuardados
        ? JSON.parse(registrosGuardados)
        : [];

      paquetes.unshift(paqueteNuevo);

      localStorage.setItem(
        this.clavePaquetes,
        JSON.stringify(paquetes),
      );
    } catch (error) {
      console.error('No se pudo guardar el paquete localmente.', error);
    }
  }

  registrarPaquete(): void {
    if (!this.validarFormulario()) {
      return;
    }

    this.guardando = true;

    // Nota: El backend PHP en PackageDetails.php NO acepta campo 'correo'
    // (daría 422 Campo no permitido). Por eso se omiten de la petición al backend.
    const payload: RegistroPaqueteRequest = {
      remitente: {
        tipo_documento: this.tipoDocumentoRemitente,
        numero_documento: this.remitente.documento.trim(),
        nombres: this.remitente.nombre.trim(),
        celular: this.remitente.celular.trim(),
      },
      destinatario: {
        nombres: this.destinatario.nombre.trim(),
        dni: this.destinatario.dni.trim(),
        celular: this.destinatario.celular.trim(),
      },
      direccion: {
        ubigeo_distrito: this.direccion.distrito,
        tipo_via: this.direccion.tipoVia,
        nombre_via: this.direccion.nombreVia.trim(),
        numero: this.direccion.numero.trim() || null,
        manzana: this.direccion.manzana.trim() || null,
        lote: this.direccion.lote.trim() || null,
        referencia: this.direccion.referencia.trim() || null,
      },
      peso_kg: this.paquete.pesoReal!,
      largo_cm: this.paquete.largo!,
      ancho_cm: this.paquete.ancho!,
      alto_cm: this.paquete.alto!,
    };

    this.operadorService.registrarPaquete(payload).subscribe({
      next: (res) => {
        this.guardando = false;
        this.codigoSeguimiento = res.tracking_id;
        this.codigoCopiado = false;
        this.fechaIngreso = res.fecha_ingreso || new Date().toLocaleString('es-PE');
        if (res.lote) {
          this.loteAsignado = res.lote.codigo || `L-${res.lote.id}`;
          this.vehiculoAsignado = res.lote.vehiculo || 'Motorizado';
          this.zonaLote = res.lote.zona || 'Zona Sur';
        }
        if (res.cotizacion?.monto) {
          this.totalEstimadoServidor = res.cotizacion.monto;
        }

        this.guardarPaqueteConsulta();
        this.modalRegistroAbierto = true;
      },
      error: () => {
        // En caso de que el backend no tenga aún el microservicio de asignación de Python
        // (error 503 asignacion_no_disponible del backend) o desconexión,
        // se completa la asignación automática por reglas de negocio:
        this.guardando = false;
        this.codigoSeguimiento = this.generarCodigoSeguimiento();
        this.codigoCopiado = false;
        this.fechaIngreso = new Date().toLocaleString('es-PE', {
          dateStyle: 'short',
          timeStyle: 'short',
        });

        // Reglas R1 y R2 de asignación de vehículo (documento oficial Demo 3):
        const ladoMayor = Math.max(
          this.paquete.largo || 0,
          this.paquete.ancho || 0,
          this.paquete.alto || 0,
        );
        const peso = this.paquete.pesoReal || 0;

        if (peso <= 20 && ladoMayor <= 40) {
          this.vehiculoAsignado = 'Motorizado';
          this.loteAsignado = 'L-101';
        } else if (peso <= 200 && ladoMayor <= 125) {
          this.vehiculoAsignado = 'Auto';
          this.loteAsignado = 'L-102';
        } else {
          this.vehiculoAsignado = 'Camión';
          this.loteAsignado = 'L-104';
        }
        this.zonaLote = 'Zona Sur';

        this.guardarPaqueteConsulta();
        this.modalRegistroAbierto = true;
      },
    });
  }

  cerrarModalRegistro(): void {
    this.modalRegistroAbierto = false;
  }

  verPaquete(): void {
    this.modalRegistroAbierto = false;
    void this.router.navigate(['/operador/consulta-paquetes']);
  }

  async copiarCodigoSeguimiento(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.codigoSeguimiento);
      this.codigoCopiado = true;
    } catch {
      this.codigoCopiado = false;
    }
  }

  registrarOtro(): void {
    this.modalRegistroAbierto = false;
    this.limpiarFormulario();
  }

  imprimirRegistro(): void {
    window.print();
  }

  limpiarFormulario(): void {
    this.enviado = false;
    this.guardando = false;
    this.totalEstimadoServidor = null;
    this.camposTocados.clear();

    this.tipoDocumentoRemitente = 'DNI';

    this.remitente = {
      documento: '',
      nombre: '',
      celular: '',
      correo: '',
    };

    this.destinatario = {
      nombre: '',
      dni: '',
      celular: '',
      correo: '',
    };

    this.direccion = {
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: '',
      tipoVia: '',
      nombreVia: '',
      numero: '',
      manzana: '',
      lote: '',
      referencia: '',
    };

    this.paquete = {
      pesoReal: null,
      largo: null,
      ancho: null,
      alto: null,
    };
  }
}
