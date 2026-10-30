import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { DetallePaquete } from './detalle-paquete';

describe('Reasignación desde el detalle del paquete', () => {
  let fixture: ComponentFixture<DetallePaquete>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.fn>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    navigate = vi.fn().mockResolvedValue(true);
    params = new BehaviorSubject(convertToParamMap({ tracking: '13' }));
    await TestBed.configureTestingModule({
      imports: [DetallePaquete],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetallePaquete);
    http.expectOne('/api/v1/packages/13').flush({
      id: 13,
      tracking_id: 'ORIGINAL13',
      estado: { codigo: 'FALLIDO' },
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function boton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.btn-reassign');
  }

  it('llama al reintento una sola vez y abre el paquete nuevo después de crearlo', () => {
    boton().click();
    fixture.detectChanges();
    fixture.componentInstance.reasignarPaquete();

    const request = http.expectOne('/api/v1/packages/13/retry');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    expect(boton().disabled).toBe(true);
    expect(boton().textContent).toContain('Reasignando');
    expect(navigate).not.toHaveBeenCalled();

    request.flush({ id: 20, tracking_id: 'NUEVO20', estado: 'EN_ALMACEN', id_paquete_origen: 13 });
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(['/operador/consulta-paquetes', 20]);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('NUEVO20');
    expect(fixture.componentInstance.reasignando).toBe(false);
    fixture.componentInstance.reasignarPaquete();
    http.expectNone('/api/v1/packages/13/retry');

    params.next(convertToParamMap({ tracking: '20' }));
    http.expectOne('/api/v1/packages/20').flush({
      id: 20,
      tracking_id: 'NUEVO20',
      estado: { codigo: 'EN_ALMACEN' },
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.paquete?.id).toBe(20);
    expect(boton()).toBeNull();
  });

  it('muestra el error del backend y mantiene el detalle sin navegar', () => {
    boton().click();
    http.expectOne('/api/v1/packages/13/retry').flush(
      { message: 'Este envio ya alcanzo el maximo de 3 reintentos' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('maximo de 3 reintentos');
    expect(boton().disabled).toBe(false);
    expect(fixture.componentInstance.paquete?.id).toBe(13);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('permite volver a intentar tras un fallo de red y limpia el error anterior', () => {
    boton().click();
    http.expectOne('/api/v1/packages/13/retry').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('No se pudo reasignar');

    boton().click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    http.expectOne('/api/v1/packages/13/retry').flush(
      { message: 'Servicio de asignacion no disponible' },
      { status: 503, statusText: 'Service Unavailable' },
    );
  });

  it('no ofrece ni ejecuta el reintento para un paquete que no está fallido', () => {
    params.next(convertToParamMap({ tracking: '14' }));
    http.expectOne('/api/v1/packages/14').flush({
      id: 14,
      tracking_id: 'ENTREGADO14',
      estado: { codigo: 'ENTREGADO' },
    });
    fixture.detectChanges();
    expect(boton()).toBeNull();
    fixture.componentInstance.reasignarPaquete();
    http.expectNone('/api/v1/packages/14/retry');
  });
});
