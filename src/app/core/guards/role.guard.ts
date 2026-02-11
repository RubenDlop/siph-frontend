import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

export const roleGuard: CanActivateFn = (route) => {
  const storage = inject(StorageService);
  const router = inject(Router);

  const allowed: string[] = (route.data?.['roles'] || []).map((x: string) => x.toUpperCase());
  const role = (storage.getUser()?.role || 'USER').toUpperCase();

  if (!allowed.length || allowed.includes(role)) return true;

  router.navigate(['/dashboard']);
  return false;
};
