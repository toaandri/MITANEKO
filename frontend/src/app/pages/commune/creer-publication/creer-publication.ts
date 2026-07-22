import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
import { CommuneApiService, PublicationsApiService } from '../../../core/api-services';

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
  private communeApi = inject(CommuneApiService);
  private publicationsApi = inject(PublicationsApiService);
  private router = inject(Router);

  type = signal<PubType>('officielle');
  titre = '';
  contenu = '';
  categorie: 'securite' | 'entraide' | 'hygiene' | 'communaute' | 'conseil' | 'autre' = 'communaute';
  boutonJeParticipe = true;
  groupeDiscussion = true;
  avecPolice = false;
  representantPolice = '';

  sondageQuestion = '';
  options: string[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi'];
  nouvelleOption = '';

  avantUrl = '';
  apresUrl = '';

  republicationSourceId = '';
  statutAvancee: 'evolue' | 'retrouvee' | 'aucun_changement' = 'evolue';

  feedback = signal<string | null>(null);
  error = signal<string | null>(null);
  loading = signal(false);

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
    this.error.set(null);
    this.feedback.set(null);

    if (this.isRepublication()) {
      this.republier();
      return;
    }

    if (!this.titre.trim() || !this.contenu.trim()) {
      this.error.set('Le titre et le contenu sont obligatoires.');
      return;
    }
    if (this.isSondage() && this.options.filter((o) => o.trim()).length < 2) {
      this.error.set('Un sondage nécessite au moins 2 options.');
      return;
    }

    const participation =
      this.isOfficielle() && this.boutonJeParticipe
        ? true
        : this.isAvantApres()
          ? false
          : false;

    const type_publication = this.isSondage()
      ? 'sondage'
      : participation
        ? 'participation'
        : 'officielle';

    const contenu =
      this.isSondage() && this.sondageQuestion.trim()
        ? `${this.sondageQuestion.trim()}\n\n${this.contenu.trim()}`
        : this.isAvantApres()
          ? `${this.contenu.trim()}\n\nAvant: ${this.avantUrl || '—'}\nAprès: ${this.apresUrl || '—'}`
          : this.contenu.trim();

    this.loading.set(true);
    this.communeApi
      .createPublication({
        titre: this.titre.trim(),
        contenu,
        categorie: this.categorie,
        type_publication,
        portee: 'commune',
        participation_active: participation || this.boutonJeParticipe,
        representant_police: this.avecPolice ? this.representantPolice || 'Police locale' : null,
        options_sondage: this.isSondage() ? this.options.map((o) => o.trim()).filter(Boolean) : undefined,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.feedback.set('Publication créée avec succès.');
          window.setTimeout(() => this.router.navigateByUrl('/commune/publications'), 800);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.message || 'Échec de la publication.');
        },
      });
  }

  private republier() {
    if (!this.republicationSourceId.trim() || !this.contenu.trim()) {
      this.error.set('ID de publication source et contenu requis pour republier.');
      return;
    }
    this.loading.set(true);
    this.publicationsApi
      .republier(this.republicationSourceId.trim(), {
        contenu: this.contenu.trim(),
        statut_mise_a_jour: this.statutAvancee,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.feedback.set('Republication créée (limite 1× / jour / publication).');
          window.setTimeout(() => this.router.navigateByUrl('/commune/publications'), 800);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.message || 'Échec de la republication.');
        },
      });
  }
}
