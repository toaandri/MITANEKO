import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroHandRaised,
  heroChartBar,
  heroPhoto,
  heroMegaphone,
  heroUsers,
  heroArrowPath,
} from '@ng-icons/heroicons/outline';
import { CommuneNav } from '../commune-nav';

type PubType = 'officielle' | 'sondage' | 'avant_apres' | 'republication';

interface SondageOption {
  label: string;
  votes: number;
}

interface Publication {
  id: string;
  type: PubType;
  titre: string;
  contenu: string;
  date: string;
  auteur: string;
  participants?: number;
  sondage?: SondageOption[];
  statut?: string;
}

@Component({
  selector: 'app-commune-publications',
  standalone: true,
  imports: [CommonModule, NgIcon, CommuneNav],
  templateUrl: './publications.html',
  styleUrl: './publications.css',
  viewProviders: [
    provideIcons({
      heroHandRaised,
      heroChartBar,
      heroPhoto,
      heroMegaphone,
      heroUsers,
      heroArrowPath,
    }),
  ],
})
export class CommunePublications {
  filtre = signal<'toutes' | PubType>('toutes');

  publications = signal<Publication[]>([
    {
      id: '1',
      type: 'officielle',
      titre: 'Nettoyage massif des routes — samedi 10h',
      contenu: 'Rendez-vous devant la mairie d\'Analakely. Gants et sacs fournis.',
      date: '2026-07-20',
      auteur: 'Commune Antananarivo Renivohitra',
      participants: 48,
    },
    {
      id: '2',
      type: 'sondage',
      titre: 'Passage du camion poubelle',
      contenu: 'Quel jour préférez-vous pour le passage du camion poubelle ?',
      date: '2026-07-18',
      auteur: 'Commune Antananarivo Renivohitra',
      sondage: [
        { label: 'Lundi', votes: 42 },
        { label: 'Mardi', votes: 28 },
        { label: 'Mercredi', votes: 61 },
        { label: 'Jeudi', votes: 19 },
      ],
    },
    {
      id: '3',
      type: 'officielle',
      titre: 'Rondes de quartier — unissons-nous',
      contenu: 'Organisons des rondes avec l\'aide de la police. Cliquez Je participe pour rejoindre le groupe.',
      date: '2026-07-17',
      auteur: 'Commune Antananarivo Renivohitra',
      participants: 23,
    },
    {
      id: '4',
      type: 'avant_apres',
      titre: 'Rue Isotry — avant / après nettoyage',
      contenu: 'Grâce à la mobilisation citoyenne, la rue est redevenue praticable.',
      date: '2026-07-15',
      auteur: 'Commune Antananarivo Renivohitra',
    },
    {
      id: '5',
      type: 'republication',
      titre: 'On a enfin retrouvé Ann',
      contenu: 'Mise à jour : la personne recherchée a été retrouvée saine et sauve.',
      date: '2026-07-14',
      auteur: 'Citoyen + Commune',
      statut: 'retrouvee',
    },
  ]);

  filtres = [
    { id: 'toutes' as const, label: 'Toutes' },
    { id: 'officielle' as const, label: 'Officielles' },
    { id: 'sondage' as const, label: 'Sondages' },
    { id: 'avant_apres' as const, label: 'Avant/Après' },
    { id: 'republication' as const, label: 'Republications' },
  ];

  filtered = computed(() => {
    const f = this.filtre();
    const all = this.publications();
    return f === 'toutes' ? all : all.filter((p) => p.type === f);
  });

  setFiltre(id: 'toutes' | PubType) {
    this.filtre.set(id);
  }

  typeIcon(type: PubType) {
    return (
      {
        officielle: 'heroMegaphone',
        sondage: 'heroChartBar',
        avant_apres: 'heroPhoto',
        republication: 'heroArrowPath',
      } as const
    )[type];
  }

  typeLabel(type: PubType) {
    return (
      {
        officielle: 'Annonce officielle',
        sondage: 'Sondage',
        avant_apres: 'Avant / Après',
        republication: 'Republication',
      } as const
    )[type];
  }

  totalVotes(options: SondageOption[]) {
    return options.reduce((sum, o) => sum + o.votes, 0) || 1;
  }

  percent(votes: number, options: SondageOption[]) {
    return Math.round((votes / this.totalVotes(options)) * 100);
  }

  topOption(options: SondageOption[]) {
    return [...options].sort((a, b) => b.votes - a.votes)[0];
  }

  participer(pub: Publication) {
    pub.participants = (pub.participants ?? 0) + 1;
  }
}
