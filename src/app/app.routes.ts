import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },

  // ✅ AUTH (lo que tú estás usando: /auth/login y /auth/register)
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },

  // ✅ Alias para que /login y /register también funcionen
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'register', redirectTo: 'auth/register', pathMatch: 'full' },

  // ✅ Workers
  {
    path: 'workers',
    loadComponent: () =>
      import('./features/workers/worker-list/worker-list.component').then(
        (m) => m.WorkerListComponent
      ),
  },
  {
    path: 'workers/:id',
    loadComponent: () =>
      import('./features/workers/worker-profile/worker-profile.component').then(
        (m) => m.WorkerProfileComponent
      ),
  },

  // ✅ Requests
  {
    path: 'requests/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/requests/request-create/request-create.component').then(
        (m) => m.RequestCreateComponent
      ),
  },
  {
    path: 'my-requests',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/requests/my-requests/my-requests.component').then(
        (m) => m.MyRequestsComponent
      ),
  },

  // ✅ Reviews
  {
    path: 'reviews',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reviews/review-list/review-list.component').then(
        (m) => m.ReviewListComponent
      ),
  },

  // ✅ Not Found
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
  },
];
