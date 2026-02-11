// src/app/core/services/tech-verification.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Niveles */
export type TechLevel = 'BASIC' | 'TRUST' | 'PRO' | 'PAY';
/** Estados del caso/verificación */
export type TechStatus = 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';

/** Tipos de documentos */
export type DocType =
  | 'ID_PHOTO'
  | 'POLICE_CERT'
  | 'PROCURADURIA_CERT'
  | 'RNMC_CERT'
  | 'REFERENCES'
  | 'PRO_LICENSE'
  | 'STUDY_CERT'
  | 'HEIGHTS_CERT'
  | 'GAS_CERT'
  | 'RUT'
  | 'BANK_CERT';

/** Resumen para /me */
export interface TechVerificationMe {
  techId: number;
  currentLevel: TechLevel;
  status: TechStatus;
  verifiedAt?: string | null;
  expiresAt?: string | null;
  reason?: string | null;
}

/** Payload perfil (ajusta campos a tu backend real) */
export interface TechProfileUpsert {
  public_name?: string | null;
  city?: string | null;
  specialty?: string | null;
  phone?: string | null;
  bio?: string | null;
  years_experience?: number | null;
  // agrega aquí lo que uses en tu backend
  [key: string]: any;
}

/** Respuesta de upload (ajusta si tu backend devuelve más) */
export interface UploadDocResponse {
  ok: true;
  docId?: number;
  url?: string; // si backend lo devuelve
}

/** Documento en detalle admin */
export interface AdminVerificationDocument {
  id: number;
  docType: DocType | string;
  receivedAt?: string | null;
  verifiedResult?: 'ok' | 'fail' | 'unknown' | null;
  verifiedAt?: string | null;

  /** ✅ si tu backend ya devuelve url/filename/mime/size */
  url?: string | null;
  filename?: string | null;
  mime?: string | null;
  size?: number | null;

  meta?: any;
}

/** Detalle caso (admin) */
export interface AdminVerificationCaseDetail {
  caseId: number;
  techId: number;
  status: TechStatus;
  targetLevel: TechLevel;
  createdAt: string;
  tech: {
    publicName?: string;
    city?: string;
    specialty?: string;
  };
  documents: AdminVerificationDocument[];
}

/** Listado de casos (admin) */
export interface AdminVerificationCaseListItem {
  caseId: number;
  techId: number;
  publicName: string;
  targetLevel: TechLevel;
  status: TechStatus;
  createdAt: string;
}

/** Review documento (admin) */
export interface AdminReviewDocPayload {
  result: 'ok' | 'fail' | 'unknown';
  notes?: string;
}

/** Logs (admin) */
export interface AdminVerificationLogItem {
  at: string;
  action: string;
  detail: any;
  actorId: number;
}

@Injectable({ providedIn: 'root' })
export class TechVerificationService {
  private http = inject(HttpClient);

  /** ✅ fallback robusto si env.apiUrl viene vacío */
  private base = environment.apiUrl || 'http://localhost:8000';

  // =========================
  // USER endpoints
  // =========================
  me() {
    return this.http.get<TechVerificationMe>(`${this.base}/tech/verification/me`);
  }

  upsertProfile(payload: TechProfileUpsert) {
    return this.http.put<{ ok: true }>(`${this.base}/tech/verification/profile`, payload);
  }

  uploadDoc(args: { docType: DocType; file: File; consent: boolean; extra?: any }) {
    const fd = new FormData();
    fd.append('docType', args.docType);
    fd.append('consent', String(args.consent));
    fd.append('file', args.file);

    // extra (opcional)
    if (args.extra != null) fd.append('extra', JSON.stringify(args.extra));

    return this.http.post<UploadDocResponse>(`${this.base}/tech/verification/documents`, fd);
  }

  submit(payload: { targetLevel: TechLevel; extra?: any }) {
    return this.http.post<TechVerificationMe>(`${this.base}/tech/verification/submit`, payload);
  }

  // =========================
  // ADMIN endpoints (para ver documentos y revisar)
  // =========================

  /** Lista casos para revisar */
  adminListCases(args?: { status?: TechStatus; limit?: number }) {
    let params = new HttpParams();
    if (args?.status) params = params.set('status', args.status);
    if (args?.limit != null) params = params.set('limit', String(args.limit));

    return this.http.get<AdminVerificationCaseListItem[]>(
      `${this.base}/admin/tech/verification/cases`,
      { params }
    );
  }

  /** Detalle del caso: ✅ trae "documents" para renderizar/abrir */
  adminCaseDetail(caseId: number) {
    return this.http.get<AdminVerificationCaseDetail>(
      `${this.base}/admin/tech/verification/cases/${caseId}`
    );
  }

  /** Revisión de un documento */
  adminReviewDocument(caseId: number, docId: number, payload: AdminReviewDocPayload) {
    return this.http.patch<{ ok: true; docId: number; result: string; verifiedAt: string }>(
      `${this.base}/admin/tech/verification/cases/${caseId}/documents/${docId}`,
      payload
    );
  }

  /** Decidir caso completo */
  adminDecideCase(caseId: number, payload: { decision: 'VERIFY' | 'REJECT'; reason?: string; decision_notes?: string }) {
    // el backend lo tiene como query params (decision, reason, decision_notes)
    // para evitar líos, lo enviamos como params.
    let params = new HttpParams().set('decision', payload.decision);
    if (payload.reason) params = params.set('reason', payload.reason);
    if (payload.decision_notes) params = params.set('decision_notes', payload.decision_notes);

    return this.http.patch<{
      ok: true;
      caseId: number;
      status: TechStatus;
      reason?: string | null;
      expiresAt?: string | null;
    }>(`${this.base}/admin/tech/verification/cases/${caseId}/decide`, null, { params });
  }

  /** Logs del caso */
  adminCaseLogs(caseId: number) {
    return this.http.get<AdminVerificationLogItem[]>(
      `${this.base}/admin/tech/verification/cases/${caseId}/logs`
    );
  }
}
