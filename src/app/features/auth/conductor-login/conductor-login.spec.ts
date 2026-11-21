import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ConductorLogin } from './conductor-login';
import { AuthService } from '../../../core/services/auth';
import { RecaptchaService } from '../../../core/services/recaptcha.service';
import { LoginResponse } from '../../../core/models/auth.models';

describe('ConductorLogin Component', () => {
  let fixture: ComponentFixture<ConductorLogin>;
  let component: ConductorLogin;
  let authServiceSpy: any;
  let router: Router;

  const mockConductorResponse: LoginResponse = {
    token: 'jwt-conductor-token',
    token_type: 'Bearer',
    expires_at: '2026-11-21T12:00:00Z',
    user: {
      id: 5,
      nombres: 'Carlos Conductor',
      correo: 'carlos@riva.pe',
      rol: 'CONDUCTOR',
      debe_cambiar_password: false,
    },
  };

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: vi.fn().mockReturnValue(null),
      isAuthenticated: vi.fn().mockReturnValue(false),
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      cerrarSesion: vi.fn(),
    };

    const recaptchaSpy = {
      render: vi.fn().mockResolvedValue(1),
      getResponse: vi.fn().mockReturnValue(''),
      reset: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ConductorLogin],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: RecaptchaService, useValue: recaptchaSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(ConductorLogin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y tener el contenedor para el botón de Google', () => {
    expect(component).toBeTruthy();
    const googleBtn = fixture.nativeElement.querySelector('#google-btn-conductor');
    expect(googleBtn).not.toBeNull();
  });

  it('inicia sesión con Google exitosamente para rol CONDUCTOR y navega a mis-lotes', () => {
    authServiceSpy.loginWithGoogle.mockReturnValue(of(mockConductorResponse));

    component.iniciarSesionConGoogle('fake-google-id-token');

    expect(authServiceSpy.loginWithGoogle).toHaveBeenCalledWith({ id_token: 'fake-google-id-token' });
    expect(component.cargando).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/conductor/mis-lotes']);
  });

  it('rechaza inicio de sesión con Google si el usuario no es CONDUCTOR', () => {
    const adminResponse: LoginResponse = {
      token: 'jwt-admin-token',
      token_type: 'Bearer',
      expires_at: '2026-11-21T12:00:00Z',
      user: {
        id: 1,
        nombres: 'Admin',
        correo: 'admin@riva.pe',
        rol: 'ADMINISTRADOR',
        debe_cambiar_password: false,
      },
    };
    authServiceSpy.loginWithGoogle.mockReturnValue(of(adminResponse));

    component.iniciarSesionConGoogle('fake-google-id-token');

    expect(authServiceSpy.cerrarSesion).toHaveBeenCalled();
    expect(component.error).toContain('este portal es exclusivo para conductores');
  });

  it('muestra mensaje específico si la cuenta de Google no está registrada', () => {
    const errorResponse = {
      status: 401,
      error: { error: 'cuenta_no_registrada' },
    };
    authServiceSpy.loginWithGoogle.mockReturnValue(throwError(() => errorResponse));

    component.iniciarSesionConGoogle('unregistered-token');

    expect(component.cargando).toBe(false);
    expect(component.error).toBe('Tu cuenta de Google no está registrada en el sistema.');
  });
});
