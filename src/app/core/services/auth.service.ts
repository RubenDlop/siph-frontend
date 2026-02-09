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

<<<<<<< HEAD
export interface GoogleLoginPayload {
  credential: string; // ID token de Google (GIS)
}

=======
>>>>>>> 41e108c54a0b218a81a714f45c32115e8c091ed7
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

<<<<<<< HEAD
  constructor(private http: HttpClient, private storage: StorageService) {}

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/register`, payload)
      .pipe(
        tap((response) => {
          this.storage.saveToken(response.access_token);
        })
      );
=======
  constructor(
    private http: HttpClient,
    private storage: StorageService
  ) {}

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, payload).pipe(
      tap((response) => {
        this.storage.saveToken(response.access_token);
      })
    );
>>>>>>> 41e108c54a0b218a81a714f45c32115e8c091ed7
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, payload).pipe(
      tap((response) => {
        this.storage.saveToken(response.access_token);
      })
    );
  }
<<<<<<< HEAD

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
=======
>>>>>>> 41e108c54a0b218a81a714f45c32115e8c091ed7
}
