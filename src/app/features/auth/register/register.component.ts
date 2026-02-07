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

type RegisterRole = 'CLIENTE' | 'EXPERTO';

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
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['CLIENTE' as RegisterRole, [Validators.required]],

    // Opcional: solo si es EXPERTO
    oficio: [''],
    ciudad: [''],
  });

  get f() {
    return this.form.controls;
  }

  onRoleChange() {
    const role = this.f.role.value;

    // Si es experto, hacemos required oficio/ciudad
    if (role === 'EXPERTO') {
      this.f.oficio.addValidators([Validators.required, Validators.minLength(2)]);
      this.f.ciudad.addValidators([Validators.required, Validators.minLength(2)]);
    } else {
      this.f.oficio.clearValidators();
      this.f.ciudad.clearValidators();
      this.f.oficio.setValue('');
      this.f.ciudad.setValue('');
    }

    this.f.oficio.updateValueAndValidity();
    this.f.ciudad.updateValueAndValidity();
  }

  submit() {
    this.errorMsg = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const payload = {
      nombre: this.f.nombre.value!.trim(),
      apellido: this.f.apellido.value!.trim(),
      email: this.f.email.value!.trim().toLowerCase(),
      password: this.f.password.value!,
      role: this.f.role.value!,
      oficio: this.f.role.value === 'EXPERTO' ? this.f.oficio.value!.trim() : undefined,
      ciudad: this.f.role.value === 'EXPERTO' ? this.f.ciudad.value!.trim() : undefined,
    };

    // ⚠️ Si tu AuthService usa otro nombre (ej: registerUser), cámbialo aquí.
    this.auth.register(payload).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/auth/login']);
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
