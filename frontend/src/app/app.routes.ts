import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.Login) },
  { path: 'signup', loadComponent: () => import('./auth/signup/signup').then(m => m.Signup) },
  { path: 'feed', loadComponent: () => import('./feed/feed').then(m => m.Feed) },
  { path: '', redirectTo: 'feed', pathMatch: 'full' }
];
