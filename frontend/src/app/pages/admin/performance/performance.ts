import { Component } from '@angular/core';
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
} from '@ng-icons/heroicons/outline';

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
    }),
  ],
})
export class AdminPerformance {
  mois = 'Juillet 2026';

  nationaux = [
    { label: 'Publications (pays)', value: '12 480', icon: 'heroDocumentText' },
    { label: 'Utilisateurs actifs', value: '86 200', icon: 'heroUsers' },
    { label: 'Votes sondages', value: '41 350', icon: 'heroHandRaised' },
    { label: 'Communes reportant', value: '142', icon: 'heroBuildingOffice2' },
  ];

  /** Pas de classement — affichage neutre par région */
  regions = [
    { nom: 'Analamanga', pubs: 3200, actifs: 21000, securite: 'en baisse', dechets: 'en baisse' },
    { nom: 'Atsinanana', pubs: 1800, actifs: 9800, securite: 'stable', dechets: 'en baisse' },
    { nom: 'Vakinankaratra', pubs: 1400, actifs: 7200, securite: 'en baisse', dechets: 'stable' },
    { nom: 'Diana', pubs: 980, actifs: 5100, securite: 'stable', dechets: 'en baisse' },
    { nom: 'Autres régions', pubs: 5100, actifs: 43100, securite: 'en baisse', dechets: 'en baisse' },
  ];

  impacts = [
    {
      titre: 'Routes plus propres',
      detail: 'Les nettoyages collectifs et les sondages camion poubelle ont réduit les dépôts sauvages signalés.',
    },
    {
      titre: 'Insécurité en baisse',
      detail: 'Les alertes citoyennes et les rondes de quartier avec la police ont accéléré les interventions.',
    },
    {
      titre: 'Vies sauvées',
      detail: 'Exemple : une publication a permis de retrouver une personne disparue à temps.',
    },
  ];
}
