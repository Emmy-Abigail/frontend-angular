import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-admin-layout',
  styleUrl: './admin-layout.css',
  templateUrl: './admin-layout.html',
})
export class AdminLayout {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login/admin']);
  }
}