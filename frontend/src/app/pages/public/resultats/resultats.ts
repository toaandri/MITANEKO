import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroGlobeAlt,
  heroSparkles,
  heroShieldCheck,
  heroTrash,
  heroHeart,
  heroUsers,
} from '@ng-icons/heroicons/outline';
import { PublicApiService } from '../../../core/api-services';

@Component({
  selector: 'app-public-resultats',
  standalone: true,
  imports: [CommonModule, NgIcon],
  templateUrl: './resultats.html',
  styleUrl: './resultats.css',
  viewProviders: [
    provideIcons({
      heroGlobeAlt,
      heroSparkles,
      heroShieldCheck,
      heroTrash,
      heroHeart,
      heroUsers,
    }),
  ],
})
export class PublicResultats implements OnInit {
  private publicApi = inject(PublicApiService);

  loading = signal(true);
  error = signal<string | null>(null);

  stats = signal([
    { label: 'Citoyens mobilisés', value: '—', icon: 'heroUsers' },
    { label: 'Problèmes résolus', value: '—', icon: 'heroSparkles' },
    { label: 'Communes partenaires', value: '—', icon: 'heroShieldCheck' },
  ]);

  histoires = signal<Array<{ titre: string; texte: string; tag: string }>>([]);

  ngOnInit() {
    this.publicApi.impact().subscribe({
      next: (res) => {
        const r = res.data.resume || {};
        this.stats.set([
          {
            label: 'Citoyens mobilisés',
            value: String(r['citoyens_actifs'] ?? 0),
            icon: 'heroUsers',
          },
          {
            label: 'Problèmes résolus',
            value: String(r['problemes_resolus'] ?? 0),
            icon: 'heroSparkles',
          },
          {
            label: 'Communes partenaires',
            value: String(r['communes_partenaires'] ?? 0),
            icon: 'heroShieldCheck',
          },
        ]);

        this.histoires.set(
          (res.data.stories || []).map((s) => ({
            titre: String(s['titre'] || 'Impact'),
            texte: String(s['contenu'] || ''),
            tag: String(s['commune_nom'] || s['region'] || 'National'),
          })),
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Impossible de charger les résultats publics.');
      },
    });
  }
}
