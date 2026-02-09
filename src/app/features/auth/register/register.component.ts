<<<<<<< HEAD
import { Component, inject, AfterViewInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

declare global {
  interface Window { google?: any; }
}
=======
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

// Ajusta el import si tu ruta es distinta:
import { AuthService } from '../../../core/services/auth.service';
>>>>>>> 41e108c54a0b218a81a714f45c32115e8c091ed7

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
<<<<<<< HEAD
export class RegisterComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  loading = false;
  errorMsg = '';
  showPass = false;
=======
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);

  loading = false;
  errorMsg = '';
>>>>>>> 41e108c54a0b218a81a714f45c32115e8c091ed7

  form = this.fb.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

<<<<<<< HEAD
  get f() { return this.form.controls; }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Espera corta por si el script aún no terminó de cargar
    setTimeout(() => this.initGoogleButton(), 0);
  }

  private initGoogleButton() {
    const google = window.google;
    const el = document.getElementById('googleBtn');

    if (!el || !google?.accounts?.id) return;
    if (!environment.googleClientId) return;

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (resp: any) => this.onGoogleCredential(resp),
    });

    // Botón oficial (cumple guidelines)
    google.accounts.id.renderButton(el, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 380,
      locale: 'es',
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

    this.auth.loginWithGoogle(credential).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/']);
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
=======
  get f() {
    return this.form.controls;
>>>>>>> 41e108c54a0b218a81a714f45c32115e8c091ed7
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

<<<<<<< HEAD
=======
    // ⚠️ Si tu AuthService usa otro nombre (ej: registerUser), cámbialo aquí.
>>>>>>> 41e108c54a0b218a81a714f45c32115e8c091ed7
    this.auth.register(payload).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/']);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg =
<<<<<<< HEAD
          err?.error?.detail ||
=======
>>>>>>> 41e108c54a0b218a81a714f45c32115e8c091ed7
          err?.error?.message ||
          err?.message ||
          'No se pudo crear la cuenta. Verifica los datos e intenta de nuevo.';
      },
    });
  }
}
