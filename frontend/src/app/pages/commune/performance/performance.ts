import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroChartBar,
  heroUsers,
  heroDocumentText,
  heroClock,
  heroArrowTrendingUp,
  heroHandRaised,
  heroPaperAirplane,
} from '@ng-icons/heroicons/outline';
import { CommuneNav } from '../commune-nav';
import { AuthService } from '../../../auth/auth.service';
import { CommuneApiService } from '../../../core/api-services';

@Component({
  selector: 'app-commune-performance',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, CommuneNav],
  templateUrl: './performance.html',
  styleUrl: './performance.css',
  viewProviders: [
    provideIcons({
      heroChartBar,
      heroUsers,
      heroDocumentText,
      heroClock,
      heroArrowTrendingUp,
      heroHandRaised,
      heroPaperAirplane,
    }),
  ],
})
export class CommunePerformance implements OnInit {
  private communeApi = inject(CommuneApiService);
  private auth = inject(AuthService);

  mois = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  commune = 'Votre commune';
  loading = signal(true);
  error = signal<string | null>(null);
  feedback = signal<string | null>(null);

  kpis = signal([
    { label: 'Publications ce mois', value: '—', icon: 'heroDocumentText', hint: '' },
    { label: 'Actifs (7 jours)', value: '—', icon: 'heroUsers', hint: '' },
    { label: 'Participants sondages', value: '—', icon: 'heroHandRaised', hint: '' },
    { label: 'Modération en attente', value: '—', icon: 'heroClock', hint: '' },
  ]);

  heures = signal<number[]>(Array.from({ length: 24 }, () => 0));
  jours = signal<Array<{ label: string; value: number }>>([]);
  retours = signal<Array<{ theme: string; tendance: string; detail: string }>>([]);

  rapportTitre = '';
  tauxDechetsAvant = 100;
  tauxDechetsApres = 70;
  tauxCrimeAvant = 100;
  tauxCrimeApres = 70;
  submitting = signal(false);

  maxHeure = computed(() => Math.max(...this.heures(), 1));
  maxJour = computed(() => Math.max(...this.jours().map((j) => j.value), 1));

  ngOnInit() {
    this.communeApi.dashboard().subscribe({
      next: (res) => {
        const d = res.data;
        const r = d.resume;
        this.kpis.set([
          {
            label: 'Publications ce mois',
            value: String(r.nb_publications_mois ?? 0),
            icon: 'heroDocumentText',
            hint: `${r.signalements_resolus_mois ?? 0} signalements résolus`,
          },
          {
            label: 'Actifs (7 jours)',
            value: String(r.nb_actifs_semaine ?? 0),
            icon: 'heroUsers',
            hint: `${r.nb_citoyens ?? 0} citoyens`,
          },
          {
            label: 'Votes sondages',
            value: String(r.nb_votes_sondages_mois ?? 0),
            icon: 'heroHandRaised',
            hint: `${r.nb_participations_mois ?? 0} participations`,
          },
          {
            label: 'Modération en attente',
            value: String(r.moderation_en_attente ?? 0),
            icon: 'heroClock',
            hint: 'File de censure',
          },
        ]);

        const heuresArr = Array.from({ length: 24 }, () => 0);
        for (const h of d.connexions_par_heure || []) {
          if (h.heure >= 0 && h.heure < 24) heuresArr[h.heure] = h.nb;
        }
        this.heures.set(heuresArr);

        this.jours.set(
          (d.publications_par_jour || []).slice(-7).map((j) => ({
            label: new Date(j.jour).toLocaleDateString('fr-FR', { weekday: 'short' }),
            value: j.nb,
          })),
        );

        this.retours.set(
          (d.performance_quartiers || []).slice(0, 5).map((q) => ({
            theme: q.nom,
            tendance: q.nb_resolus > 0 ? 'en baisse (problèmes traités)' : 'à suivre',
            detail: `${q.nb_publications} pubs · ${q.nb_signalements} signalements · ${q.nb_resolus} résolus`,
          })),
        );

        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Dashboard indisponible.');
      },
    });
  }

  barHeight(value: number, max: number) {
    return Math.max(8, Math.round((value / max) * 100));
  }

  soumettreRapport() {
    const now = new Date();
    const debut = new Date(now.getFullYear(), now.getMonth(), 1);
    this.submitting.set(true);
    this.communeApi
      .createRapport({
        titre: this.rapportTitre.trim() || `Rapport ${this.mois}`,
        contenu: `Rapport performance soumis par ${this.auth.user()?.prenom || 'commune'}.`,
        periode_debut: debut.toISOString().slice(0, 10),
        periode_fin: now.toISOString().slice(0, 10),
        indicateurs: {
          taux_dechets_avant: this.tauxDechetsAvant,
          taux_dechets_apres: this.tauxDechetsApres,
          taux_criminalite_avant: this.tauxCrimeAvant,
          taux_criminalite_apres: this.tauxCrimeApres,
        },
      })
      .subscribe({
        next: (res) => {
          const id = (res.data as { id?: string })?.id;
          if (!id) {
            this.submitting.set(false);
            this.feedback.set('Rapport créé.');
            return;
          }
          this.communeApi.submitRapport(id).subscribe({
            next: () => {
              this.submitting.set(false);
              this.feedback.set('Rapport soumis à l’administration.');
            },
            error: (err) => {
              this.submitting.set(false);
              this.error.set(err.error?.message || 'Soumission impossible.');
            },
          });
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err.error?.message || 'Création du rapport impossible.');
        },
      });
  }
}
