import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Operador } from './operador';
import { AuthService } from '../../core/services/auth';
import { OperadorService } from '../../core/services/operador.service';
import { CatalogService } from '../../core/services/catalog.service';
import { GEOGRAPHY_MOCK } from '../../core/data/geography.mock';
import { UserProfile } from '../../core/models/auth.models';

describe('Operador Component - Factor de Zona y Cotización', () => {
  let fixture: ComponentFixture<Operador>;
  let component: Operador;
  let authServiceSpy: any;
  let operadorServiceSpy: any;
  let catalogServiceSpy: any;

  const mockOperadorCentro: UserProfile = {
    id: 10,
    nombres: 'Operador Centro',
    correo: 'operador.centro@riva.pe',
    rol: 'OPERADOR',
    sede: { id: 2, nombre: 'Sede Centro' },
  };

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: vi.fn().mockReturnValue(mockOperadorCentro),
      isAuthenticated: vi.fn().mockReturnValue(true),
    };

    operadorServiceSpy = {
      cotizar: vi.fn().mockReturnValue(of({
        monto: '18.00',
        factor: '1.2',
        tarifa_base_kg: '2.50',
      })),
      geocodificarInverso: vi.fn().mockReturnValue(of({ data: {} })),
    };

    catalogServiceSpy = {
      getGeography: vi.fn().mockReturnValue(of(GEOGRAPHY_MOCK)),
    };

    await TestBed.configureTestingModule({
      imports: [Operador],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: OperadorService, useValue: operadorServiceSpy },
        { provide: CatalogService, useValue: catalogServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Operador);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar factor de zona en 1.0 por defecto', () => {
    expect(component).toBeTruthy();
    expect(component.factorZona).toBe(1.0);
  });

  it('actualiza inmediatamente el factor de zona al cambiar distrito a Callao (Oeste) desde Centro sin requerir peso ni medidas', () => {
    // Callao ubigeo: '070101' (Zona 5: Oeste). Operador en Centro (Zona 2).
    component.direccion.distrito = '070101';
    component.onDistritoChange();
    fixture.detectChanges();

    // Centro con cualquier periférico = 1.2
    expect(component.factorZona).toBe(1.2);
    expect(component.paquete.pesoReal).toBeNull();
    expect(component.paquete.largo).toBeNull();
  });

  it('cambia el factor de zona a 1.0 si se selecciona un distrito en la misma zona Centro', () => {
    // Lima Cercado ubigeo: '150101' (Zona 2: Centro). Operador en Centro.
    component.direccion.distrito = '150101';
    component.onDistritoChange();
    fixture.detectChanges();

    expect(component.factorZona).toBe(1.0);
  });

  it('mantiene el factor de zona correcto aunque se borren medidas del paquete', () => {
    // 1. Selecciona Callao
    component.direccion.distrito = '070101';
    component.onDistritoChange();
    expect(component.factorZona).toBe(1.2);

    // 2. Coloca medidas
    component.paquete.pesoReal = 3;
    component.paquete.largo = 20;
    component.paquete.ancho = 20;
    component.paquete.alto = 20;
    component.actualizarCotizacion();
    expect(operadorServiceSpy.cotizar).toHaveBeenCalled();

    // 3. Borra una medida
    component.paquete.alto = null;
    component.actualizarCotizacion();

    // El factor de zona debe seguir siendo 1.2 acorde al distrito seleccionado
    expect(component.factorZona).toBe(1.2);
  });

  it('rechaza nombres de vía inválidos o que contengan solo guiones', () => {
    expect(component.nombreViaValido('-')).toBe(false);
    expect(component.nombreViaValido('--')).toBe(false);
    expect(component.nombreViaValido(' - - ')).toBe(false);
    expect(component.nombreViaValido('---')).toBe(false);
    expect(component.nombreViaValido('..')).toBe(false);
    expect(component.nombreViaValido('Av')).toBe(false);

    expect(component.nombreViaValido('Av. Arequipa')).toBe(true);
    expect(component.nombreViaValido('Calle 2')).toBe(true);
    expect(component.nombreViaValido('Sol')).toBe(true);
  });

  it('valida que el punto de entrega en el mapa sea obligatorio y se ubique en Lima/Callao', () => {
    component.punto = null;
    expect(component.puntoMapaValido).toBe(false);
    expect(component.errores['puntoMapa']).toBe(true);

    // Fuera de límites
    component.punto = { lat: 40.7128, lng: -74.0060 }; // New York
    expect(component.puntoMapaValido).toBe(false);

    // Dentro de Lima / Callao
    component.punto = { lat: -12.0464, lng: -77.0428 };
    expect(component.puntoMapaValido).toBe(true);
    expect(component.errores['puntoMapa']).toBe(false);
  });

  it('no permite registrar el paquete si el nombre de vía es "-" o si falta el punto en el mapa', () => {
    operadorServiceSpy.registrarPaquete = vi.fn().mockReturnValue(of({ tracking_id: 'RIVA-TEST-123' }));

    // Configurar campos válidos
    component.remitente = {
      documento: '12345678',
      nombre: 'Remitente Valido',
      celular: '987654321',
      correo: 'remitente@riva.pe',
    };
    component.destinatario = {
      dni: '87654321',
      nombre: 'Destinatario Valido',
      celular: '912345678',
      correo: 'destinatario@riva.pe',
    };
    component.direccion = {
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: '150101',
      tipoVia: 'Av.',
      nombreVia: '-', // Invalido
      numero: '-', // Permitido guion si no hay numero
      manzana: '',
      lote: '',
      referencia: '',
    };
    component.paquete = {
      pesoReal: 2,
      largo: 20,
      ancho: 20,
      alto: 20,
    };
    component.punto = null; // Falta punto

    component.registrarPaquete();

    // No debe llamar al servicio porque el formulario es inválido
    expect(operadorServiceSpy.registrarPaquete).not.toHaveBeenCalled();
    expect(component.errores['nombreVia']).toBe(true);
    expect(component.errores['puntoMapa']).toBe(true);

    // Corregir nombre de vía y marcar punto en el mapa
    component.direccion.nombreVia = 'Av. Los Próceres';
    component.punto = { lat: -12.0464, lng: -77.0428 };

    component.registrarPaquete();

    // Ahora sí debe enviar el registro incluyendo latitud y longitud
    expect(operadorServiceSpy.registrarPaquete).toHaveBeenCalledTimes(1);
    const payload = operadorServiceSpy.registrarPaquete.mock.calls[0][0];
    expect(payload.direccion.nombre_via).toBe('Av. Los Próceres');
    expect(payload.direccion.numero).toBe('-');
    expect(payload.direccion.lat).toBe(-12.0464);
    expect(payload.direccion.lng).toBe(-77.0428);
  });
});
