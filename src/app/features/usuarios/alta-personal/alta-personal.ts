import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Sede, VehicleType } from '../../../core/models/catalog.models';
import { CreateUserResponse } from '../../../core/models/user.models';
import { CatalogService } from '../../../core/services/catalog.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  selector: 'app-alta-personal',
  styleUrl: './alta-personal.css',
  templateUrl: './alta-personal.html',
})
export class AltaPersonal implements OnInit {
  private catalogService = inject(CatalogService);
  private userService = inject(UserService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  nombres = '';
  dni = '';
  telefono = '';
  correo = '';
  rol: 'OPERADOR' | 'CONDUCTOR' = 'OPERADOR';
  id_sede: number | null = null;
  id_tipo_vehiculo: number | null = null;
  placa = '';

  sedes: Sede[] = [];
  vehicleTypes: VehicleType[] = [];
  cargandoCatalogos = false;
  guardando = false;
  errorMsg = '';

  usuarioCreado: CreateUserResponse | null = null;
  copiado = false;

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  cargarCatalogos(): void {
    this.cargandoCatalogos = true;
    this.cdr.markForCheck();

    this.catalogService.getSedes().subscribe({
      next: (sedes) => {
        this.sedes = sedes;
        if (this.sedes.length > 0 && !this.id_sede) {
          this.id_sede = this.sedes[0].id;
        }
        this.cargandoCatalogos = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoCatalogos = false;
        this.errorMsg = 'Error al cargar el catálogo de sedes.';
        this.cdr.markForCheck();
      },
    });

    this.catalogService.getVehicleTypes().subscribe({
      next: (types) => {
        this.vehicleTypes = types;
        if (this.vehicleTypes.length > 0 && !this.id_tipo_vehiculo) {
          this.id_tipo_vehiculo = this.vehicleTypes[0].id;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      },
    });
  }

  onDniInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 8);
    this.dni = input.value;
  }

  onTelefonoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 9);
    this.telefono = input.value;
  }

  onRolChange(): void {
    this.errorMsg = '';
    if (this.rol === 'OPERADOR') {
      this.id_tipo_vehiculo = null;
      if (this.sedes.length > 0 && !this.id_sede) {
        this.id_sede = this.sedes[0].id;
      }
    } else {
      this.id_sede = null;
      if (this.vehicleTypes.length > 0 && !this.id_tipo_vehiculo) {
        this.id_tipo_vehiculo = this.vehicleTypes[0].id;
      }
    }
    this.cdr.markForCheck();
  }

  guardar(): void {
    this.errorMsg = '';

    if (!this.nombres.trim()) {
      this.errorMsg = 'El nombre completo es obligatorio.';
      this.cdr.markForCheck();
      return;
    }

    if (!/^\d{8}$/.test(this.dni.trim())) {
      this.errorMsg = 'El DNI debe tener exactamente 8 dígitos numéricos.';
      this.cdr.markForCheck();
      return;
    }

    if (this.telefono.trim()) {
      if (!/^\d{9}$/.test(this.telefono.trim())) {
        this.errorMsg = 'El número de celular debe tener exactamente 9 dígitos numéricos (sin letras ni código +51).';
        this.cdr.markForCheck();
        return;
      }
    }

    if (!this.correo.trim()) {
      this.errorMsg = 'El correo electrónico es obligatorio.';
      this.cdr.markForCheck();
      return;
    }

    if (this.rol === 'OPERADOR' && !this.id_sede) {
      this.errorMsg = 'Debe seleccionar una sede para el operador.';
      this.cdr.markForCheck();
      return;
    }

    if (this.rol === 'CONDUCTOR' && !this.id_tipo_vehiculo) {
      this.errorMsg = 'Debe seleccionar un tipo de vehículo para el conductor.';
      this.cdr.markForCheck();
      return;
    }

    if (this.rol === 'CONDUCTOR' && !this.placa.trim()) {
      this.errorMsg = 'La placa es obligatoria para el conductor.';
      this.cdr.markForCheck();
      return;
    }

    this.guardando = true;
    this.cdr.markForCheck();

    this.userService
      .createUser({
        nombres: this.nombres.trim(),
        dni: this.dni.trim(),
        correo: this.correo.trim().toLowerCase(),
        telefono: this.telefono.trim() ? this.telefono.trim() : null,
        rol: this.rol,
        id_sede: this.rol === 'OPERADOR' ? Number(this.id_sede) : null,
        id_tipo_vehiculo:
          this.rol === 'CONDUCTOR' ? Number(this.id_tipo_vehiculo) : null,
        placa: this.rol === 'CONDUCTOR' ? this.placa.trim() : null,
      })
      .subscribe({
        next: (res) => {
          this.guardando = false;
          this.usuarioCreado = res;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.guardando = false;
          if (err.status === 409) {
            this.errorMsg = err.error?.message || 'Ya existe un usuario con este correo o DNI.';
          } else if (err.status === 422) {
            this.errorMsg = err.error?.message || 'Los datos proporcionados no son válidos.';
          } else {
            this.errorMsg = 'Error al registrar personal. Verifique la conexión con el servidor.';
          }
          this.cdr.markForCheck();
        },
      });
  }

  copiarContrasena(): void {
    if (!this.usuarioCreado?.password_temporal) return;
    navigator.clipboard.writeText(this.usuarioCreado.password_temporal).then(() => {
      this.copiado = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.copiado = false;
        this.cdr.markForCheck();
      }, 2500);
    });
  }

  irALista(): void {
    this.router.navigate(['/admin/usuarios']);
  }
}

