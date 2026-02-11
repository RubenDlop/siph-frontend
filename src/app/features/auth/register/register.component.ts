import {
  AfterViewInit,
  Component,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

declare global {
  interface Window {
    google?: any;
  }
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  // ✅ En tu HTML debe existir: <div #gsiBtn class="gsiBtn"></div>
  @ViewChild('gsiBtn', { static: false }) gsiBtn?: ElementRef<HTMLDivElement>;

  // ✅ OJO: esta ruta debe existir en src/assets/
  heroImg = 'assets/pexels-photo-259588-M3k_H4KE.jpeg';

  loading = false;
  errorMsg = '';
  showPass = false;

  // ✅ Google GSI
  googleReady = false;
  private googleClientId = '';
  private googleBtnRendered = false;

  form = this.fb.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get f() {
    return this.form.controls;
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initGoogle();
  }

  private getClientId(): string {
    return (
      (environment as any).googleClientId ||
      (environment as any).google_client_id ||
      (environment as any).GOOGLE_CLIENT_ID ||
      ''
    );
  }

  private async initGoogle() {
    const clientId = this.getClientId();
    if (!clientId) return;

    this.googleClientId = clientId;

    try {
      await this.loadGoogleScript();
    } catch {
      return;
    }

    const google = window.google;
    if (!google?.accounts?.id) return;

    google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: (resp: any) => this.onGoogleCredential(resp),
      ux_mode: 'popup',
      auto_select: false,
      cancel_on_tap_outside: true,
      // ✅ ayuda con cambios de FedCM (Chrome)
      use_fedcm_for_prompt: true,
    });

    this.googleReady = true;

    // ✅ recomendado: usar botón oficial (más estable que prompt)
    this.renderGoogleButton();
  }

  private renderGoogleButton() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.googleReady) return;
    if (!this.gsiBtn?.nativeElement) return;
    if (this.googleBtnRendered) return;

    const google = window.google;
    if (!google?.accounts?.id?.renderButton) return;

    try {
      // limpia por si Angular re-renderiza
      this.gsiBtn.nativeElement.innerHTML = '';

      google.accounts.id.renderButton(this.gsiBtn.nativeElement, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 320, // si quieres 100% hazlo por CSS del contenedor
        locale: 'es',
      });

      this.googleBtnRendered = true;
    } catch {
      // silent
    }
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = 'google-gsi';
      if (document.getElementById(id)) {
        resolve();
        return;
      }

      const s = document.createElement('script');
      s.id = id;
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject();
      document.head.appendChild(s);
    });
  }

  // ✅ Fallback (si quieres un botón custom que dispare prompt())
  signInWithGoogle() {
    if (!isPlatformBrowser(this.platformId)) return;

    if (!this.googleReady || !window.google?.accounts?.id) {
      this.errorMsg = 'Google no está listo todavía. Recarga la página e intenta de nuevo.';
      return;
    }

    this.errorMsg = '';

    window.google.accounts.id.prompt((notification: any) => {
      if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
        this.errorMsg =
          'No se pudo abrir Google aquí (bloqueo del navegador, cookies o FedCM). Intenta otro navegador o usa email/contraseña.';
      }
    });
  }

  private onGoogleCredential(resp: any) {
    const credential = resp?.credential;

    if (!credential) {
      this.errorMsg = 'No se pudo obtener el token de Google. Intenta nuevamente.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    // ✅ Debe existir en tu AuthService
    // loginWithGoogle(credential: string) => POST /auth/google
    this.auth.loginWithGoogle(credential).subscribe({
      next: () => {
        this.loading = false;
        // ✅ manda al dashboard (no a "/")
        this.router.navigateByUrl('/dashboard');
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg =
          err?.error?.detail ||
          err?.error?.message ||
          err?.message ||
          'No se pudo iniciar con Google. Intenta de nuevo.';
      },
    });
  }

  submit() {
    this.errorMsg = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const payload = {
      first_name: this.f.first_name.value!.trim(),
      last_name: this.f.last_name.value!.trim(),
      email: this.f.email.value!.trim().toLowerCase(),
      password: this.f.password.value!,
    };

    // ✅ Debe existir en tu AuthService
    // register(payload) => POST /auth/register
    this.auth.register(payload).subscribe({
      next: () => {
        this.loading = false;
        // ✅ manda al dashboard (no a "/")
        this.router.navigateByUrl('/dashboard');
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg =
          err?.error?.detail ||
          err?.error?.message ||
          err?.message ||
          'No se pudo crear la cuenta. Verifica los datos e intenta de nuevo.';
      },
    });
  }
}
