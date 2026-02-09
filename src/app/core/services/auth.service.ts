import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { StorageService } from './storage.service';

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface GoogleLoginPayload {
  credential: string; // ID token de Google (GIS)
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // 🔧 Ajusta esto a tu backend real
  private baseUrl = 'http://localhost:8000';

  constructor(private http: HttpClient, private storage: StorageService) {}

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/register`, payload)
      .pipe(
        tap((response) => {
          this.storage.saveToken(response.access_token);
        })
      );
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, payload).pipe(
      tap((response) => {
        this.storage.saveToken(response.access_token);
      })
    );
  }

  loginWithGoogle(credential: string): Observable<AuthResponse> {
    const payload: GoogleLoginPayload = { credential };

    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/google`, payload).pipe(
      tap((response) => {
        this.storage.saveToken(response.access_token);
      })
    );
  }

  logout(): void {
    this.storage.removeToken();
  }
}
