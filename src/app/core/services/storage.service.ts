import { Injectable } from '@angular/core';

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string | null;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private tokenKey = 'siph_token';
  private userKey = 'siph_user';

  // TOKEN
  saveToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  removeToken() {
    localStorage.removeItem(this.tokenKey);
  }

  // USER
  saveUser(user: AuthUser) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  removeUser() {
    localStorage.removeItem(this.userKey);
  }

  // HELPERS
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  clearToken() {
    this.removeToken();
    this.removeUser();
  }
}
