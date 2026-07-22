import { Component } from '@angular/core';
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
export class PublicResultats {
  stats = [
    { label: 'Citoyens mobilisés', value: '86 200+', icon: 'heroUsers' },
    { label: 'Signalements traités', value: '12 480', icon: 'heroSparkles' },
    { label: 'Zones plus sûres', value: '142 communes', icon: 'heroShieldCheck' },
  ];

  histoires = [
    {
      titre: 'On a enfin retrouvé Ann',
      texte: 'Une publication citoyenne a permis de localiser une personne disparue à temps.',
      tag: 'Entraide',
    },
    {
      titre: 'Rue Isotry — avant / après',
      texte: 'Grâce aux nettoyages collectifs, la rue est redevenue praticable.',
      tag: 'Propreté',
    },
    {
      titre: 'Rondes de quartier',
      texte: 'Des groupes citoyens + police ont réduit les zones à risque signalées.',
      tag: 'Sécurité',
    },
  ];
}
