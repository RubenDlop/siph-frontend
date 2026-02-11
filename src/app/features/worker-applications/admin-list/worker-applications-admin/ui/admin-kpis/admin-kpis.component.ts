import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-admin-kpis',
  standalone: true,
  templateUrl: './admin-kpis.component.html',
})
export class AdminKpisComponent {
  @Input() counts: { pending: number; approved: number; rejected: number } = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };
}
