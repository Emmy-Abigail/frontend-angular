import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  selector: 'app-recuperar-password',
  styleUrl: './recuperar-password.css',
  templateUrl: './recuperar-password.html',
})
export class RecuperarPassword implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  correo = '';
  enviado = false;
  cargando = false;
  errorMsg = '';

  // De qué login vino (admin, conductor u operador), para poder regresar al correcto.
  origenRol: 'admin' | 'conductor' | 'operador' = 'admin';

  get loginOrigenPath(): string {
    if (this.origenRol === 'conductor') return '/login/conductor';
    if (this.origenRol === 'operador') return '/login/operador';
    return '/login/admin';
  }

  ngOnInit(): void {
    const origenParam = this.route.snapshot.queryParamMap.get('origen');
    const ultimoLogin = sessionStorage.getItem('ultimo_login');
    const origen = origenParam || ultimoLogin;

    if (origen === 'conductor' || origen === 'operador' || origen === 'admin') {
      this.origenRol = origen as 'admin' | 'conductor' | 'operador';
    }
    sessionStorage.setItem('ultimo_login', this.origenRol);
  }

  solicitarRecuperacion(): void {
    if (!this.correo.trim() || !this.correo.includes('@')) {
      this.errorMsg = 'Ingrese un correo electrónico válido.';
      return;
    }

    this.cargando = true;
    this.errorMsg = '';
    this.cdr.markForCheck();

    this.authService.requestPasswordReset(this.correo.trim().toLowerCase()).subscribe({
      next: () => {
        this.cargando = false;
        this.enviado = true;
        this.cdr.markForCheck();
      },
      error: () => {
        // Por seguridad y según diagrama F3, siempre se muestra la pantalla de solicitud enviada (202)
        this.cargando = false;
        this.enviado = true;
        this.cdr.markForCheck();
      },
    });
  }

  reenviarCorreo(): void {
    this.solicitarRecuperacion();
  }

  volverAlLogin(): void {
    this.router.navigate([this.loginOrigenPath]);
  }
}
