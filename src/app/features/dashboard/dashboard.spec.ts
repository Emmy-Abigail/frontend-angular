import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';
import { AuthService } from '../../core/services/auth';
import { UserProfile } from '../../core/models/auth.models';
import { DashboardMetrics } from '../../core/models/dashboard.models';

describe('Dashboard Component (Admin y Operador)', () => {
  let fixture: ComponentFixture<Dashboard>;
  let component: Dashboard;
  let http: HttpTestingController;

  const mockAdminUser: UserProfile = {
    id: 1,
    nombres: 'Administrador Demo',
    correo: 'admin@riva.pe',
    rol: 'ADMINISTRADOR',
  };

  const mockOperadorUser: UserProfile = {
    id: 2,
    nombres: 'Ana Torres',
    correo: 'ana.torres@riva.pe',
    rol: 'OPERADOR',
    sede: { id: 2, nombre: 'Sede Sur' },
  };

  const mockMetricsData: DashboardMetrics = {
    kpis: {
      paquetes_registrados: 298,
      entregas_exitosas_pct: 93.9,
      entregas_exitosas_qty: 247,
      finalizados_qty: 263,
      tiempo_promedio_horas: 29.8,
    },
    flujo_paquetes: {
      total: 298,
      en_almacen: { cantidad: 14, porcentaje: 4.7 },
      asignado: { cantidad: 9, porcentaje: 3.0 },
      en_ruta: { cantidad: 12, porcentaje: 4.0 },
      entregado: { cantidad: 247, porcentaje: 82.9 },
      fallido: { cantidad: 16, porcentaje: 5.4 },
    },
    fallidos_motivo: {
      total_fallidos: 16,
      motivos: [
        { motivo: 'Dirección errónea', cantidad: 9, porcentaje: 56.25 },
        { motivo: 'Cliente ausente', cantidad: 5, porcentaje: 31.25 },
        { motivo: 'Rechazado', cantidad: 2, porcentaje: 12.5 },
        { motivo: 'Otros', cantidad: 0, porcentaje: 0 },
      ],
      direcciones_corregidas: {
        total_fallidos_direccion: 9,
        reintentados: 6,
        entregados: 5,
      },
      ultimos_fallidos: [
        { id_paquete: 101, tracking_id: 'T9QX4HB7LC', destino: 'Barranco', motivo: 'Cliente ausente', fecha: '20/10' },
        { id_paquete: 102, tracking_id: 'G7HD2K9QWE', destino: 'Chorrillos', motivo: 'Dirección errónea', fecha: '18/10' },
        { id_paquete: 103, tracking_id: 'Z2MK5BV8JA', destino: 'San Isidro', motivo: 'Dirección errónea', fecha: '16/10' },
      ],
    },
    top_conductores: {
      todos: [
        { id_conductor: 11, nombre: 'Luis Ramos', tipo_vehiculo: 'MOTORIZADO', tipo_vehiculo_label: 'Motorizado', placa: 'ABC-123', entregas_qty: 61 },
        { id_conductor: 12, nombre: 'Carlos Huamán', tipo_vehiculo: 'MOTORIZADO', tipo_vehiculo_label: 'Motorizado', placa: 'KLM-321', entregas_qty: 58 },
        { id_conductor: 13, nombre: 'Pedro Quispe', tipo_vehiculo: 'MOTORIZADO', tipo_vehiculo_label: 'Motorizado', placa: 'XYZ-456', entregas_qty: 49 },
        { id_conductor: 14, nombre: 'Miguel Paredes', tipo_vehiculo: 'AUTO', tipo_vehiculo_label: 'Auto', placa: 'BCD-482', entregas_qty: 44 },
        { id_conductor: 15, nombre: 'Juan Soto', tipo_vehiculo: 'CAMION', tipo_vehiculo_label: 'Camión', placa: 'DEF-789', entregas_qty: 35 },
      ],
      motorizado: [
        { id_conductor: 11, nombre: 'Luis Ramos', tipo_vehiculo: 'MOTORIZADO', tipo_vehiculo_label: 'Motorizado', placa: 'ABC-123', entregas_qty: 61 },
        { id_conductor: 12, nombre: 'Carlos Huamán', tipo_vehiculo: 'MOTORIZADO', tipo_vehiculo_label: 'Motorizado', placa: 'KLM-321', entregas_qty: 58 },
      ],
      auto: [
        { id_conductor: 14, nombre: 'Miguel Paredes', tipo_vehiculo: 'AUTO', tipo_vehiculo_label: 'Auto', placa: 'BCD-482', entregas_qty: 44 },
      ],
      camion: [
        { id_conductor: 15, nombre: 'Juan Soto', tipo_vehiculo: 'CAMION', tipo_vehiculo_label: 'Camión', placa: 'DEF-789', entregas_qty: 35 },
      ],
    },
    entregas_vehiculo: {
      total: 247,
      motorizado: { cantidad: 168, porcentaje: 68.0 },
      auto: { cantidad: 44, porcentaje: 17.8 },
      camion: { cantidad: 35, porcentaje: 14.2 },
    },
    ranking_sedes: [
      { id_sede: 1, nombre_sede: 'Sede Norte', paquetes_registrados: 400, entregas_exitosas_pct: 95.0, fallidos_qty: 20, tiempo_promedio_horas: 28.0, es_mas_baja: false },
      { id_sede: 2, nombre_sede: 'Sede Sur', paquetes_registrados: 298, entregas_exitosas_pct: 93.9, fallidos_qty: 16, tiempo_promedio_horas: 29.8, es_mas_baja: false },
      { id_sede: 3, nombre_sede: 'Sede Centro', paquetes_registrados: 300, entregas_exitosas_pct: 92.0, fallidos_qty: 24, tiempo_promedio_horas: 33.1, es_mas_baja: false },
      { id_sede: 4, nombre_sede: 'Sede Este', paquetes_registrados: 214, entregas_exitosas_pct: 90.7, fallidos_qty: 22, tiempo_promedio_horas: 35.4, es_mas_baja: true },
    ],
    operadores: [
      { id_usuario: 21, nombre: 'Lucía Vega', sede: 'Sede Sur', registrados: 158, bien_registrados_pct: 97.5, errores_direccion_qty: 4, entregas_exitosas_pct: 93.8, tiempo_asignacion_horas: 5.1 },
      { id_usuario: 22, nombre: 'Ana Torres', sede: 'Sede Sur', registrados: 120, bien_registrados_pct: 98.3, errores_direccion_qty: 2, entregas_exitosas_pct: 94.4, tiempo_asignacion_horas: 6.2 },
    ],
    desempeno_operador: {
      registrados: 120,
      bien_registrados_pct: 98.3,
      errores_direccion_qty: 2,
      entregas_exitosas_pct: 94.4,
      tiempo_asignacion_horas: 6.2,
    },
    sede: { id: 2, nombre: 'Sede Sur' },
  };

  async function setupComponent(user: UserProfile = mockAdminUser) {
    const userSignal = signal<UserProfile | null>(user);
    const roleSignal = signal<UserProfile['rol'] | null>(user.rol);
    const authServiceMock: Partial<AuthService> = {
      currentUser: userSignal as any,
      userRole: roleSignal as any,
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
  }

  afterEach(() => {
    http.verify();
  });

  it('debe crearse correctamente e inicializar el período en ESTE_MES', async () => {
    await setupComponent(mockAdminUser);
    fixture.detectChanges();

    // Expect sedes call for admin
    const reqSedes = http.expectOne('/api/v1/sedes');
    reqSedes.flush({ data: [{ id: 1, nombre: 'Sede Norte' }, { id: 2, nombre: 'Sede Sur' }] });

    // Expect initial metrics request
    const reqMetrics = http.expectOne((req) => req.url === '/api/v1/dashboard/metrics');
    expect(reqMetrics.request.params.get('desde')).toBeTruthy();
    expect(reqMetrics.request.params.get('hasta')).toBeTruthy();
    reqMetrics.flush({ data: mockMetricsData });

    expect(component).toBeTruthy();
    expect(component.periodoSeleccionado).toBe('ESTE_MES');
    expect(component.metricas).toEqual(mockMetricsData);
  });

  it('muestra estado de error cuando el rango de fechas es inválido (desde > hasta)', async () => {
    await setupComponent(mockAdminUser);
    fixture.detectChanges();

    http.expectOne('/api/v1/sedes').flush({ data: [] });
    http.expectOne((req) => req.url === '/api/v1/dashboard/metrics').flush({ data: mockMetricsData });

    component.desde = '2026-10-31';
    component.hasta = '2026-10-01';
    component.consultarMetricas();
    fixture.detectChanges();

    expect(component.esRangoInvalido).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.state-card-error')).not.toBeNull();
    expect(compiled.textContent).toContain('El rango de fechas no es válido');
    expect(compiled.textContent).toContain('La fecha de inicio debe ser anterior a la fecha final');
  });

  it('muestra estado vacío cuando paquetes_registrados es 0', async () => {
    await setupComponent(mockAdminUser);
    fixture.detectChanges();

    http.expectOne('/api/v1/sedes').flush({ data: [] });
    const req = http.expectOne((req) => req.url === '/api/v1/dashboard/metrics');
    const emptyMetrics: DashboardMetrics = {
      ...mockMetricsData,
      kpis: {
        paquetes_registrados: 0,
        entregas_exitosas_pct: null,
        entregas_exitosas_qty: 0,
        finalizados_qty: 0,
        tiempo_promedio_horas: null,
      },
    };
    req.flush({ data: emptyMetrics });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.state-card-empty')).not.toBeNull();
    expect(compiled.textContent).toContain('No hay envíos en este período');
    expect(compiled.querySelector('.btn-shortcut')).not.toBeNull();
  });

  it('renderiza correctamente las métricas con datos y permite filtrar conductores por vehículo', async () => {
    await setupComponent(mockOperadorUser);
    fixture.detectChanges();

    // Operador does not request /sedes, directly requests metrics with id_sede
    const req = http.expectOne((req) => req.url === '/api/v1/dashboard/metrics');
    expect(req.request.params.get('id_sede')).toBe('2');
    req.flush({ data: mockMetricsData });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('298');
    expect(compiled.textContent).toContain('93.9%');
    expect(compiled.textContent).toContain('29.8 h');
    expect(compiled.textContent).toContain('Flujo de paquetes');
    expect(compiled.textContent).toContain('Fallidos por motivo');
    expect(compiled.textContent).toContain('Tu desempeño');

    // Cambiar tab de conductores a MOTORIZADO
    component.cambiarTabVehiculo('MOTORIZADO');
    fixture.detectChanges();
    expect(component.conductoresFiltrados.length).toBe(2);
    expect(component.conductoresFiltrados[0].nombre).toBe('Luis Ramos');
  });

  it('permite abrir y paginar el modal de entregas fallidas para Operador', async () => {
    await setupComponent(mockOperadorUser);
    fixture.detectChanges();

    http.expectOne((req) => req.url === '/api/v1/dashboard/metrics').flush({ data: mockMetricsData });
    fixture.detectChanges();

    component.abrirModalFallidos();
    expect(component.modalFallidosAbierto).toBe(true);

    const reqModal = http.expectOne((req) => req.url === '/api/v1/dashboard/failed-deliveries');
    expect(reqModal.request.params.get('page')).toBe('1');
    expect(reqModal.request.params.get('per_page')).toBe('8');
    reqModal.flush({
      data: [
        { id: 101, tracking_id: 'T9QX4HB7LC', destino: 'Barranco', motivo: 'Cliente ausente', fecha_fallo: '20/10/2026 15:42' },
        { id: 102, tracking_id: 'G7HD2K9QWE', destino: 'Chorrillos', motivo: 'Dirección errónea', fecha_fallo: '18/10/2026 11:20' },
      ],
      meta: { total: 16, page: 1, per_page: 8, total_pages: 2 },
    });
    fixture.detectChanges();

    expect(component.fallidosList.length).toBe(2);
    expect(component.fallidosTotal).toBe(16);

    component.cerrarModalFallidos();
    expect(component.modalFallidosAbierto).toBe(false);
  });

  it('en vista Admin renderiza ranking de sedes y tabla de operadores', async () => {
    await setupComponent(mockAdminUser);
    fixture.detectChanges();

    http.expectOne('/api/v1/sedes').flush({ data: [{ id: 1, nombre: 'Sede Norte' }] });
    http.expectOne((req) => req.url === '/api/v1/dashboard/metrics').flush({ data: mockMetricsData });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.ranking-sedes-card')).not.toBeNull();
    expect(compiled.querySelector('.operadores-card')).not.toBeNull();

    // Toggle sede más baja
    const checkbox = compiled.querySelector('.toggle-mas-baja input') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.badge-mas-baja')).not.toBeNull();

    // Buscador de operadores
    component.busquedaOperador = 'Lucía';
    fixture.detectChanges();
    expect(component.operadoresFiltrados.length).toBe(1);
    expect(component.operadoresFiltrados[0].nombre).toBe('Lucía Vega');
  });
});
