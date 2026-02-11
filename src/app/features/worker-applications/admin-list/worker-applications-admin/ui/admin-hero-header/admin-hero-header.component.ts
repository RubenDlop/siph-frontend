import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-admin-hero-header',
  standalone: true,
  templateUrl: './admin-hero-header.component.html',
})
export class AdminHeroHeaderComponent {
  @Input() loading = false;
  @Output() refresh = new EventEmitter<void>();
}
