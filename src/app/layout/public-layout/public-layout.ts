
import { Component, signal, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterOutlet,
  NavigationEnd,
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

@Component({
  standalone: true,
  imports: [RouterLink, RouterOutlet, ThemeToggle],
  selector: 'app-public-layout',
  styleUrl: './public-layout.css',
  templateUrl: './public-layout.html',
})
export class PublicLayout {
  private readonly router = inject(Router);

  menuAbierto = signal(false);

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.menuAbierto.set(false);
      });
  }

  toggleMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
