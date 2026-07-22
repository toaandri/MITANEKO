/** Base API via proxy Angular (`proxy.conf.json` → localhost:3000) */
export const API_BASE = '/api';

export interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export type UserRole =
  | 'citoyen'
  | 'moderateur_quartier'
  | 'acteur_communal'
  | 'elu_commune'
  | 'admin_plateforme';

export interface AuthUser {
  id: string;
  email?: string | null;
  nom?: string | null;
  prenom?: string | null;
  pseudonyme?: string | null;
  role: UserRole | string;
  commune_id?: string | null;
  quartier_id?: string | null;
}

export const COMMUNE_STAFF_ROLES: string[] = [
  'moderateur_quartier',
  'acteur_communal',
  'elu_commune',
  'admin_plateforme',
];

export const COMMUNE_MODERATOR_ROLES: string[] = [
  'acteur_communal',
  'elu_commune',
  'admin_plateforme',
];

export function isCommuneStaff(role?: string | null): boolean {
  return !!role && COMMUNE_STAFF_ROLES.includes(role);
}

export function isAdmin(role?: string | null): boolean {
  return role === 'admin_plateforme';
}

export function homeForRole(role?: string | null): string {
  if (isAdmin(role)) return '/admin/performance';
  if (isCommuneStaff(role)) return '/commune/publications';
  return '/feed';
}
