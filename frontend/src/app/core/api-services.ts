import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE, ApiSuccess } from '../core/api';

export interface CommunePublication {
  id: string;
  titre: string;
  contenu: string;
  type_publication: string;
  categorie?: string;
  created_at: string;
  auteur?: string;
  nb_participants?: number;
  nb_votes_sondage?: number;
  participation_active?: boolean;
  is_officielle?: boolean;
  is_epinglee?: boolean;
  moderation_statut?: string;
  statut_mise_a_jour?: string | null;
  parent_publication_id?: string | null;
  photo_url?: string | null;
  [key: string]: unknown;
}

export interface SondageResult {
  options: Array<{ id: string; label: string; votes: number; pourcentage?: number }>;
  total_votes?: number;
}

export interface CreatePublicationPayload {
  titre: string;
  contenu: string;
  categorie: string;
  type_publication: 'officielle' | 'sondage' | 'participation' | 'standard';
  portee?: string;
  participation_active?: boolean;
  representant_police?: string | null;
  options_sondage?: string[];
  date_evenement?: string | null;
}

export interface CommuneDashboard {
  resume: {
    nb_publications_mois: number;
    nb_votes_sondages_mois: number;
    nb_participations_mois: number;
    nb_citoyens: number;
    nb_actifs_semaine: number;
    moderation_en_attente: number;
    signalements_resolus_mois: number;
  };
  publications_par_jour: Array<{ jour: string; nb: number }>;
  connexions_par_heure: Array<{ heure: number; nb: number }>;
  performance_quartiers: Array<{
    id: string;
    nom: string;
    nb_publications: number;
    nb_signalements: number;
    nb_resolus: number;
  }>;
}

export interface CommuneGroupe {
  id: string;
  nom: string;
  slug?: string;
  description?: string | null;
  type_groupe?: string;
  is_active?: boolean;
  commune_nom?: string;
  nb_membres?: number;
  nb_publications?: number;
  [key: string]: unknown;
}

export interface GroupeDetail extends CommuneGroupe {
  membres: Array<Record<string, unknown>>;
  publications: Array<Record<string, unknown>>;
}

@Injectable({ providedIn: 'root' })
export class CommuneApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/commune`;

  feed(params?: { type_publication?: string; page?: number; limit?: number }) {
    let httpParams = new HttpParams();
    if (params?.type_publication) httpParams = httpParams.set('type_publication', params.type_publication);
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<ApiSuccess<CommunePublication[]>>(`${this.base}/feed`, { params: httpParams });
  }

  createPublication(payload: CreatePublicationPayload) {
    return this.http.post<ApiSuccess<CommunePublication>>(`${this.base}/publications`, payload);
  }

  pinPublication(id: string, epingle: boolean) {
    return this.http.patch<ApiSuccess<unknown>>(`${this.base}/publications/${id}/epingle`, { epingle });
  }

  dashboard() {
    return this.http.get<ApiSuccess<CommuneDashboard>>(`${this.base}/dashboard`);
  }

  listGroupes() {
    return this.http.get<ApiSuccess<CommuneGroupe[]>>(`${this.base}/groupes`);
  }

  getGroupe(id: string) {
    return this.http.get<ApiSuccess<GroupeDetail>>(`${this.base}/groupes/${id}`);
  }

  createGroupe(payload: { nom: string; description?: string; type_groupe?: string }) {
    return this.http.post<ApiSuccess<CommuneGroupe>>(`${this.base}/groupes`, payload);
  }

  listRapports() {
    return this.http.get<ApiSuccess<unknown[]>>(`${this.base}/rapports`);
  }

  createRapport(payload: {
    titre: string;
    contenu?: string;
    periode_debut: string;
    periode_fin: string;
    indicateurs?: Record<string, number>;
  }) {
    return this.http.post<ApiSuccess<unknown>>(`${this.base}/rapports`, payload);
  }

  submitRapport(id: string) {
    return this.http.post<ApiSuccess<unknown>>(`${this.base}/rapports/${id}/soumettre`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class PublicationsApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/publications`;

  getSondage(id: string) {
    return this.http.get<ApiSuccess<SondageResult>>(`${this.base}/${id}/sondage`);
  }

  voter(id: string, optionId: string) {
    return this.http.post<ApiSuccess<unknown>>(`${this.base}/${id}/sondage/voter`, {
      option_id: optionId,
    });
  }

  participer(id: string) {
    return this.http.post<ApiSuccess<{ groupe_entraide_id?: string }>>(`${this.base}/${id}/participer`, {});
  }

  republier(id: string, payload: { contenu: string; statut_mise_a_jour?: string }) {
    return this.http.post<ApiSuccess<unknown>>(`${this.base}/${id}/republier`, payload);
  }
}

@Injectable({ providedIn: 'root' })
export class ModerationApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/moderation`;

  queue() {
    return this.http.get<
      ApiSuccess<{
        file_ia: Array<Record<string, unknown>>;
        commentaires_en_attente: Array<Record<string, unknown>>;
      }>
    >(`${this.base}/queue`);
  }

  applyAction(
    id: string,
    payload: {
      action: 'approuver' | 'supprimer' | 'suspendre_auteur' | 'ignorer';
      motif?: string;
      duree_jours?: number;
      duree_mois?: number;
      bannissement?: boolean;
    },
  ) {
    return this.http.patch<ApiSuccess<unknown>>(`${this.base}/queue/${id}`, payload);
  }
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/admin`;

  dashboard() {
    return this.http.get<
      ApiSuccess<{
        global: Record<string, number>;
        communes: Array<Record<string, unknown>>;
        rapports_en_attente: Array<Record<string, unknown>>;
      }>
    >(`${this.base}/dashboard`);
  }

  publishRapport(id: string) {
    return this.http.patch<ApiSuccess<unknown>>(`${this.base}/rapports/${id}/publier`, {});
  }

  rejectRapport(id: string) {
    return this.http.patch<ApiSuccess<unknown>>(`${this.base}/rapports/${id}/rejeter`, {});
  }

  listMetriques() {
    return this.http.get<ApiSuccess<unknown[]>>(`${this.base}/metriques`);
  }

  publishMetrique(id: string) {
    return this.http.patch<ApiSuccess<unknown>>(`${this.base}/metriques/${id}/publier`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class PublicApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/public`;

  impact() {
    return this.http.get<
      ApiSuccess<{
        resume: Record<string, number>;
        stories: Array<Record<string, unknown>>;
      }>
    >(`${this.base}/impact`);
  }
}
