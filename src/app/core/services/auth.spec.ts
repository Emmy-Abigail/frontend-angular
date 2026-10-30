import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { errorInterceptor } from '../interceptors/error.interceptor';
import { jwtInterceptor } from '../interceptors/jwt.interceptor';
import { UserProfile } from '../models/auth.models';
import { AuthService } from './auth';

describe('AuthService: cambio de contraseña y sesión', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let client: HttpClient;
  const navigate = vi.fn().mockResolvedValue(true);
  const user: UserProfile = {
    id: 7,
    nombres: 'Operador de prueba',
    correo: 'operador@example.test',
    rol: 'OPERADOR',
    debe_cambiar_password: true,
  };
  const sessionUrl = `${environment.apiUrl}/auth/session`;
  const changeUrl = `${environment.apiUrl}/auth/change-password`;
  const changeResponse = {
    message: 'Contraseña actualizada exitosamente',
    token: 'token-renovado',
    token_type: 'Bearer',
    expires_at: '2026-10-30T23:00:00-05:00',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    navigate.mockClear();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('token', 'token-temporal');
    localStorage.setItem('user', JSON.stringify(user));
    sessionStorage.setItem('temp_password', 'Temporal123@');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { url: '/cambiar-contrasena', navigate } },
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    service.stopSessionPolling();
    try {
      http.verify();
    } finally {
      TestBed.resetTestingModule();
      localStorage.clear();
      sessionStorage.clear();
      vi.useRealTimers();
    }
  });

  function changePassword(): void {
    service.changePassword('Temporal123@', 'Nueva123@').subscribe();
    const request = http.expectOne(changeUrl);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-temporal');
    request.flush(changeResponse);
  }

  it('conserva la sesión con el nuevo token y elimina la contraseña temporal', () => {
    changePassword();

    expect(localStorage.getItem('token')).toBe('token-renovado');
    expect(service.token()).toBe('token-renovado');
    expect(service.currentUser()?.debe_cambiar_password).toBe(false);
    expect(JSON.parse(localStorage.getItem('user')!).debe_cambiar_password).toBe(false);
    expect(sessionStorage.getItem('temp_password')).toBeNull();

    vi.advanceTimersByTime(10000);
    const session = http.expectOne(sessionUrl);
    expect(session.request.headers.get('Authorization')).toBe('Bearer token-renovado');
    session.flush(null, { status: 204, statusText: 'No Content' });
    expect(service.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ignora un rechazo tardío de una comprobación iniciada con el token anterior', () => {
    service.checkSessionNow();
    const previousSession = http.expectOne(sessionUrl);
    changePassword();

    previousSession.flush({ message: 'Token inválido' }, { status: 401, statusText: 'Unauthorized' });

    expect(service.token()).toBe('token-renovado');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('cancela el sondeo pendiente del token anterior al renovarlo', () => {
    vi.advanceTimersByTime(10000);
    const previousSession = http.expectOne(sessionUrl);
    changePassword();

    expect(previousSession.cancelled).toBe(true);
    vi.advanceTimersByTime(10000);
    const session = http.expectOne(sessionUrl);
    expect(session.request.headers.get('Authorization')).toBe('Bearer token-renovado');
    session.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('no cierra la sesión si una comprobación anterior falla durante el cambio de contraseña', () => {
    service.checkSessionNow();
    const previousSession = http.expectOne(sessionUrl);
    service.changePassword('Temporal123@', 'Nueva123@').subscribe();
    const change = http.expectOne(changeUrl);

    previousSession.flush({ message: 'Token inválido' }, { status: 401, statusText: 'Unauthorized' });
    expect(service.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();

    change.flush(changeResponse);
    expect(service.token()).toBe('token-renovado');
    service.checkSessionNow();
    const session = http.expectOne(sessionUrl);
    expect(session.request.headers.get('Authorization')).toBe('Bearer token-renovado');
    session.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('no elimina el token renovado por un 401 tardío de otra petición protegida', () => {
    client.get(`${environment.apiUrl}/geography`).subscribe({ error: () => {} });
    const previousRequest = http.expectOne(`${environment.apiUrl}/geography`);
    changePassword();

    previousRequest.flush({ message: 'Token inválido' }, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('token')).toBe('token-renovado');
    expect(service.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('indica sesión expirada sin marcar la cuenta como desactivada', () => {
    service.checkSessionNow();
    http.expectOne(sessionUrl).flush(
      { message: 'Token inválido' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login/operador'], {
      queryParams: { sessionExpired: 'true' },
    });
  });

  it('identifica una cuenta inactiva en la respuesta del sondeo', () => {
    vi.advanceTimersByTime(10000);
    http.expectOne(sessionUrl).flush(
      { message: 'Usuario inactivo o inexistente' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(service.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login/operador'], {
      queryParams: { desactivado: 'true' },
    });
  });

  it('mantiene la sesión y sus datos si el cambio de contraseña es rechazado', () => {
    service.changePassword('Temporal123@', 'débil').subscribe({ error: () => {} });
    http.expectOne(changeUrl).flush(
      { error: 'password_invalida' },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(service.token()).toBe('token-temporal');
    expect(service.currentUser()?.debe_cambiar_password).toBe(true);
    expect(sessionStorage.getItem('temp_password')).toBe('Temporal123@');
    expect(navigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10000);
    const session = http.expectOne(sessionUrl);
    expect(session.request.headers.get('Authorization')).toBe('Bearer token-temporal');
    session.flush(null, { status: 204, statusText: 'No Content' });
  });
});
