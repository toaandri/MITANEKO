import { ApiError, AuthRequest } from '@middleware/errorHandler.js';

export const COMMUNE_STAFF_ROLES = [
  'moderateur_quartier',
  'acteur_communal',
  'elu_commune',
  'admin_plateforme'
] as const;

export const COMMUNE_MODERATOR_ROLES = [
  'acteur_communal',
  'elu_commune',
  'admin_plateforme'
] as const;

export function isCommuneStaff(role: string): boolean {
  return COMMUNE_STAFF_ROLES.includes(role as (typeof COMMUNE_STAFF_ROLES)[number]);
}

export function isCommuneModerator(role: string): boolean {
  return COMMUNE_MODERATOR_ROLES.includes(role as (typeof COMMUNE_MODERATOR_ROLES)[number]);
}

/** Vérifie que l'utilisateur staff peut agir sur une commune donnée */
export async function assertCommuneScope(
  user: NonNullable<AuthRequest['user']>,
  communeId: string,
  db: { oneOrNone: (q: string, v: unknown[]) => Promise<{ commune_id: string } | null> },
  quartierId?: string | null
): Promise<void> {
  if (user.role === 'admin_plateforme') return;

  if (user.role === 'moderateur_quartier') {
    if (!user.quartier_id || !quartierId || user.quartier_id !== quartierId) {
      const err: ApiError = new Error('Hors périmètre fokontany');
      err.statusCode = 403;
      throw err;
    }
    const q = await db.oneOrNone(`SELECT commune_id FROM quartiers WHERE id = $1`, [quartierId]);
    if (!q || q.commune_id !== communeId) {
      const err: ApiError = new Error('Quartier et commune incohérents');
      err.statusCode = 400;
      throw err;
    }
    return;
  }

  if (user.role === 'acteur_communal' || user.role === 'elu_commune') {
    if (user.commune_id !== communeId) {
      const err: ApiError = new Error('Hors périmètre communal');
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  const err: ApiError = new Error('Permissions insuffisantes');
  err.statusCode = 403;
  throw err;
}

export function resolveCommuneId(user: NonNullable<AuthRequest['user']>, queryCommuneId?: string): string {
  if (queryCommuneId) {
    if (user.role === 'admin_plateforme') return queryCommuneId;
    if (user.commune_id === queryCommuneId) return queryCommuneId;
    const err: ApiError = new Error('Accès refusé à cette commune');
    err.statusCode = 403;
    throw err;
  }
  if (!user.commune_id) {
    const err: ApiError = new Error('commune_id requis');
    err.statusCode = 400;
    throw err;
  }
  return user.commune_id;
}
