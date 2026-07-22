import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroGlobeAlt,
  heroBuildingOffice2,
  heroChartBar,
  heroUsers,
  heroDocumentText,
  heroHandRaised,
  heroArrowTrendingUp,
  heroCheckCircle,
} from '@ng-icons/heroicons/outline';
import { AdminApiService } from '../../../core/api-services';

@Component({
  selector: 'app-admin-performance',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon],
  templateUrl: './performance.html',
  styleUrl: './performance.css',
  viewProviders: [
    provideIcons({
      heroGlobeAlt,
      heroBuildingOffice2,
      heroChartBar,
      heroUsers,
      heroDocumentText,
      heroHandRaised,
      heroArrowTrendingUp,
      heroCheckCircle,
    }),
  ],
})
export class AdminPerformance implements OnInit {
  private adminApi = inject(AdminApiService);

  mois = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  loading = signal(true);
  error = signal<string | null>(null);
  feedback = signal<string | null>(null);

  nationaux = signal([
    { label: 'Publications (pays)', value: '—', icon: 'heroDocumentText' },
    { label: 'Citoyens actifs', value: '—', icon: 'heroUsers' },
    { label: 'Signalements résolus', value: '—', icon: 'heroHandRaised' },
    { label: 'Communes actives', value: '—', icon: 'heroBuildingOffice2' },
  ]);

  regions = signal<
    Array<{ nom: string; pubs: number; actifs: number; resolus: number; region: string }>
  >([]);

  rapports = signal<Array<{ id: string; titre: string; commune: string; detail: string }>>([]);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.adminApi.dashboard().subscribe({
      next: (res) => {
        const g = res.data.global || {};
        this.nationaux.set([
          {
            label: 'Publications (pays)',
            value: String(g['nb_publications'] ?? 0),
            icon: 'heroDocumentText',
          },
          {
            label: 'Citoyens actifs',
            value: String(g['nb_citoyens'] ?? 0),
            icon: 'heroUsers',
          },
          {
            label: 'Signalements résolus',
            value: String(g['signalements_resolus'] ?? 0),
            icon: 'heroHandRaised',
          },
          {
            label: 'Communes actives',
            value: String(g['nb_communes'] ?? 0),
            icon: 'heroBuildingOffice2',
          },
        ]);

        this.regions.set(
          (res.data.communes || []).map((c) => ({
            nom: String(c['nom'] || ''),
            region: String(c['region'] || '—'),
            pubs: Number(c['nb_publications'] || 0),
            actifs: Number(c['nb_citoyens'] || 0),
            resolus: Number(c['nb_resolus'] || 0),
          })),
        );

        this.rapports.set(
          (res.data.rapports_en_attente || []).map((r) => ({
            id: String(r['id']),
            titre: String(r['titre'] || 'Rapport'),
            commune: String(r['commune_nom'] || ''),
            detail: String(r['contenu'] || 'Rapport de performance à publier.'),
          })),
        );

        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Dashboard admin indisponible.');
      },
    });
  }

  publierRapport(id: string) {
    this.adminApi.publishRapport(id).subscribe({
      next: () => {
        this.feedback.set('Rapport publié sur la page publique.');
        this.rapports.update((list) => list.filter((r) => r.id !== id));
        window.setTimeout(() => this.feedback.set(null), 3500);
      },
      error: (err) => this.error.set(err.error?.message || 'Publication impossible.'),
    });
  }
}
