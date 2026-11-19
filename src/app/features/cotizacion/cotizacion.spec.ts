import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Cotizacion } from './cotizacion';
import { CatalogService } from '../../core/services/catalog.service';
import { PublicQuoteService } from '../../core/services/public-quote.service';
import { of, throwError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

describe('Cotizacion Component', () => {
  let component: Cotizacion;
  let fixture: ComponentFixture<Cotizacion>;
  let mockCatalogService: Partial<CatalogService>;
  let mockPublicQuoteService: Partial<PublicQuoteService>;

  const sedesMock = [
    {
      id: 1,
      nombre: 'Sede Norte',
      id_zona: 1,
      ubigeo_distrito: '150117',
      distrito: 'Los Olivos',
      direccion: 'Av. Carlos Izaguirre',
      lat: -11.99,
      lng: -77.07,
      activa: true,
    },
    {
      id: 2,
      nombre: 'Sede Centro',
      id_zona: 2,
      ubigeo_distrito: '150113',
      distrito: 'Jesús María',
      direccion: 'Av. Brasil',
      lat: -12.07,
      lng: -77.04,
      activa: true,
    },
  ];

  const geografiaMock = [
    {
      ubigeo: '150000',
      nombre: 'Lima',
      provincias: [
        {
          ubigeo: '150100',
          nombre: 'Lima',
          distritos: [
            {
              ubigeo: '150101',
              nombre: 'Lima',
              nombre_mostrado: 'Cercado de Lima',
              id_zona: 2,
              activo: true,
            },
            {
              ubigeo: '150117',
              nombre: 'Los Olivos',
              nombre_mostrado: 'Los Olivos',
              id_zona: 1,
              activo: true,
            },
          ],
        },
      ],
    },
  ];

  beforeEach(async () => {
    mockCatalogService = {
      getPublicSedes: vi.fn().mockReturnValue(of(sedesMock)),
      getPublicGeography: vi.fn().mockReturnValue(of(geografiaMock)),
    };

    mockPublicQuoteService = {
      cotizar: vi.fn().mockReturnValue(
        of({
          peso_volumetrico_kg: 5,
          peso_facturable_kg: 5,
          zona_origen: 'NORTE',
          zona_destino: 'CENTRO',
          factor: 1.0,
          tarifa_base_kg: 7.5,
          monto: '37.50',
          sede_origen: { id: 1, nombre: 'Sede Norte' },
        })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [Cotizacion],
      providers: [
        { provide: CatalogService, useValue: mockCatalogService },
        { provide: PublicQuoteService, useValue: mockPublicQuoteService },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Cotizacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y cargar sedes y distritos públicos', () => {
    expect(component).toBeTruthy();
    expect(component.sedes.length).toBe(2);
    expect(component.distritos.length).toBe(2);
    expect(component.catalogosCargados).toBe(true);
  });

  it('exige seleccionar la sede donde dejar el paquete', () => {
    component.idSede = '';
    component.destino = '150101';
    component.peso = 5;
    component.largo = 30;
    component.ancho = 20;
    component.alto = 15;

    component.calcularCotizacion();

    expect(component.mostrarError('idSede')).toBe(true);
    expect(mockPublicQuoteService.cotizar).not.toHaveBeenCalled();
    expect(component.error).toBe('Revisa los campos indicados antes de continuar.');
  });

  it('envía id_sede y calcula la cotización exitosamente', () => {
    component.idSede = 1;
    component.destino = '150101';
    component.peso = 5;
    component.largo = 30;
    component.ancho = 20;
    component.alto = 15;

    component.calcularCotizacion();

    expect(mockPublicQuoteService.cotizar).toHaveBeenCalledWith({
      id_sede: 1,
      ubigeo_destino: '150101',
      peso_kg: 5,
      largo_cm: 30,
      ancho_cm: 20,
      alto_cm: 15,
    });

    expect(component.resultado).toBeTruthy();
    expect(component.montoFormateado).toBe('37.50');
    expect(component.error).toBe('');
  });
});
