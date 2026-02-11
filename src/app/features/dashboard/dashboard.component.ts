import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { RequestsService } from '../../core/services/requests.service';
import { WorkersService } from '../../core/services/workers.service';
import { ReviewsService } from '../../core/services/reviews.service';

type SlideKpi = { label: string; value: number | string; hint?: string; icon: string };

type RequestItem = {
  id?: number | string;
  title?: string;
  description?: string;
  status?: string;
  created_at?: string;
};

type WorkerItem = {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  oficio?: string;
  city?: string;
  rating?: number;
  jobs_done?: number;
  avatar_url?: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);

  private auth = inject(AuthService);
  private requests = inject(RequestsService);
  private workers = inject(WorkersService);
  private reviews = inject(ReviewsService);

  loading = true;
  errorMsg = '';
  year = new Date().getFullYear();

  greetingName = 'Usuario';
  role = 'USER';

  kpis: SlideKpi[] = [
    { label: 'Solicitudes activas', value: 0, hint: 'En curso / asignadas', icon: '⚡' },
    { label: 'Finalizadas', value: 0, hint: 'Servicios completados', icon: '✅' },
    { label: 'Calificación', value: '—', hint: 'Promedio de reseñas', icon: '⭐' },
    { label: 'Expertos sugeridos', value: 0, hint: 'Cerca de ti', icon: '🧰' },
  ];

  recentRequests: RequestItem[] = [];
  topWorkers: WorkerItem[] = [];

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;
    this.errorMsg = '';

    // Intento leer usuario si tu AuthService lo expone
    try {
      const anyAuth = this.auth as any;
      const u = anyAuth?.currentUser || anyAuth?.user || anyAuth?.getUser?.() || null;
      if (u?.first_name) this.greetingName = u.first_name;
      if (u?.role) this.role = u.role;
    } catch {}

    const anyReq = this.requests as any;
    const anyWorkers = this.workers as any;
    const anyReviews = this.reviews as any;

    // Requests: intenta varios nombres comunes
    const myReq$ =
      (anyReq.myRequests?.() ||
        anyReq.getMyRequests?.() ||
        anyReq.listMyRequests?.() ||
        anyReq.getMine?.() ||
        of([])).pipe(
        catchError(() => of([])),
        map((res: any) => (Array.isArray(res) ? res : res?.resultado ?? res?.items ?? res?.data ?? []))
      );

    // Workers
    const workers$ =
      (anyWorkers.getWorkers?.() ||
        anyWorkers.listWorkers?.() ||
        anyWorkers.getAll?.() ||
        of([])).pipe(
        catchError(() => of([])),
        map((res: any) => (Array.isArray(res) ? res : res?.resultado ?? res?.items ?? res?.data ?? []))
      );

    // Reviews
    const reviews$ =
      (anyReviews.myReviews?.() ||
        anyReviews.getMyReviews?.() ||
        anyReviews.listMyReviews?.() ||
        of([])).pipe(
        catchError(() => of([])),
        map((res: any) => (Array.isArray(res) ? res : res?.resultado ?? res?.items ?? res?.data ?? []))
      );

    forkJoin({ myReq: myReq$, workers: workers$, reviews: reviews$ })
      .pipe(
        finalize(() => (this.loading = false)),
        catchError(() => {
          this.errorMsg = 'No se pudo cargar el dashboard. Intenta recargar.';
          return of({ myReq: [], workers: [], reviews: [] });
        })
      )
      .subscribe(({ myReq, workers, reviews }: any) => {
        const reqs: RequestItem[] = (myReq ?? []).map((r: any) => ({
          id: r?.id ?? r?._id,
          title: r?.title ?? r?.titulo ?? 'Solicitud',
          description: r?.description ?? r?.descripcion ?? '',
          status: r?.status ?? r?.estado ?? 'CREATED',
          created_at: r?.created_at ?? r?.createdAt ?? '',
        }));

        const wk: WorkerItem[] = (workers ?? []).map((w: any) => ({
          id: w?.id ?? w?._id,
          first_name: w?.first_name ?? w?.firstName ?? w?.nombre ?? 'Experto',
          last_name: w?.last_name ?? w?.lastName ?? w?.apellido ?? '',
          oficio: w?.oficio ?? w?.job ?? w?.especialidad ?? 'Servicio',
          city: w?.city ?? w?.ciudad ?? '—',
          rating: Number(w?.rating ?? w?.promedio ?? 0) || 0,
          jobs_done: Number(w?.jobs_done ?? w?.trabajos ?? 0) || 0,
          avatar_url: w?.avatar_url ?? w?.avatar ?? '',
        }));

        const avgRating =
          (reviews ?? []).length > 0
            ? (
                (reviews ?? []).reduce((acc: number, x: any) => acc + Number(x?.rating ?? 0), 0) /
                (reviews ?? []).length
              ).toFixed(1)
            : '—';

        const activeCount = reqs.filter((r) =>
          ['CREATED', 'ASSIGNED', 'IN_PROGRESS', 'ACEPTADA', 'EN_PROCESO', 'ASIGNADA'].includes(
            (r.status ?? '').toUpperCase()
          )
        ).length;

        const doneCount = reqs.filter((r) =>
          ['DONE', 'FINISHED', 'FINALIZADA', 'COMPLETED'].includes((r.status ?? '').toUpperCase())
        ).length;

        this.recentRequests = reqs.slice(0, 6);
        this.topWorkers = wk.slice(0, 6);

        this.kpis = [
          { label: 'Solicitudes activas', value: activeCount, hint: 'En curso / asignadas', icon: '⚡' },
          { label: 'Finalizadas', value: doneCount, hint: 'Servicios completados', icon: '✅' },
          { label: 'Calificación', value: avgRating, hint: 'Promedio de reseñas', icon: '⭐' },
          { label: 'Expertos sugeridos', value: this.topWorkers.length, hint: 'Cerca de ti', icon: '🧰' },
        ];
      });
  }

  go(path: string) {
    this.router.navigate([path]);
  }

  goWorker(w: WorkerItem) {
    if (!w?.id) return this.go('/workers');
    this.router.navigate(['/workers', w.id]);
  }

  statusLabel(s?: string) {
    const v = (s ?? '').toUpperCase();
    if (v === 'CREATED') return 'Creada';
    if (['ASSIGNED', 'ACEPTADA', 'ASIGNADA'].includes(v)) return 'Asignada';
    if (['IN_PROGRESS', 'EN_PROCESO'].includes(v)) return 'En proceso';
    if (['DONE', 'FINISHED', 'FINALIZADA', 'COMPLETED'].includes(v)) return 'Finalizada';
    if (['CANCELLED', 'CANCELADA'].includes(v)) return 'Cancelada';
    return s ?? '—';
  }

  statusTone(s?: string) {
    const v = (s ?? '').toUpperCase();
    if (v === 'CREATED') return 'tone-warn';
    if (['ASSIGNED', 'ACEPTADA', 'ASIGNADA'].includes(v)) return 'tone-info';
    if (['IN_PROGRESS', 'EN_PROCESO'].includes(v)) return 'tone-live';
    if (['DONE', 'FINISHED', 'FINALIZADA', 'COMPLETED'].includes(v)) return 'tone-ok';
    if (['CANCELLED', 'CANCELADA'].includes(v)) return 'tone-bad';
    return 'tone-neutral';
  }
}
