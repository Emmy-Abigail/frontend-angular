import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-conductor-layout',
  styleUrl: './conductor-layout.css',
  templateUrl: './conductor-layout.html',
})
export class ConductorLayout {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login/conductor']);
  }
}