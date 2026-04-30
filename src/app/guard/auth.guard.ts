import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {AuthService} from '../service/auth.service';
import {catchError, map, of} from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  return authService.getUserAuth().pipe(
    map(users => {
      if (users.length > 0) {
        // Eğer kullanıcı bulunursa erişime izin ver
        return true;
      } else {
        // Kullanıcı bulunamazsa giriş sayfasına yönlendir
        router.navigate(['/register']);
        return false;
      }
    }),
    catchError(() => {
      // Bir hata olursa giriş sayfasına yönlendir
      router.navigate(['/register']);
      return of(false);
    })
  );
};
