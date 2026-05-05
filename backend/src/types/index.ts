// ==========================================
// User Types
// ==========================================

export type UserRole = 'citoyen' | 'moderateur_quartier' | 'acteur_communal' | 'elu_commune' | 'admin_plateforme';

export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  avatar_url?: string;
  role: UserRole;
  commune_id?: string;
  quartier_id?: string;
  verified_email: boolean;
  anonyme: boolean;
  created_at: Date;
  updated_at: Date;
}

// ==========================================
// Signalement Types
// ==========================================

export type SignalementStatus = 'cree' | 'approuve' | 'en_attente_vote' | 'priorise' | 'en_cours' | 'resolu' | 'rejete' | 'ferme';
export type CategorieProbleme = 'proprete' | 'securite' | 'infrastructure' | 'sante' | 'lien_social' | 'autre';

export interface Signalement {
  id: string;
  commune_id: string;
  quartier_id: string;
  creator_id: string;
  titre: string;
  description: string;
  categorie: CategorieProbleme;
  localisation: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  adresse: string;
  status: SignalementStatus;
  visibilite: 'publique' | 'anonyme';
  priorite_votes: number;
  modere: boolean;
  photo_principale_url?: string;
  created_at: Date;
  updated_at: Date;
}

// ==========================================
// Action Types
// ==========================================

export type ActionStatus = 'assignee' | 'en_attente' | 'en_cours' | 'resolu' | 'annulee';

export interface Action {
  id: string;
  signalement_id: string;
  commune_id: string;
  titre: string;
  description?: string;
  status: ActionStatus;
  equipe_responsable: string;
  responsable_id?: string;
  date_cible?: Date;
  date_debut?: Date;
  date_fin?: Date;
  photo_avant_url?: string;
  photo_apres_url?: string;
  created_at: Date;
  updated_at: Date;
}

// ==========================================
// Vote Types
// ==========================================

export interface Vote {
  id: string;
  signalement_id: string;
  user_id: string;
  vote_type: 'positif';
  created_at: Date;
}

// ==========================================
// Commune Types
// ==========================================

export interface Commune {
  id: string;
  nom: string;
  slug: string;
  region: string;
  localisation: {
    type: 'Point';
    coordinates: [number, number];
  };
  maire_email?: string;
  statut_partenariat: string;
  date_lancement?: Date;
  population_estimee?: number;
  created_at: Date;
  updated_at: Date;
}

// ==========================================
// Quartier Types
// ==========================================

export interface Quartier {
  id: string;
  commune_id: string;
  nom: string;
  slug: string;
  population_estimee?: number;
  zone_prioritaire: boolean;
  created_at: Date;
  updated_at: Date;
}

// ==========================================
// Comment Types
// ==========================================

export interface Commentaire {
  id: string;
  signalement_id: string;
  author_id: string;
  contenu: string;
  parent_id?: string;
  created_at: Date;
  updated_at: Date;
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  statusCode?: number;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ==========================================
// Auth Types
// ==========================================

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload {
  id: string;
  email: string;
  role: UserRole;
}
