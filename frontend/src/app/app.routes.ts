import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.Login) },
  { path: 'signup', loadComponent: () => import('./auth/signup/signup').then(m => m.Signup) },
  { path: 'feed', loadComponent: () => import('./feed/feed').then(m => m.Feed) },
  { 
    path: 'nouvelle-publication', 
    loadComponent: () => import('./pages/nouvelle-publication/nouvelle-publication').then(m => m.NouvellePublication) 
  },
  { path: '', redirectTo: 'feed', pathMatch: 'full' },
  {
    path: 'carte',
    loadComponent: () => import('./pages/carte/carte').then(m => m.CarteComponent)
  }
];