import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroMegaphone,
  heroChartBar,
  heroPhoto,
  heroArrowPath,
  heroPlusCircle,
  heroXMark,
  heroCheckCircle,
} from '@ng-icons/heroicons/outline';
import { CommuneNav } from '../commune-nav';

type PubType = 'officielle' | 'sondage' | 'avant_apres' | 'autre';

@Component({
  selector: 'app-commune-creer-publication',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIcon, CommuneNav],
  templateUrl: './creer-publication.html',
  styleUrl: './creer-publication.css',
  viewProviders: [
    provideIcons({
      heroMegaphone,
      heroChartBar,
      heroPhoto,
      heroArrowPath,
      heroPlusCircle,
      heroXMark,
      heroCheckCircle,
    }),
  ],
})
export class CommuneCreerPublication {
  type = signal<PubType>('officielle');
  titre = '';
  contenu = '';
  boutonJeParticipe = true;
  groupeDiscussion = true;
  avecPolice = false;

  sondageQuestion = '';
  options: string[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi'];
  nouvelleOption = '';

  avantUrl = '';
  apresUrl = '';

  republicationSourceId = '';
  statutAvancee: 'evolue' | 'retrouvee' | 'aucun_changement' = 'evolue';

  feedback = signal<string | null>(null);

  types = [
    { id: 'officielle' as PubType, label: 'Annonce officielle', icon: 'heroMegaphone', desc: 'Nettoyage, rondes, alertes…' },
    { id: 'sondage' as PubType, label: 'Sondage', icon: 'heroChartBar', desc: 'Votes avec pourcentages' },
    { id: 'avant_apres' as PubType, label: 'Avant / Après', icon: 'heroPhoto', desc: 'Montrer le résultat concret' },
    { id: 'autre' as PubType, label: 'Republication', icon: 'heroArrowPath', desc: 'Mettre à jour une publication' },
  ];

  isSondage = computed(() => this.type() === 'sondage');
  isOfficielle = computed(() => this.type() === 'officielle');
  isAvantApres = computed(() => this.type() === 'avant_apres');
  isRepublication = computed(() => this.type() === 'autre');

  setType(id: PubType) {
    this.type.set(id);
  }

  addOption() {
    const v = this.nouvelleOption.trim();
    if (!v) return;
    this.options = [...this.options, v];
    this.nouvelleOption = '';
  }

  removeOption(index: number) {
    if (this.options.length <= 2) return;
    this.options = this.options.filter((_, i) => i !== index);
  }

  publier() {
    if (!this.titre.trim()) {
      this.feedback.set('Le titre est obligatoire.');
      return;
    }
    if (this.isSondage() && (!this.sondageQuestion.trim() || this.options.length < 2)) {
      this.feedback.set('Un sondage nécessite une question et au moins 2 options.');
      return;
    }
    this.feedback.set('Publication créée avec succès (aperçu interface).');
    window.setTimeout(() => this.feedback.set(null), 3500);
  }
}
