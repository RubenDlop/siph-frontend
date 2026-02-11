import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkerAppStatus } from '../../../../../../core/services/worker-application.service';

type FilterStatus = WorkerAppStatus | 'ALL';
type Decision = 'APPROVE' | 'REJECT';

@Component({
  selector: 'app-admin-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-toolbar.component.html',
})
export class AdminToolbarComponent {
  @Input() statusFilter: FilterStatus = 'ALL';
  @Output() statusFilterChange = new EventEmitter<FilterStatus>();

  @Input() searchTerm = '';
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() clearSearch = new EventEmitter<void>();

  @Input() sortKey: 'updated_at' | 'name' | 'status' | 'years_experience' = 'updated_at';
  @Output() sortKeyChange = new EventEmitter<typeof this.sortKey>();

  @Input() sortDir: 'asc' | 'desc' = 'desc';
  @Output() toggleSortDir = new EventEmitter<void>();

  @Input() selectedCount = 0;
  @Input() bulkBusy = false;
  @Input() loading = false;

  @Output() bulkDecide = new EventEmitter<Decision>();
  @Output() clearSelection = new EventEmitter<void>();
}
