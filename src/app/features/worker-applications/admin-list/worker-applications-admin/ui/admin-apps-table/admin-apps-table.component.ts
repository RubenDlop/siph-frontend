import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ✅ OJO: aquí era 5 .. y son 6 .. (por estar dentro de /ui/...)
import {
  AdminWorkerApplication,
  WorkerAppStatus,
} from '../../../../../../core/services/worker-application.service';

type Decision = 'APPROVE' | 'REJECT';

@Component({
  selector: 'app-admin-apps-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-apps-table.component.html',
})
export class AdminAppsTableComponent {
  @Input() viewApps: AdminWorkerApplication[] = [];
  @Input() loading = false;

  @Input() notesById: Record<number, string> = {};
  @Input() busyById: Record<number, boolean> = {};

  @Input() selectedIds = new Set<number>();

  @Output() toggleSelect = new EventEmitter<{ id: number; checked: boolean }>();
  @Output() toggleSelectAll = new EventEmitter<boolean>();

  @Output() openDetail = new EventEmitter<AdminWorkerApplication>();
  @Output() decide = new EventEmitter<{ app: AdminWorkerApplication; decision: Decision }>();
  @Output() copyEmail = new EventEmitter<string>();

  // ✅ handlers para no usar "as HTMLInputElement" en el template
  onSelectAll(ev: Event): void {
    const checked = !!(ev.target as HTMLInputElement)?.checked;
    this.toggleSelectAll.emit(checked);
  }

  onRowCheck(id: number, ev: Event): void {
    const checked = !!(ev.target as HTMLInputElement)?.checked;
    this.toggleSelect.emit({ id, checked });
  }

  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  get isAllSelected(): boolean {
    const ids = this.viewApps.map((a) => a.id);
    return ids.length > 0 && ids.every((id) => this.selectedIds.has(id));
  }

  badgeClass(status: WorkerAppStatus): string {
    const base = 'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold';
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

  trackById(_: number, item: AdminWorkerApplication): number {
    return item.id;
  }
}
