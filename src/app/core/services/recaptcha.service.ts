import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RecaptchaService {
  getSiteKey(): string {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
        return environment.recaptchaTestSiteKey;
      }
    }
    return environment.recaptchaSiteKey;
  }

  render(
    container: string | HTMLElement,
    onCallback: (token: string) => void,
    onExpired?: () => void
  ): Promise<number | null> {
    return new Promise((resolve) => {
      let attempts = 0;
      const checkAndRender = () => {
        attempts++;
        const grecaptcha = (window as any).grecaptcha;
        const elem = typeof container === 'string' ? document.getElementById(container) : container;

        if (!elem) {
          if (attempts < 50) {
            setTimeout(checkAndRender, 100);
          } else {
            resolve(null);
          }
          return;
        }

        if (grecaptcha && typeof grecaptcha.render === 'function') {
          try {
            elem.innerHTML = '';
            const widgetId = grecaptcha.render(elem, {
              sitekey: this.getSiteKey(),
              callback: (token: string) => onCallback(token),
              'expired-callback': () => onExpired?.(),
            });
            resolve(widgetId);
          } catch {
            resolve(null);
          }
        } else if (attempts < 50) {
          setTimeout(checkAndRender, 100);
        } else {
          resolve(null);
        }
      };
      checkAndRender();
    });
  }

  getResponse(widgetId?: number | null): string {
    const grecaptcha = (window as any).grecaptcha;
    if (grecaptcha && typeof grecaptcha.getResponse === 'function') {
      try {
        return widgetId !== null && widgetId !== undefined
          ? grecaptcha.getResponse(widgetId)
          : grecaptcha.getResponse();
      } catch {
        return '';
      }
    }
    return '';
  }

  reset(widgetId?: number | null): void {
    const grecaptcha = (window as any).grecaptcha;
    if (grecaptcha && typeof grecaptcha.reset === 'function') {
      try {
        if (widgetId !== null && widgetId !== undefined) {
          grecaptcha.reset(widgetId);
        } else {
          grecaptcha.reset();
        }
      } catch {}
    }
  }
}
