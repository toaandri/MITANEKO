export interface IaModerationResult {
  est_sain: boolean;
  categories_risque: string[];
  scores?: Record<string, number>;
  action_recommandee: 'publier' | 'revision_humaine' | 'bloquer';
}

const IA_BASE = process.env.IA_API_URL || 'http://localhost:8080/api/ia';

/** Appelle backend-IA pour modérer un texte. Retourne revision_humaine si IA indisponible. */
export async function modererTexte(
  texte: string,
  auteurId?: string,
  authToken?: string
): Promise<IaModerationResult> {
  const fallback: IaModerationResult = {
    est_sain: true,
    categories_risque: [],
    action_recommandee: 'revision_humaine'
  };

  if (process.env.IA_MODERATION_ENABLED === 'false') return fallback;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const res = await fetch(`${IA_BASE}/moderation/verifier`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ texte, auteur_id: auteurId }),
      signal: AbortSignal.timeout(Number(process.env.IA_TIMEOUT_MS || 8000))
    });

    if (!res.ok) return fallback;
    const data = (await res.json()) as IaModerationResult;
    return data;
  } catch {
    return fallback;
  }
}

export function iaRequiresModeration(result: IaModerationResult): boolean {
  return result.action_recommandee === 'bloquer' || result.action_recommandee === 'revision_humaine';
}
