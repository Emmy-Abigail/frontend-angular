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

  it('ofrece el motivo Otros y exige descripcion propia de al menos 5 caracteres', () => {
    cargarLote();
    http.expectOne('/api/v1/packages/7').flush(detalle);
    fixture.detectChanges();

    const motivos = fixture.componentInstance.motivosFallo.map(m => m.label);
    expect(motivos).toContain('Otros');

    fixture.componentInstance.estadoLote = 'EN RUTA';
    fixture.componentInstance.registrarFallido();
    fixture.detectChanges();

    // Seleccionar motivo normal
    fixture.componentInstance.seleccionarMotivoFallo('Cliente ausente');
    fixture.componentInstance.observacionFallo = 'No contestó el timbre';
    expect(fixture.componentInstance.puedeConfirmarFallo).toBe(true);

    // Seleccionar motivo Otros
    fixture.componentInstance.seleccionarMotivoFallo('Otros');
    expect(fixture.componentInstance.esMotivoOtro).toBe(true);
    expect(fixture.componentInstance.puedeConfirmarFallo).toBe(false);

    // Motivo corto (< 5 chars)
    fixture.componentInstance.motivoOtro = 'Zona';
    expect(fixture.componentInstance.puedeConfirmarFallo).toBe(false);

    // Motivo válido (>= 5 chars)
    fixture.componentInstance.motivoOtro = 'Edificio en mantenimiento';
    expect(fixture.componentInstance.puedeConfirmarFallo).toBe(true);

    // Confirmar fallo y verificar llamada a la API
    fixture.componentInstance.confirmarFalloDefinitivo();
    const req = http.expectOne('/api/v1/packages/7/final-status');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    const body = req.request.body as FormData;
    expect(body.get('estado')).toBe('FALLIDO');
    expect(body.get('id_motivo')).toBe('4');
    expect(body.get('motivo_otro')).toBe('Edificio en mantenimiento');
    expect(body.get('observacion')).toBe('No contestó el timbre');
    req.flush({ ok: true });
  });

  it('no muestra los formularios ni acciones de entrega si el paquete ya esta finalizado', () => {
    cargarLote();
    http.expectOne('/api/v1/packages/7').flush({
      ...detalle,
      estado: { codigo: 'ENTREGADO' },
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.estaFinalizado).toBe(true);
    expect(fixture.nativeElement.querySelector('.tarjeta-estado-finalizado')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.boton-fallido')).toBeNull();
  });
});
