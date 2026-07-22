import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroChartBar,
  heroUsers,
  heroDocumentText,
  heroClock,
  heroArrowTrendingUp,
  heroHandRaised,
} from '@ng-icons/heroicons/outline';
import { CommuneNav } from '../commune-nav';

@Component({
  selector: 'app-commune-performance',
  standalone: true,
  imports: [CommonModule, NgIcon, CommuneNav],
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
    }),
  ],
})
export class CommunePerformance {
  mois = 'Juillet 2026';
  commune = 'Antananarivo Renivohitra';

  kpis = [
    { label: 'Publications ce mois', value: '186', icon: 'heroDocumentText', hint: '+12% vs mois dernier' },
    { label: 'Pics simultanés (semaine)', value: '842', icon: 'heroUsers', hint: 'Max utilisateurs connectés' },
    { label: 'Participants sondages', value: '1 240', icon: 'heroHandRaised', hint: 'Votes ce mois' },
    { label: 'Heures actives / jour', value: '18h–21h', icon: 'heroClock', hint: 'Créneau le plus chargé' },
  ];

  /** Utilisateurs connectés par heure (mock 0–23) */
  heures = signal([
    12, 8, 5, 3, 2, 4, 18, 45, 72, 88, 95, 110,
    120, 115, 98, 90, 105, 140, 180, 210, 165, 95, 48, 22,
  ]);

  /** Connectés par jour de la semaine */
  jours = [
    { label: 'Lun', value: 620 },
    { label: 'Mar', value: 710 },
    { label: 'Mer', value: 780 },
    { label: 'Jeu', value: 740 },
    { label: 'Ven', value: 820 },
    { label: 'Sam', value: 910 },
    { label: 'Dim', value: 680 },
  ];

  retours = [
    { theme: 'Insécurité', tendance: 'en baisse', detail: 'Signalements dangereux traités plus vite grâce aux alertes citoyennes.' },
    { theme: 'Déchets', tendance: 'en baisse', detail: 'Nettoyages collectifs + sondage camion poubelle mieux ciblé.' },
    { theme: 'Entraide', tendance: 'en hausse', detail: 'Plus de groupes actifs et de boutons « Je participe ».' },
  ];

  maxHeure = computed(() => Math.max(...this.heures(), 1));
  maxJour = Math.max(...this.jours.map((j) => j.value), 1);

  barHeight(value: number, max: number) {
    return Math.max(8, Math.round((value / max) * 100));
  }
}
