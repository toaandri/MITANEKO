import { Component, computed, signal } from '@angular/core';
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

type FlagReason = 'insultes' | 'obscène' | '18+' | 'violence' | 'sensible';
type SanctionType = 'supprimer' | 'suspendre_auteur' | 'suspendre_commentateurs' | 'bannir';

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
export class CommuneCensure {
  selectedId = signal<string | null>(null);
  sanction: SanctionType = 'supprimer';
  dureeValeur = 7;
  dureeUnite: 'jours' | 'mois' = 'jours';
  feedback = signal<string | null>(null);

  items = signal<FlaggedPublication[]>([
    {
      id: 'f1',
      titre: 'Commentaire agressif sous un signalement',
      extrait: 'Publication signalée pour insultes répétées envers un voisin.',
      auteur: 'user_392',
      date: '2026-07-21',
      raison: 'insultes',
      scoreIA: 0.91,
      analysis: 'IA Eric : langage insultant détecté (confiance 91%).',
      recidive: 0,
      statut: 'en_attente',
    },
    {
      id: 'f2',
      titre: 'Vidéo sensible — zone publique',
      extrait: 'Contenu potentiellement 18+ partagé dans un fil fokontany.',
      auteur: 'user_118',
      date: '2026-07-20',
      raison: '18+',
      scoreIA: 0.87,
      analysis: 'IA Eric : contenu sensible / adulte probable (confiance 87%).',
      recidive: 1,
      statut: 'en_attente',
    },
    {
      id: 'f3',
      titre: 'Image violente signalée',
      extrait: 'Scène extrêmement violente signalée par 4 citoyens.',
      auteur: 'user_055',
      date: '2026-07-19',
      raison: 'violence',
      scoreIA: 0.96,
      analysis: 'IA Eric : violence graphique forte (confiance 96%).',
      recidive: 2,
      statut: 'en_attente',
    },
  ]);

  pending = computed(() => this.items().filter((i) => i.statut === 'en_attente'));
  selected = computed(() => this.items().find((i) => i.id === this.selectedId()) ?? null);

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
    };
    return map[raison];
  }

  appliquerSanction() {
    const item = this.selected();
    if (!item) return;

    let message = '';
    if (this.sanction === 'supprimer') {
      message = `Publication « ${item.titre} » supprimée.`;
    } else if (this.sanction === 'bannir' || item.recidive >= 2) {
      message = `Auteur ${item.auteur} banni (récidive).`;
    } else if (this.sanction === 'suspendre_auteur') {
      message = `Auteur ${item.auteur} suspendu ${this.dureeValeur} ${this.dureeUnite}.`;
    } else {
      message = `Auteurs des commentaires suspendus ${this.dureeValeur} ${this.dureeUnite}.`;
    }

    this.items.update((list) =>
      list.map((i) => (i.id === item.id ? { ...i, statut: 'traitee' } : i)),
    );
    this.selectedId.set(null);
    this.feedback.set(message);
    window.setTimeout(() => this.feedback.set(null), 4000);
  }
}
