import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroShieldExclamation,
  heroNoSymbol,
  heroClock,
  heroEye,
  heroTrash,
  heroCheckCircle,
} from '@ng-icons/heroicons/outline';
import { CommuneNav } from '../commune-nav';
import { ModerationApiService } from '../../../core/api-services';

type FlagReason = 'insultes' | 'obscène' | '18+' | 'violence' | 'sensible' | 'autre';
type SanctionType = 'supprimer' | 'suspendre_auteur' | 'approuver' | 'bannir';

interface FlaggedPublication {
  id: string;
  titre: string;
  extrait: string;
  auteur: string;
  date: string;
  raison: FlagReason;
  scoreIA: number;
  analysis: string;
  recidive: number;
  statut: 'en_attente' | 'traitee';
}

@Component({
  selector: 'app-commune-censure',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, CommuneNav],
  templateUrl: './censure.html',
  styleUrl: './censure.css',
  viewProviders: [
    provideIcons({
      heroShieldExclamation,
      heroNoSymbol,
      heroClock,
      heroEye,
      heroTrash,
      heroCheckCircle,
    }),
  ],
})
export class CommuneCensure implements OnInit {
  private moderationApi = inject(ModerationApiService);

  selectedId = signal<string | null>(null);
  sanction: SanctionType = 'supprimer';
  dureeValeur = 7;
  dureeUnite: 'jours' | 'mois' = 'jours';
  feedback = signal<string | null>(null);
  error = signal<string | null>(null);
  loading = signal(true);
  items = signal<FlaggedPublication[]>([]);

  pending = computed(() => this.items().filter((i) => i.statut === 'en_attente'));
  selected = computed(() => this.items().find((i) => i.id === this.selectedId()) ?? null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.moderationApi.queue().subscribe({
      next: (res) => {
        const file = res.data?.file_ia || [];
        this.items.set(
          file.map((row) => {
            const ia = (row['ia_result'] as Record<string, unknown>) || {};
            const conf = Number(ia['confiance'] ?? ia['score'] ?? 0.7);
            return {
              id: String(row['id']),
              titre: String(row['contenu_apercu'] || row['entity_type'] || 'Contenu signalé'),
              extrait: String(row['raison'] || row['motif'] || 'À examiner'),
              auteur: String(row['signale_par'] || 'système'),
              date: row['created_at']
                ? new Date(String(row['created_at'])).toLocaleDateString('fr-FR')
                : '',
              raison: this.mapRaison(String(row['raison'] || ia['categorie'] || 'autre')),
              scoreIA: conf > 1 ? conf / 100 : conf,
              analysis: String(
                ia['explication'] || ia['action_recommandee'] || 'Analyse IA / signalement citoyen',
              ),
              recidive: Number(row['nb_signalements'] || 0),
              statut: 'en_attente',
            } satisfies FlaggedPublication;
          }),
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Impossible de charger la file de censure.');
      },
    });
  }

  private mapRaison(raw: string): FlagReason {
    const v = raw.toLowerCase();
    if (v.includes('insult')) return 'insultes';
    if (v.includes('18') || v.includes('adulte')) return '18+';
    if (v.includes('viol')) return 'violence';
    if (v.includes('obsc')) return 'obscène';
    if (v.includes('sensib')) return 'sensible';
    return 'autre';
  }

  select(id: string) {
    this.selectedId.set(id);
  }

  raisonClass(raison: FlagReason) {
    const map: Record<FlagReason, string> = {
      insultes: 'bg-orange-100 text-orange-700',
      obscène: 'bg-purple-100 text-purple-700',
      '18+': 'bg-pink-100 text-pink-700',
      violence: 'bg-red-100 text-red-700',
      sensible: 'bg-amber-100 text-amber-700',
      autre: 'bg-gray-100 text-gray-700',
    };
    return map[raison];
  }

  appliquerSanction() {
    const item = this.selected();
    if (!item) return;

    const payload: {
      action: 'approuver' | 'supprimer' | 'suspendre_auteur' | 'ignorer';
      motif?: string;
      duree_jours?: number;
      duree_mois?: number;
      bannissement?: boolean;
    } = {
      action: this.sanction === 'bannir' ? 'suspendre_auteur' : this.sanction,
      motif: `Modération commune — ${this.sanction}`,
    };

    if (this.sanction === 'bannir') {
      payload.bannissement = true;
    } else if (this.sanction === 'suspendre_auteur') {
      if (this.dureeUnite === 'mois') payload.duree_mois = this.dureeValeur;
      else payload.duree_jours = this.dureeValeur;
    }

    this.moderationApi.applyAction(item.id, payload).subscribe({
      next: () => {
        this.items.update((list) =>
          list.map((i) => (i.id === item.id ? { ...i, statut: 'traitee' } : i)),
        );
        this.selectedId.set(null);
        this.feedback.set('Action de modération appliquée.');
        window.setTimeout(() => this.feedback.set(null), 3500);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Échec de la sanction.');
      },
    });
  }
}
