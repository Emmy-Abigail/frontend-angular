import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { DetallePaqueteConductor } from './detalle-paquete-conductor';

describe('Especificaciones del paquete del conductor', () => {
  let fixture: ComponentFixture<DetallePaqueteConductor>;
  let http: HttpTestingController;
  let route: { snapshot: { paramMap: ReturnType<typeof convertToParamMap>; queryParamMap: ReturnType<typeof convertToParamMap> } };

  const parada = {
    orden: 1,
    id_paquete: 7,
    tracking_id: 'PAQUETE7',
    estado: 'ASIGNADO',
    destinatario: { nombres: 'Destinatario de prueba', celular: '900000007' },
    direccion: { tipo_via: 'Av.', nombre_via: 'Prueba', numero: '3' },
    distrito: { nombre: 'San Martín de Porres' },
    coordenadas: { lat: -12.01, lng: -77.05 },
  };

  const detalle = {
    id: 7,
    tracking_id: 'PAQUETE7',
    estado: { codigo: 'ASIGNADO' },
    destinatario: parada.destinatario,
    direccion: { ...parada.direccion, distrito: parada.distrito.nombre, coordenadas: parada.coordenadas },
    medidas: { peso_kg: 5.25, largo_cm: 40.5, ancho_cm: 30, alto_cm: 20 },
  };

  beforeEach(async () => {
    route = { snapshot: {
      paramMap: convertToParamMap({ id: '5', numero: '1' }),
      queryParamMap: convertToParamMap({ paqueteId: '7' }),
    } };
    await TestBed.configureTestingModule({
      imports: [DetallePaqueteConductor],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: route },
        { provide: Location, useValue: { back: vi.fn() } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function cargarLote(paradas = [parada]): void {
    fixture = TestBed.createComponent(DetallePaqueteConductor);
    fixture.detectChanges();
    http.expectOne('/api/v1/failure-reasons').flush({ data: [] });
    http.expectOne('/api/v1/batches/5').flush({ id: 5, estado: 'ASIGNADO', paradas });
  }

  function especificaciones(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.valor-especificacion'))
      .map((element: any) => element.textContent.trim());
  }

  it('consulta el paquete completo y muestra sus medidas reales aunque la parada no las incluya', () => {
    cargarLote();
    const request = http.expectOne('/api/v1/packages/7');
    expect(request.request.method).toBe('GET');
    request.flush(detalle);
    fixture.detectChanges();

    expect(especificaciones()).toEqual(['5.25 kg', '40.5 × 30 × 20 cm']);
    expect(fixture.componentInstance.paquete.id).toBe(7);
    expect(fixture.componentInstance.paquete.telefono).toBe('900000007');
    expect(fixture.componentInstance.getGoogleMapsUrl('')).toContain('-12.01,-77.05');
    http.expectNone('/api/v1/packages/1');
  });

  it('obtiene el ID de la parada cuando no se recibió en la URL', () => {
    route.snapshot.queryParamMap = convertToParamMap({});
    cargarLote();
    http.expectOne('/api/v1/packages/7').flush(detalle);
    fixture.detectChanges();

    expect(especificaciones()).toEqual(['5.25 kg', '40.5 × 30 × 20 cm']);
    expect(fixture.componentInstance.paqueteId).toBe(7);
  });

  it('prioriza el ID del paquete sobre un número de parada que corresponde a otro paquete', () => {
    cargarLote([
      { ...parada, id_paquete: 8, tracking_id: 'OTRO8' },
      { ...parada, orden: 2 },
    ]);
    http.expectOne('/api/v1/packages/7').flush(detalle);
    http.expectNone('/api/v1/packages/8');
    fixture.detectChanges();

    expect(fixture.componentInstance.paquete.tracking).toBe('PAQUETE7');
    expect(fixture.componentInstance.numeroParada).toBe(2);
  });

  it.each([
    undefined,
    { peso_kg: null, largo_cm: null, ancho_cm: null, alto_cm: null },
    { largo_cm: 40, ancho_cm: 30 },
  ])('indica que las medidas no están disponibles si faltan datos (%j)', (medidas) => {
    cargarLote();
    http.expectOne('/api/v1/packages/7').flush({ ...detalle, medidas });
    fixture.detectChanges();

    expect(especificaciones()).toEqual(['No disponible', 'No disponible']);
  });

  it('conserva los datos de la parada y no inventa medidas si falla la consulta del paquete', () => {
    cargarLote();
    http.expectOne('/api/v1/packages/7').flush(
      { message: 'Servicio no disponible' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.paquete.tracking).toBe('PAQUETE7');
    expect(fixture.componentInstance.paquete.id).toBe(7);
    expect(especificaciones()).toEqual(['No disponible', 'No disponible']);
  });
});
