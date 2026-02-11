// src/app/features/worker-applications/apply/worker-apply/worker-apply.component.ts

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  WorkerApplicationService,
  WorkerApplication,
} from '../../../../core/services/worker-application.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StorageService } from '../../../../core/services/storage.service';

import {
  TechVerificationService,
  TechVerificationMe,
  TechLevel,
  TechStatus,
  DocType,
} from '../../../../core/services/tech-verification.service';

type Activity = 'ALTURAS' | 'ELECTRICA_CERT' | 'GAS';

type DocUI = {
  type: DocType;
  label: string;
  required: boolean;
  accept: string;
  acceptAttr: string;
  help?: string;
  extraFields?: { key: string; label: string }[];
};

@Component({
  selector: 'app-worker-apply',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './worker-apply.component.html',
  styleUrl: './worker-apply.component.scss',
})
export class WorkerApplyComponent implements OnInit {
  private fb = inject(FormBuilder);
  private workerApp = inject(WorkerApplicationService);
  private auth = inject(AuthService);
  private storage = inject(StorageService);
  private verifApi = inject(TechVerificationService);

  // wizard
  step = 1;

  loading = false;
  error = '';
  saved = false;

  currentApp: WorkerApplication | null = null;
  verification: TechVerificationMe | null = null;

  photoFile: File | null = null;
  photoError = '';

  // docs (✅ File inputs)
  selectedDocs: Partial<Record<DocType, File | null>> = {};
  docErrors: Partial<Record<DocType, string>> = {};
  extra: Record<string, string> = {};

  // categorías y actividades
  readonly CATEGORIES = [
    'Electricidad',
    'Plomería',
    'Carpintería',
    'Aires acondicionados',
    'Pintura',
    'Gas',
    'Electrodomésticos',
    'Herrería',
    'Jardinería',
    'Techos',
  ] as const;

  categories: string[] = [];
  activities: Activity[] = [];
  wantsPayments = false;

  // formulario (perfil + solicitud)
  form = this.fb.group({
    // público
    public_name: ['', [Validators.required, Validators.minLength(3)]],
    city: ['', [Validators.required, Validators.minLength(2)]],
    radius_km: [5, [Validators.min(0), Validators.max(100)]],

    // privado
    doc_type: ['CC', Validators.required],
    doc_number: ['', [Validators.required, Validators.pattern(/^[0-9A-Za-z\-\.]{5,20}$/)]],
    phone: ['', [Validators.required, Validators.minLength(7)]],

    // perfil técnico
    specialty: ['', Validators.required],
    years_experience: [0, [Validators.min(0), Validators.max(60)]],
    bio: ['', [Validators.required, Validators.minLength(20)]],

    // consentimientos
    accept_terms: [false, Validators.requiredTrue],
    accept_privacy: [false, Validators.requiredTrue],
    accept_sensitive: [false, Validators.requiredTrue],
  });

  ngOnInit(): void {
    this.reloadAll();
  }

  // ✅ FIX: trackBy para inputs file (evita que se reseteen)
  trackDoc = (_: number, d: DocUI) => d.type;

  // ================== getters UX ==================
  get userEmail(): string {
    return this.storage.getUser()?.email || '';
  }

  get role(): string {
    return (this.storage.getUser()?.role || 'USER').toUpperCase();
  }

  get categoriesError(): boolean {
    return this.step === 2 && this.categories.length === 0;
  }

  get consentsError(): boolean {
    if (this.step !== 2) return false;
    const v = this.form.value;
    return !v.accept_terms || !v.accept_privacy || !v.accept_sensitive;
  }

  get recommendedLevel(): TechLevel {
    if (this.wantsPayments) return 'PAY';
    if (
      this.hasActivity('ALTURAS') ||
      this.hasActivity('GAS') ||
      this.hasActivity('ELECTRICA_CERT') ||
      this.hasCategory('Electricidad') ||
      this.hasCategory('Gas')
    ) {
      return 'PRO';
    }
    return 'TRUST';
  }

  get recommendedLevelLabel(): string {
    return this.levelLabel(this.recommendedLevel);
  }

  get requiredDocs(): DocUI[] {
    const docs: DocUI[] = [];

    // BASIC — foto ID
    docs.push({
      type: 'ID_PHOTO',
      label: 'Foto del documento de identidad (frontal)',
      required: true,
      accept: 'JPG / PNG',
      acceptAttr: 'image/png,image/jpeg',
      help: 'Se elimina máximo en 30 días. Guardamos solo resultado+fecha.',
    });

    // TRUST — antecedentes + referencias opc
    if (this.recommendedLevel !== 'BASIC') {
      docs.push(
        {
          type: 'POLICE_CERT',
          label: 'Certificado de antecedentes (Policía)',
          required: true,
          accept: 'PDF / JPG / PNG',
          acceptAttr: 'application/pdf,image/png,image/jpeg',
          help: 'Guardamos solo resultado+fecha (no el archivo). Vigencia sugerida: 6 meses.',
        },
        {
          type: 'PROCURADURIA_CERT',
          label: 'Certificado Procuraduría',
          required: true,
          accept: 'PDF / JPG / PNG',
          acceptAttr: 'application/pdf,image/png,image/jpeg',
          help: 'Guardamos solo resultado+fecha. Vigencia sugerida: 6 meses.',
        },
        {
          type: 'RNMC_CERT',
          label: 'RNMC (Medidas Correctivas)',
          required: true,
          accept: 'PDF / JPG / PNG',
          acceptAttr: 'application/pdf,image/png,image/jpeg',
          help: 'Guardamos solo resultado+fecha. Vigencia sugerida: 6 meses.',
        },
        {
          type: 'REFERENCES',
          label: 'Referencias (opcional)',
          required: false,
          accept: 'PDF / JPG / PNG',
          acceptAttr: 'application/pdf,image/png,image/jpeg',
          help: 'Opcional. Puedes subir una carta o foto de referencias.',
        }
      );
    }

    // PRO / PAY — licencias/certificados + alturas/gas si aplica
    if (this.recommendedLevel === 'PRO' || this.recommendedLevel === 'PAY') {
      if (this.hasCategory('Electricidad') || this.hasActivity('ELECTRICA_CERT')) {
        docs.push({
          type: 'PRO_LICENSE',
          label: 'Matrícula profesional (CONTE / COPNIA) o soporte equivalente',
          required: true,
          accept: 'PDF / JPG / PNG',
          acceptAttr: 'application/pdf,image/png,image/jpeg',
          help: 'Minimización: almacenamos Nº y fecha; el archivo se elimina al finalizar verificación.',
          extraFields: [
            { key: 'license_number', label: 'Número de matrícula (si aplica)' },
            { key: 'license_date', label: 'Fecha de expedición (si aplica)' },
          ],
        });
      } else {
        docs.push({
          type: 'STUDY_CERT',
          label: 'Certificado de estudios / competencias (SENA/curso/otro)',
          required: true,
          accept: 'PDF / JPG / PNG',
          acceptAttr: 'application/pdf,image/png,image/jpeg',
          help: 'Minimización: guardamos solo tipo+fecha; el archivo se elimina al finalizar verificación.',
          extraFields: [{ key: 'study_name', label: 'Nombre del certificado (ej: SENA Electricidad)' }],
        });
      }

      if (this.hasActivity('ALTURAS')) {
        docs.push({
          type: 'HEIGHTS_CERT',
          label: 'Certificado de trabajo en alturas (si aplica)',
          required: true,
          accept: 'PDF / JPG / PNG',
          acceptAttr: 'application/pdf,image/png,image/jpeg',
          help: 'Requerido si marcaste “Trabajo en alturas”.',
          extraFields: [{ key: 'heights_level', label: 'Nivel (básico/avanzado) (opcional)' }],
        });
      }

      if (this.hasActivity('GAS') || this.hasCategory('Gas')) {
        docs.push({
          type: 'GAS_CERT',
          label: 'Certificación para gas (si aplica)',
          required: true,
          accept: 'PDF / JPG / PNG',
          acceptAttr: 'application/pdf,image/png,image/jpeg',
          help: 'Requerido si realizas instalaciones/mantenimiento de gas.',
        });
      }
    }

    // PAY — RUT + banco
    if (this.recommendedLevel === 'PAY') {
      docs.push(
        {
          type: 'RUT',
          label: 'RUT (para pagos)',
          required: true,
          accept: 'PDF / JPG / PNG',
          acceptAttr: 'application/pdf,image/png,image/jpeg',
          help: 'Minimización: guardamos solo hash/token+fecha; archivo se elimina al finalizar verificación.',
        },
        {
          type: 'BANK_CERT',
          label: 'Certificado bancario (para pagos)',
          required: true,
          accept: 'PDF / JPG / PNG',
          acceptAttr: 'application/pdf,image/png,image/jpeg',
          help: 'Minimización: guardamos solo hash/token+fecha; archivo se elimina al finalizar verificación.',
        }
      );
    }

    return docs;
  }

  // ================== wizard nav ==================
  next() {
    this.step = Math.min(5, this.step + 1);
  }
  prev() {
    this.step = Math.max(1, this.step - 1);
  }

  goRenew() {
    this.step = 3;
  }

  // ================== UI helpers ==================
  t(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.touched && c.invalid);
  }

  hasCategory(c: string) {
    return this.categories.includes(c);
  }
  toggleCategory(c: string) {
    if (this.hasCategory(c)) this.categories = this.categories.filter(x => x !== c);
    else this.categories = [...this.categories, c];
  }

  hasActivity(a: Activity) {
    return this.activities.includes(a);
  }
  toggleActivity(a: Activity, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked && !this.hasActivity(a)) this.activities = [...this.activities, a];
    if (!checked && this.hasActivity(a)) this.activities = this.activities.filter(x => x !== a);
  }

  onPhoto(ev: Event) {
    this.photoError = '';
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;

    if (f.size > 5 * 1024 * 1024) {
      this.photoFile = null;
      this.photoError = 'Archivo >5 MB';
      return;
    }
    if (!f.type.startsWith('image/')) {
      this.photoFile = null;
      this.photoError = 'Formato no válido';
      return;
    }

    this.photoFile = f;
    input.value = '';
  }

  // ✅ FIX: guarda el archivo de forma estable + no se resetea el input
  onDocFile(type: DocType, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;

    this.docErrors[type] = '';

    const okType =
      f.type === 'application/pdf' ||
      f.type === 'image/png' ||
      f.type === 'image/jpeg';

    if (!okType) {
      this.selectedDocs = { ...this.selectedDocs, [type]: null };
      this.docErrors[type] = 'Formato no válido';
      return;
    }

    if (f.size > 5 * 1024 * 1024) {
      this.selectedDocs = { ...this.selectedDocs, [type]: null };
      this.docErrors[type] = 'Archivo >5 MB';
      return;
    }

    this.selectedDocs = { ...this.selectedDocs, [type]: f };
    input.value = '';
  }

  clearDoc(type: DocType) {
    const copy = { ...this.selectedDocs };
    delete copy[type];
    this.selectedDocs = copy;

    const errCopy = { ...this.docErrors };
    delete errCopy[type];
    this.docErrors = errCopy;
  }

  setExtra(key: string, value: string) {
    this.extra[key] = value;
  }

  // ================== load / submit ==================
  reloadAll() {
    this.loading = true;
    this.error = '';
    this.saved = false;

    this.loadMine();

    this.verifApi.me().subscribe({
      next: (v) => {
        this.verification = v;
        this.loading = false;
      },
      error: (e) => {
        // 404 es normal si aún no has creado perfil
        this.verification = null;
        this.loading = false;
        if (e?.status !== 404) {
          // opcional
        }
      },
    });
  }

  loadMine() {
    this.workerApp.myApplication().subscribe({
      next: (app) => (this.currentApp = app),
      error: (e) => {
        this.currentApp = null;
        if (e?.status !== 404) {
          // opcional
        }
      },
    });
  }

  // ✅ NUEVO: crea la solicitud worker_applications para que el ADMIN la vea
  private createWorkerApplicationIfNeeded(onDone: () => void) {
    // Solo USER puede postular. Si eres ADMIN o WORKER, no intentes crear.
    if (this.role !== 'USER') {
      onDone();
      return;
    }

    // Evita duplicar si ya tienes una en memoria
    if (this.currentApp?.id) {
      onDone();
      return;
    }

    const payload = {
      phone: this.form.value.phone || undefined,
      city: this.form.value.city || undefined,
      specialty: this.form.value.specialty || '',
      bio: this.form.value.bio || '',
      years_experience: Number(this.form.value.years_experience || 0),
    };

    this.workerApp.apply(payload).subscribe({
      next: (app) => {
        this.currentApp = app;
        onDone();
      },
      error: () => {
        // No bloquees el flujo de verificación si esto falla.
        onDone();
      },
    });
  }

  saveProfileAndNext() {
    this.error = '';
    this.saved = false;

    if (this.form.invalid || this.categories.length === 0 || this.consentsError) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const payload = {
      public: {
        name: this.form.value.public_name!,
        city: this.form.value.city!,
        radius_km: Number(this.form.value.radius_km || 0),
        categories: this.categories,
      },
      private: {
        doc_type: this.form.value.doc_type!,
        doc_number: this.form.value.doc_number!,
        phone: this.form.value.phone!,
        email: this.userEmail,
      },
      technician: {
        specialty: this.form.value.specialty!,
        years_experience: Number(this.form.value.years_experience || 0),
        bio: this.form.value.bio!,
        activities: this.activities,
        wants_payments: this.wantsPayments,
        requested_level: this.recommendedLevel,
      },
      consents: {
        terms: !!this.form.value.accept_terms,
        privacy: !!this.form.value.accept_privacy,
        sensitive: !!this.form.value.accept_sensitive,
      },
    };

    this.verifApi.upsertProfile(payload).subscribe({
      next: () => {
        // ✅ CLAVE: crear worker-application para que el ADMIN la vea
        this.createWorkerApplicationIfNeeded(() => {
          this.loading = false;
          this.next();
        });
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.detail || 'No se pudo guardar el perfil.';
      },
    });
  }

  uploadAndSubmit() {
    this.error = '';
    this.saved = false;

    const required = this.requiredDocs.filter(d => d.required).map(d => d.type);

    for (const rt of required) this.docErrors[rt] = '';

    for (const rt of required) {
      if (!this.selectedDocs[rt]) {
        this.docErrors[rt] = 'Este documento es obligatorio';
      }
    }
    if (required.some(rt => !!this.docErrors[rt])) return;

    if (!this.form.value.accept_sensitive) {
      this.error = 'Debes autorizar la verificación de documentos.';
      return;
    }

    this.loading = true;

    const queue = [...this.requiredDocs].filter(d => !!this.selectedDocs[d.type]);
    const uploadNext = (i: number) => {
      if (i >= queue.length) {
        this.verifApi.submit({
          targetLevel: this.recommendedLevel,
          extra: this.extra,
        }).subscribe({
          next: (v) => {
            this.verification = v;
            this.saved = true;
            this.loading = false;
            this.step = 4;
          },
          error: (e) => {
            this.loading = false;
            this.error = e?.error?.detail || 'No se pudo enviar a verificación.';
          },
        });
        return;
      }

      const item = queue[i];
      const f = this.selectedDocs[item.type] as File;

      this.verifApi.uploadDoc({
        docType: item.type,
        file: f,
        consent: true,
        extra: this.extra,
      }).subscribe({
        next: () => uploadNext(i + 1),
        error: (e) => {
          this.loading = false;
          this.error = e?.error?.detail || `No se pudo subir ${item.label}.`;
        },
      });
    };

    uploadNext(0);
  }

  refreshRole() {
    this.auth.me().subscribe({
      next: () => this.loadMine(),
      error: () => this.loadMine(),
    });
  }

  // ================== badges ==================
  badgeClass(status: string) {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED') return 'badge badge--ok';
    if (s === 'REJECTED') return 'badge badge--bad';
    return 'badge badge--wait';
  }
  badgeText(status: string) {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED') return 'Aprobada';
    if (s === 'REJECTED') return 'Rechazada';
    return 'En revisión';
  }

  verifBadgeClass(status: TechStatus) {
    if (status === 'VERIFIED') return 'statusline__badge badge--ok';
    if (status === 'REJECTED') return 'statusline__badge badge--bad';
    if (status === 'IN_REVIEW') return 'statusline__badge badge--wait';
    return 'statusline__badge';
  }
  verifBadgeText(status: TechStatus) {
    if (status === 'VERIFIED') return 'Verificado';
    if (status === 'REJECTED') return 'Rechazado';
    if (status === 'IN_REVIEW') return 'En revisión';
    return 'Pendiente';
  }

  levelLabel(level: TechLevel) {
    if (level === 'BASIC') return 'Básico';
    if (level === 'TRUST') return 'Confianza';
    if (level === 'PRO') return 'Profesional';
    if (level === 'PAY') return 'Pagos';
    return level as any;
  }
}
