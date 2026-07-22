import { Routes } from '@angular/router';
import { adminGuard, authGuard, communeGuard } from './core/role.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login/login').then((m) => m.Login) },
  { path: 'signup', loadComponent: () => import('./auth/signup/signup').then((m) => m.Signup) },
  {
    path: 'feed',
    canActivate: [authGuard],
    loadComponent: () => import('./feed/feed').then((m) => m.Feed),
  },
  {
    path: 'nouvelle-publication',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/nouvelle-publication/nouvelle-publication').then((m) => m.NouvellePublication),
  },
  { path: '', redirectTo: 'feed', pathMatch: 'full' },
  {
    path: 'carte',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/carte/carte').then((m) => m.CarteComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/settings/settings').then((m) => m.Settings),
  },

  // Espace Commune
  {
    path: 'commune/creer-publication',
    canActivate: [communeGuard],
    loadComponent: () =>
      import('./pages/commune/creer-publication/creer-publication').then(
        (m) => m.CommuneCreerPublication,
      ),
  },
  {
    path: 'commune/publications',
    canActivate: [communeGuard],
    loadComponent: () =>
      import('./pages/commune/publications/publications').then((m) => m.CommunePublications),
  },
  {
    path: 'commune/censure',
    canActivate: [communeGuard],
    loadComponent: () => import('./pages/commune/censure/censure').then((m) => m.CommuneCensure),
  },
  {
    path: 'commune/groupes',
    canActivate: [communeGuard],
    loadComponent: () => import('./pages/commune/groupes/groupes').then((m) => m.CommuneGroupes),
  },
  {
    path: 'commune/groupes/:id',
    canActivate: [communeGuard],
    loadComponent: () =>
      import('./pages/commune/groupe-detail/groupe-detail').then((m) => m.CommuneGroupeDetail),
  },
  {
    path: 'commune/performance',
    canActivate: [communeGuard],
    loadComponent: () =>
      import('./pages/commune/performance/performance').then((m) => m.CommunePerformance),
  },

  // Espace Admin
  {
    path: 'admin/performance',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/performance/performance').then((m) => m.AdminPerformance),
  },

  // Page publique
  {
    path: 'public/resultats',
    loadComponent: () =>
      import('./pages/public/resultats/resultats').then((m) => m.PublicResultats),
  },
];
