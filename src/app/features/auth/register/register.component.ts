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

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);

  loading = false;
  errorMsg = '';

  form = this.fb.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get f() {
    return this.form.controls;
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

    // ⚠️ Si tu AuthService usa otro nombre (ej: registerUser), cámbialo aquí.
    this.auth.register(payload).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/']);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg =
          err?.error?.message ||
          err?.message ||
          'No se pudo crear la cuenta. Verifica los datos e intenta de nuevo.';
      },
    });
  }
}
