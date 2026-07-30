import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroShieldCheck, heroTrash, heroHeart, heroWrenchScrewdriver,
  heroGlobeAlt, heroMapPin, heroHandThumbUp, heroChatBubbleLeftEllipsis,
  heroShare, heroEllipsisHorizontal, heroUserGroup, heroMagnifyingGlass,
  heroFlag, heroBookmark, heroUsers, heroClock, heroUser,
} from '@ng-icons/heroicons/outline';
import { heroHandThumbUpSolid } from '@ng-icons/heroicons/solid';
import { ApiSuccess } from '../core/api';

export type Categorie = 'tous' | 'securite' | 'proprete' | 'entraide' | 'infrastructure';

export interface Publication {
  id: string; titre: string; description: string;
  categorie: Categorie; auteur: string; avatar: string;
  quartier: string; date: string; votes: number;
  commentaires: number; partages: number;
  status: 'cree' | 'en_cours' | 'resolu';
  anonyme: boolean; liked: boolean;
}

const CAT_MAP: Record<string, Categorie> = {
  securite: 'securite', hygiene: 'proprete', entraide: 'entraide',
  communaute: 'entraide', conseil: 'infrastructure', autre: 'proprete',
};

export const FILTRES = [
  { label: 'Tous',            value: 'tous' as Categorie,           icon: 'heroGlobeAlt',         chipColor: 'bg-gray-100 text-gray-700 border-gray-300' },
  { label: 'Sécurité',        value: 'securite' as Categorie,       icon: 'heroShieldCheck',       chipColor: 'bg-red-50 text-red-700 border-red-300' },
  { label: 'Fako (Poubelle)', value: 'proprete' as Categorie,       icon: 'heroTrash',             chipColor: 'bg-green-50 text-green-700 border-green-300' },
  { label: 'Entraide',        value: 'entraide' as Categorie,       icon: 'heroHeart',             chipColor: 'bg-blue-50 text-blue-700 border-blue-300' },
  { label: 'Infrastructure',  value: 'infrastructure' as Categorie, icon: 'heroWrenchScrewdriver', chipColor: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
];

@Component({
  selector: 'app-feed',
  imports: [CommonModule, NgIcon],
  templateUrl: './feed.html',
  viewProviders: [provideIcons({
    heroShieldCheck, heroTrash, heroHeart, heroWrenchScrewdriver,
    heroGlobeAlt, heroMapPin, heroHandThumbUp, heroChatBubbleLeftEllipsis,
    heroShare, heroEllipsisHorizontal, heroUserGroup, heroMagnifyingGlass,
    heroFlag, heroBookmark, heroUsers, heroClock, heroUser, heroHandThumbUpSolid,
  })]
})
export class Feed implements OnInit {
  private http = inject(HttpClient);
  filtreActif = signal<Categorie>('tous');
  filtres = FILTRES;
  publications = signal<Publication[]>([]);
  loading = signal(false);

  menuItems: { label: string; icon: string; active: boolean }[] = [
    { label: 'Fil d\'actualité', icon: 'heroFlag',      active: true  },
    { label: 'Amis',             icon: 'heroUsers',     active: false },
    { label: 'Groupes',          icon: 'heroUserGroup', active: false },
    { label: 'Enregistrés',      icon: 'heroBookmark',  active: false },
    { label: 'Historique',       icon: 'heroClock',     active: false },
  ];

  contacts: never[] = [];

  ngOnInit() {
    this.loadPublications();
  }

  private loadPublications() {
    this.loading.set(true);
    this.http.get<ApiSuccess<any[]>>('/api/publications?limit=50').subscribe({
      next: (res) => {
        this.publications.set((res.data || []).map(this.mapPublication));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private mapPublication(api: any): Publication {
    return {
      id: api.id,
      titre: api.titre,
      description: api.contenu || '',
      categorie: CAT_MAP[api.categorie] || 'proprete',
      auteur: api.auteur || 'Anonyme',
      avatar: (api.pseudonyme || api.auteur || '?').charAt(0).toUpperCase(),
      quartier: api.fokontany_nom || api.commune_nom || '',
      date: api.created_at ? new Date(api.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      votes: api.nb_votes_sondage || 0,
      commentaires: 0,
      partages: 0,
      status: 'cree',
      anonyme: !!api.anonyme,
      liked: false,
    };
  }

  get filtered() {
    const f = this.filtreActif();
    return f === 'tous' ? this.publications() : this.publications().filter(p => p.categorie === f);
  }

  setFiltre(v: Categorie) { this.filtreActif.set(v); }

  toggleLike(pub: Publication) {
    pub.liked = !pub.liked;
    pub.votes += pub.liked ? 1 : -1;
  }

  getCategorieInfo(cat: string) {
    return FILTRES.find(f => f.value === cat) ?? FILTRES[0];
  }

  getStatusLabel(s: string) {
    return ({ cree: 'Nouveau', en_cours: 'En cours', resolu: 'Résolu' } as any)[s] ?? s;
  }

  getStatusColor(s: string) {
    return ({ cree: 'bg-orange-100 text-orange-700', en_cours: 'bg-blue-100 text-blue-700', resolu: 'bg-green-100 text-green-700' } as any)[s] ?? '';
  }
}
