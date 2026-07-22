import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroHandRaised,
  heroChartBar,
  heroPhoto,
  heroMegaphone,
  heroUsers,
  heroArrowPath,
} from '@ng-icons/heroicons/outline';
import { CommuneNav } from '../commune-nav';
import {
  CommuneApiService,
  CommunePublication,
  PublicationsApiService,
} from '../../../core/api-services';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

type PubType = 'officielle' | 'sondage' | 'avant_apres' | 'republication' | 'participation' | 'standard';

interface SondageOption {
  id?: string;
  label: string;
  votes: number;
}

interface PublicationView {
  id: string;
  type: PubType;
  titre: string;
  contenu: string;
  date: string;
  auteur: string;
  participants?: number;
  sondage?: SondageOption[];
  statut?: string | null;
  participationActive?: boolean;
}

@Component({
  selector: 'app-commune-publications',
  standalone: true,
  imports: [CommonModule, NgIcon, CommuneNav],
  templateUrl: './publications.html',
  styleUrl: './publications.css',
  viewProviders: [
    provideIcons({
      heroHandRaised,
      heroChartBar,
      heroPhoto,
      heroMegaphone,
      heroUsers,
      heroArrowPath,
    }),
  ],
})
export class CommunePublications implements OnInit {
  private communeApi = inject(CommuneApiService);
  private publicationsApi = inject(PublicationsApiService);

  filtre = signal<'toutes' | PubType>('toutes');
  publications = signal<PublicationView[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  feedback = signal<string | null>(null);

  filtres = [
    { id: 'toutes' as const, label: 'Toutes' },
    { id: 'officielle' as const, label: 'Officielles' },
    { id: 'sondage' as const, label: 'Sondages' },
    { id: 'participation' as const, label: 'Participation' },
    { id: 'republication' as const, label: 'Mises à jour' },
  ];

  filtered = computed(() => {
    const f = this.filtre();
    const all = this.publications();
    if (f === 'toutes') return all;
    if (f === 'officielle') {
      return all.filter((p) => p.type === 'officielle' || p.type === 'participation');
    }
    if (f === 'republication') {
      return all.filter((p) => p.type === 'republication' || !!p.statut);
    }
    return all.filter((p) => p.type === f);
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.communeApi.feed({ limit: 50 }).subscribe({
      next: (res) => {
        const rows = res.data || [];
        const sondageIds = rows
          .filter((r) => r.type_publication === 'sondage')
          .map((r) => r.id);

        const sondageCalls = sondageIds.length
          ? forkJoin(
              sondageIds.map((id) =>
                this.publicationsApi.getSondage(id).pipe(
                  map((s) => ({ id, options: s.data?.options || [] })),
                  catchError(() => of({ id, options: [] as SondageOption[] })),
                ),
              ),
            )
          : of([] as Array<{ id: string; options: SondageOption[] }>);

        sondageCalls.subscribe((sondages) => {
          const byId = new Map(sondages.map((s) => [s.id, s.options]));
          this.publications.set(rows.map((r) => this.mapPub(r, byId.get(r.id))));
          this.loading.set(false);
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Impossible de charger le fil.');
      },
    });
  }

  private mapPub(r: CommunePublication, sondage?: SondageOption[]): PublicationView {
    let type = (r.type_publication || 'standard') as PubType;
    if (r.parent_publication_id || r.type_publication === 'mise_a_jour') {
      type = 'republication';
    }
    return {
      id: r.id,
      type,
      titre: r.titre,
      contenu: r.contenu,
      date: r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '',
      auteur: r.auteur || 'Commune',
      participants: r.nb_participants ?? 0,
      sondage: sondage?.map((o) => ({
        id: o.id,
        label: o.label,
        votes: o.votes ?? 0,
      })),
      statut: r.statut_mise_a_jour,
      participationActive: !!r.participation_active || r.type_publication === 'participation',
    };
  }

  setFiltre(id: 'toutes' | PubType) {
    this.filtre.set(id);
  }

  typeIcon(type: PubType) {
    const map: Record<string, string> = {
      officielle: 'heroMegaphone',
      participation: 'heroHandRaised',
      sondage: 'heroChartBar',
      avant_apres: 'heroPhoto',
      republication: 'heroArrowPath',
      standard: 'heroMegaphone',
    };
    return map[type] || 'heroMegaphone';
  }

  typeLabel(type: PubType) {
    const map: Record<string, string> = {
      officielle: 'Annonce officielle',
      participation: 'Participation',
      sondage: 'Sondage',
      avant_apres: 'Avant / Après',
      republication: 'Republication',
      standard: 'Publication',
    };
    return map[type] || type;
  }

  totalVotes(options: SondageOption[]) {
    return options.reduce((sum, o) => sum + o.votes, 0) || 1;
  }

  percent(votes: number, options: SondageOption[]) {
    return Math.round((votes / this.totalVotes(options)) * 100);
  }

  topOption(options: SondageOption[]) {
    return [...options].sort((a, b) => b.votes - a.votes)[0];
  }

  participer(pub: PublicationView) {
    this.publicationsApi.participer(pub.id).subscribe({
      next: () => {
        pub.participants = (pub.participants ?? 0) + 1;
        this.feedback.set('Participation enregistrée — groupe d’entraide créé si besoin.');
        window.setTimeout(() => this.feedback.set(null), 3500);
      },
      error: (err) => {
        this.feedback.set(err.error?.message || 'Participation impossible.');
        window.setTimeout(() => this.feedback.set(null), 3500);
      },
    });
  }
}
