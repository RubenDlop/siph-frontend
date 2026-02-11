import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type UserRole = 'USER' | 'WORKER' | 'ADMIN';
export type WorkerAppStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
}

export interface WorkerApplicationCreate {
  phone?: string | null;
  city?: string | null;
  specialty?: string | null;
  bio?: string | null;
  years_experience?: number | null;
}

export interface WorkerApplication {
  id: number;
  user_id: number;

  phone?: string | null;
  city?: string | null;
  specialty?: string | null;
  bio?: string | null;
  years_experience?: number | null;

  status: WorkerAppStatus;

  admin_notes?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;

  created_at: string;
  updated_at: string;
}

export interface AdminWorkerApplication extends WorkerApplication {
  user?: AuthUser | null;
}

/**
 * ✅ Backend espera: { decision: 'APPROVE'|'REJECT', admin_notes? }
 */
export type WorkerApplicationDecision = {
  decision: 'APPROVE' | 'REJECT';
  admin_notes?: string;
};

@Injectable({ providedIn: 'root' })
export class WorkerApplicationService {
  private baseUrl = environment.apiUrl || 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  apply(payload: WorkerApplicationCreate): Observable<WorkerApplication> {
    return this.http.post<WorkerApplication>(`${this.baseUrl}/worker-applications`, payload);
  }

  myApplication(): Observable<WorkerApplication> {
    return this.http.get<WorkerApplication>(`${this.baseUrl}/worker-applications/me`);
  }

  adminList(status_filter?: WorkerAppStatus): Observable<AdminWorkerApplication[]> {
    let params = new HttpParams();
    if (status_filter) params = params.set('status_filter', status_filter);

    return this.http.get<AdminWorkerApplication[]>(
      `${this.baseUrl}/admin/worker-applications`,
      { params }
    );
  }

  adminDecide(appId: number, payload: WorkerApplicationDecision): Observable<AdminWorkerApplication> {
    return this.http.patch<AdminWorkerApplication>(
      `${this.baseUrl}/admin/worker-applications/${appId}`,
      payload
    );
  }
}
