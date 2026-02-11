import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService, AuthUser } from './storage.service';

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
  credential: string;
}

export interface AuthResponse {
  access_token: string;
  token_type?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = environment.apiUrl || 'http://localhost:8000';

  constructor(private http: HttpClient, private storage: StorageService) {}

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/register`, payload)
      .pipe(
        tap((res) => {
          this.storage.saveToken(res.access_token);
          // Carga user para navbar/roles
          this.me().subscribe({ next: () => {}, error: () => {} });
        })
      );
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, payload).pipe(
      tap((res) => {
        this.storage.saveToken(res.access_token);
        this.me().subscribe({ next: () => {}, error: () => {} });
      })
    );
  }

  loginWithGoogle(credential: string): Observable<AuthResponse> {
    const payload: GoogleLoginPayload = { credential };
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/google`, payload)
      .pipe(
        tap((res) => {
          this.storage.saveToken(res.access_token);
          this.me().subscribe({ next: () => {}, error: () => {} });
        })
      );
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.baseUrl}/auth/me`).pipe(
      tap((user) => {
        this.storage.saveUser(user);
      })
    );
  }

  logout(): void {
    this.storage.clearToken();
  }
}
