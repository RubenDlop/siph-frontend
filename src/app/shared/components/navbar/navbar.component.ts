import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { StorageService } from '../../../core/services/storage.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIf],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'], // ✅ OJO: styleUrls (no styleUrl)
})
export class NavbarComponent {
  private storage = inject(StorageService);
  private router = inject(Router);
  private el = inject(ElementRef);

  menuOpen = false;
  userMenuOpen = false;

  get isAuth(): boolean {
    return this.storage.isLoggedIn();
  }

  get user() {
    return this.storage.getUser();
  }

  get role(): string {
    return (this.user?.role || 'USER').toUpperCase();
  }

  get isUser(): boolean {
    return this.role === 'USER';
  }

  get isWorker(): boolean {
    return this.role === 'WORKER';
  }

  get isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  get initials(): string {
    const u = this.user;
    const a = (u?.first_name || 'U').trim().charAt(0).toUpperCase();
    const b = (u?.last_name || '').trim().charAt(0).toUpperCase();
    return (a + b) || 'U';
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    if (!this.menuOpen) this.userMenuOpen = false;
  }

  closeMenu() {
    this.menuOpen = false;
    this.userMenuOpen = false;
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  logout() {
    this.storage.clearToken();
    this.closeMenu();
    this.router.navigate(['/auth/login']);
  }

  // ✅ Cierra al hacer click fuera
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const target = ev.target as Node | null;
    if (!target) return;
    if (!this.el.nativeElement.contains(target)) this.closeMenu();
  }

  // ✅ ESC para cerrar
  @HostListener('document:keydown.escape')
  onEsc() {
    this.closeMenu();
  }
}
