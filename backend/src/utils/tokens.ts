import crypto from 'crypto';

/** Code alphanumérique 8 caractères, sans caractères ambigus (0/O, 1/I/L) */
export function generateTokenCode(length = 8): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += alphabet[bytes[i]! % alphabet.length];
  }
  return code;
}

export function mapLocation(row: { location_geojson?: unknown }): {
  type: 'Point';
  coordinates: [number, number];
} | null {
  if (!row.location_geojson) return null;
  const g =
    typeof row.location_geojson === 'string'
      ? JSON.parse(row.location_geojson)
      : row.location_geojson;
  if (g?.type === 'Point' && Array.isArray(g.coordinates)) {
    return { type: 'Point', coordinates: [g.coordinates[0], g.coordinates[1]] };
  }
  return null;
}

/** Nom affiché : pseudonyme si défini, sinon nom/prénom masqué si anonyme */
export function displayName(row: {
  pseudonyme?: string | null;
  nom?: string | null;
  prenom?: string | null;
  anonyme?: boolean | null;
}): string | null {
  if (row.pseudonyme) return row.pseudonyme;
  if (row.anonyme) return 'Citoyen anonyme';
  const parts = [row.prenom, row.nom].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}
