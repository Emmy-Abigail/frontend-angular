
import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-conductor-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  styleUrl: './conductor-layout.css',
  templateUrl: './conductor-layout.html',
})
export class ConductorLayout {
  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login/conductor']);
  }
}
