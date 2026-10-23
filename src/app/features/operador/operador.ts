import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth';
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
  private router = inject(Router);

  private readonly clavePaquetes = 'riva_paquetes';

  currentUser = this.authService.currentUser;

  // Catálogo provisional de distritos
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
  camposTocados = new Set<string>();

  marcarTocado(campo: string): void {
    this.camposTocados.add(campo);
  }

  // Documento del remitente
  tipoDocumentoRemitente: 'DNI' | 'RUC' = 'DNI';

  remitente = {
    documento: '',
    nombre: '',
    celular: '',
  };

  destinatario = {
    nombre: '',
    dni: '',
    celular: '',
  };

  // Dirección de entrega
  direccion = {
    departamento: '',
    provincia: '',
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

  // Valores provisionales para pruebas
  readonly tarifaBasePorKg = 0.05;
  factorZona = 1.0;

  // Estado y datos de la ventana de confirmación
  modalRegistroAbierto = false;
  codigoSeguimiento = '';
  codigoCopiado = false;
  fechaIngreso = '';

  readonly vehiculoAsignado = 'Motorizado';
  readonly loteAsignado = 'L-106';
  readonly zonaLote = 'Zona sur';

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
    return this.pesoFacturable * this.tarifaBasePorKg * this.factorZona;
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
    return {
      remitenteNombre: !this.remitente.nombre.trim(),
      remitenteDocumento: !this.documentoRemitenteValido,
      remitenteCelular: !this.celularValido(this.remitente.celular),

      destinatarioNombre: !this.destinatario.nombre.trim(),
      destinatarioDni: !this.dniDestinatarioValido,
      destinatarioCelular: !this.celularValido(this.destinatario.celular),

      distrito: !this.direccion.distrito,
      tipoVia: !this.direccion.tipoVia,
      nombreVia: !this.direccion.nombreVia.trim(),
      numero: !this.direccion.numero.trim(),
      manzana: !this.direccion.manzana.trim(),
      lote: !this.direccion.lote.trim(),

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

  // Generar un código de seguimiento provisional de 10 caracteres
  private generarCodigoSeguimiento(): string {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = '';

    for (let i = 0; i < 10; i++) {
      const indice = Math.floor(Math.random() * caracteres.length);
      codigo += caracteres[indice];
    }

    return codigo;
  }

  // Guardar el paquete para que aparezca en Consulta de Paquetes
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

  // Validar, generar el código y guardar el paquete
  registrarPaquete(): void {
    if (!this.validarFormulario()) {
      return;
    }

    this.codigoSeguimiento = this.generarCodigoSeguimiento();
    this.codigoCopiado = false;

    this.fechaIngreso = new Date().toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    this.guardarPaqueteConsulta();

    this.modalRegistroAbierto = true;
  }

  // Cerrar la ventana de confirmación
  cerrarModalRegistro(): void {
    this.modalRegistroAbierto = false;
  }

  // Ir a Consulta de Paquetes
  verPaquete(): void {
    this.modalRegistroAbierto = false;
    void this.router.navigate(['/operador/consulta-paquetes']);
  }

  // Copiar el código de seguimiento
  async copiarCodigoSeguimiento(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.codigoSeguimiento);
      this.codigoCopiado = true;
    } catch {
      this.codigoCopiado = false;
    }
  }

  // Cerrar la confirmación y preparar otro registro
  registrarOtro(): void {
    this.modalRegistroAbierto = false;
    this.limpiarFormulario();
  }

  // Acción de impresión
  imprimirRegistro(): void {
    window.print();
  }

  // Restablecer el formulario
  limpiarFormulario(): void {
    this.enviado = false;
    this.camposTocados.clear();

    this.tipoDocumentoRemitente = 'DNI';

    this.remitente = {
      documento: '',
      nombre: '',
      celular: '',
    };

    this.destinatario = {
      nombre: '',
      dni: '',
      celular: '',
    };

    this.direccion = {
      departamento: '',
      provincia: '',
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

    this.factorZona = 1.0;
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }
}