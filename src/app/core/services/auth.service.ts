import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type RegisterRole = 'CLIENTE' | 'EXPERTO';

export interface RegisterPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  role: RegisterRole;
  oficio?: string;
  ciudad?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token?: string;
  access_token?: string;
  user?: any;
  role?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // 🔧 Ajusta esto a tu backend real
  private baseUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, payload);
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, payload);
  }
}
