// src/app/features/worker-applications/admin-detail/worker-application-admin-detail/worker-application-admin-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import {
  WorkerApplicationService,
  AdminWorkerApplication,
  WorkerAppStatus,
} from '../../../../core/services/worker-application.service';

import {
  AdminTechVerificationService,
  AdminCaseDetail,
  AdminCaseDoc,
} from '../../../../core/services/admin-tech-verification.service';

type Decision = 'APPROVE' | 'REJECT';
type DecisionStatus = 'APPROVED' | 'REJECTED';

@Component({
  selector: 'app-worker-application-admin-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './worker-application-admin-detail.component.html',
  styleUrl: './worker-application-admin-detail.component.scss',
})
export class WorkerApplicationAdminDetailComponent implements OnInit {
  // UI
  loading = false;
  busy = false;
  errorMsg = '';
  toastMsg = '';

  // Data
  id = 0;
  app: AdminWorkerApplication | null = null;

  // notes textarea
  notes = '';

  // Verification docs
  verifLoading = false;
  verifError = '';
  verifCase: AdminCaseDetail | null = null;

  // ✅ para el footer (NO usar new Date() en HTML)
  currentYear = new Date().getFullYear();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: WorkerApplicationService,
    private techAdmin: AdminTechVerificationService
  ) {}

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    this.id = Number(raw || 0);

    if (!this.id) {
      this.errorMsg = 'ID inválido en la ruta.';
      return;
    }

    this.load();
  }

  back(): void {
    this.router.navigateByUrl('/admin/worker-applications');
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.toastMsg = '';

    // ✅ Si no tienes endpoint GET /admin/worker-applications/{id},
    // usamos adminList() y buscamos el ID (funciona y compila).
    this.api.adminList(undefined).subscribe({
      next: (data) => {
        const list = data ?? [];
        const found = list.find((x) => x.id === this.id) ?? null;

        if (!found) {
          this.app = null;
          this.loading = false;
          this.errorMsg = `No se encontró la solicitud #${this.id}.`;
          return;
        }

        this.app = found;
        this.notes = found.admin_notes ?? '';

        this.loading = false;

        // cargar verificación
        this.loadVerification(found.user_id);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg =
          err?.error?.detail ||
          'No se pudo cargar el detalle. Revisa backend y sesión.';
      },
    });
  }

  private loadVerification(userId: number): void {
    this.verifLoading = true;
    this.verifError = '';
    this.verifCase = null;

    this.techAdmin.latestCaseByUser(userId).subscribe({
      next: (res: any) => {
        if (res?.hasCase === false) {
          this.verifLoading = false;
          this.verifCase = null;
          return;
        }
        this.verifCase = res as AdminCaseDetail;
        this.verifLoading = false;
      },
      error: (err) => {
        this.verifLoading = false;
        this.verifError =
          err?.error?.detail ||
          'No se pudieron cargar los documentos de verificación.';
      },
    });
  }

  // =========================
  // ✅ Decide (APPROVE / REJECT)
  // =========================
  private decisionToStatus(decision: Decision): DecisionStatus {
    return decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  }

  decide(decision: Decision): void {
    if (!this.app?.id) return;

    this.busy = true;
    this.toastMsg = '';
    this.errorMsg = '';

    const status = this.decisionToStatus(decision);
    const notes = (this.notes || '').trim();

    // ✅ Para cubrir ambos backends:
    // - si backend espera { decision }
    // - o si espera { status }
    const payload: any = {
      status, // tu frontend actual
      decision, // backend anterior (si existiera)
      admin_notes: notes || undefined,
    };

    this.api.adminDecide(this.app.id, payload).subscribe({
      next: (updated) => {
        this.app = updated;
        this.notes = updated?.admin_notes ?? this.notes ?? '';
        this.busy = false;

        this.toastMsg =
          decision === 'APPROVE'
            ? '✅ Solicitud aprobada (el usuario pasa a WORKER).'
            : '✅ Solicitud rechazada.';
      },
      error: (err) => {
        this.busy = false;
        this.errorMsg =
          err?.error?.detail ||
          'No se pudo tomar la decisión. Verifica permisos y endpoint.';
      },
    });
  }

  // =========================
  // ✅ Docs
  // =========================
  openDoc(doc: AdminCaseDoc): void {
    if (!this.verifCase) return;
    if (!doc?.id) return;
    if (doc.hasFile === false) return;

    this.verifError = '';

    this.techAdmin.downloadDoc(this.verifCase.caseId, doc.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err) => {
        this.verifError =
          err?.error?.detail ||
          'No se pudo abrir el documento (revisa endpoint /file).';
      },
    });
  }

  // =========================
  // ✅ UI helpers
  // =========================
  badgeClass(status: WorkerAppStatus): string {
    const base =
      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold';

    switch (status) {
      case 'APPROVED':
        return `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
      case 'REJECTED':
        return `${base} border-rose-200 bg-rose-50 text-rose-700`;
      default:
        return `${base} border-amber-200 bg-amber-50 text-amber-800`;
    }
  }

  badgeText(status: WorkerAppStatus): string {
    switch (status) {
      case 'APPROVED':
        return 'Aprobado';
      case 'REJECTED':
        return 'Rechazado';
      default:
        return 'Pendiente';
    }
  }

  userName(app: AdminWorkerApplication): string {
    const u: any = app?.user ?? {};
    const fn = (u.first_name ?? u.firstName ?? '').toString().trim();
    const ln = (u.last_name ?? u.lastName ?? '').toString().trim();
    const full = `${fn} ${ln}`.trim();
    return full || (u.email ?? 'Usuario');
  }

  copyEmail(email?: string): void {
    if (!email) return;

    const okToast = () => {
      this.toastMsg = `📋 Email copiado: ${email}`;
      setTimeout(() => (this.toastMsg = ''), 1800);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(email)
        .then(okToast)
        .catch(() => {
          this.fallbackCopy(email);
          okToast();
        });
      return;
    }

    this.fallbackCopy(email);
    okToast();
  }

  private fallbackCopy(text: string) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(ta);
    }
  }
}
