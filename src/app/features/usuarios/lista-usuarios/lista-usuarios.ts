import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Sede } from '../../../core/models/catalog.models';
import { UserListItem } from '../../../core/models/user.models';
import { CatalogService } from '../../../core/services/catalog.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  selector: 'app-lista-usuarios',
  styleUrl: './lista-usuarios.css',
  templateUrl: './lista-usuarios.html',
})
export class ListaUsuarios implements OnInit {
  private userService = inject(UserService);
  private catalogService = inject(CatalogService);
  private cdr = inject(ChangeDetectorRef);

  usuarios: UserListItem[] = [];
  sedes: Sede[] = [];
  cargando = false;
  cambiandoEstadoId: number | null = null;
  mensaje = '';

  filtroRol: string = 'Todos';
  filtroEstado: string = 'Todos';

  // Modal de confirmación para desactivar usuario (Visily Pantalla 13)
  usuarioADesactivar: UserListItem | null = null;

  ngOnInit(): void {
    this.cargarSedes();
    this.cargarUsuarios();
  }

  cargarSedes(): void {
    this.catalogService.getSedes().subscribe({
      next: (sedes) => {
        this.sedes = sedes;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  cargarUsuarios(): void {
    this.cargando = true;
    this.mensaje = '';
    this.cdr.markForCheck();

    const rolParam = this.filtroRol === 'Todos' ? undefined : this.filtroRol;

    this.userService.getUsers(rolParam).subscribe({
      next: (data) => {
        this.cargando = false;
        // Filtrar administradores de la tabla de personal operativo
        const personal = (data || []).filter((u) => u.rol !== 'ADMINISTRADOR');
        this.usuarios = personal;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        this.usuarios = [];
        this.mensaje = 'Error al cargar usuarios desde el servidor.';
        this.cdr.markForCheck();
      },
    });
  }

  get usuariosFiltrados(): UserListItem[] {
    return this.usuarios.filter((u) => {
      // Filtro Rol
      if (this.filtroRol !== 'Todos' && u.rol !== this.filtroRol) {
        return false;
      }
      // Filtro Estado
      if (this.filtroEstado === 'Activo' && !u.activo) {
        return false;
      }
      if (this.filtroEstado === 'Inactivo' && u.activo) {
        return false;
      }
      return true;
    });
  }

  solicitarCambioEstado(user: UserListItem): void {
    if (user.activo) {
      // Si está activo, abrir el modal de confirmación de desactivar (Pantalla 13)
      this.usuarioADesactivar = user;
    } else {
      // Si está inactivo, activar directamente
      this.ejecutarCambioEstado(user, true);
    }
    this.cdr.markForCheck();
  }

  cerrarModalDesactivar(): void {
    this.usuarioADesactivar = null;
    this.cdr.markForCheck();
  }

  confirmarDesactivacion(): void {
    if (!this.usuarioADesactivar) return;
    const user = this.usuarioADesactivar;
    this.usuarioADesactivar = null;
    this.ejecutarCambioEstado(user, false);
    this.cdr.markForCheck();
  }

  private ejecutarCambioEstado(user: UserListItem, nuevoEstado: boolean): void {
    this.cambiandoEstadoId = user.id;
    this.cdr.markForCheck();

    this.userService.changeUserStatus(user.id, nuevoEstado).subscribe({
      next: (res) => {
        user.activo = res.activo;
        this.cambiandoEstadoId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cambiandoEstadoId = null;
        this.mensaje = 'No se pudo cambiar el estado en el servidor.';
        this.cdr.markForCheck();
      },
    });
  }
}


