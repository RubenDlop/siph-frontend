import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-alerts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-alerts.component.html',
})
export class AdminAlertsComponent {
  @Input() errorMsg = '';
  @Input() toastMsg = '';
}
