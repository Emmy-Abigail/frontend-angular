
import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'gestion-envios-theme';

  private readonly currentTheme = signal<Theme>(this.getInitialTheme());

  readonly theme = this.currentTheme.asReadonly();

  constructor() {
    this.applyTheme(this.currentTheme());
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    this.applyTheme(theme);

    try {
      this.document.defaultView?.localStorage.setItem(this.storageKey, theme);
    } catch {
      // El tema seguirá funcionando durante la sesión.
    }
  }

  toggleTheme(): void {
    this.setTheme(this.currentTheme() === 'light' ? 'dark' : 'light');
  }

  isDark(): boolean {
    return this.currentTheme() === 'dark';
  }

  private getInitialTheme(): Theme {
    try {
      const savedTheme = this.document.defaultView?.localStorage.getItem(
        this.storageKey
      );

      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch {
      // Si localStorage no está disponible, se usa el tema claro.
    }

    return 'light';
  }

  private applyTheme(theme: Theme): void {
    this.document.documentElement.setAttribute('data-theme', theme);
  }
}
