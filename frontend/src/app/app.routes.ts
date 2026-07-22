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
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings').then(m => m.Settings)
  },

  // Espace Commune (modération fokontany)
  {
    path: 'commune/creer-publication',
    loadComponent: () =>
      import('./pages/commune/creer-publication/creer-publication').then(m => m.CommuneCreerPublication)
  },
  {
    path: 'commune/publications',
    loadComponent: () =>
      import('./pages/commune/publications/publications').then(m => m.CommunePublications)
  },
  {
    path: 'commune/censure',
    loadComponent: () =>
      import('./pages/commune/censure/censure').then(m => m.CommuneCensure)
  },
  {
    path: 'commune/groupes',
    loadComponent: () =>
      import('./pages/commune/groupes/groupes').then(m => m.CommuneGroupes)
  },
  {
    path: 'commune/groupes/:id',
    loadComponent: () =>
      import('./pages/commune/groupe-detail/groupe-detail').then(m => m.CommuneGroupeDetail)
  },
  {
    path: 'commune/performance',
    loadComponent: () =>
      import('./pages/commune/performance/performance').then(m => m.CommunePerformance)
  },

  // Espace Admin (vue nationale)
  {
    path: 'admin/performance',
    loadComponent: () =>
      import('./pages/admin/performance/performance').then(m => m.AdminPerformance)
  },

  // Page publique type gouv.mada.Mitaneko
  {
    path: 'public/resultats',
    loadComponent: () =>
      import('./pages/public/resultats/resultats').then(m => m.PublicResultats)
  },
];
