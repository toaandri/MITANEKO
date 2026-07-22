import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroUserGroup,
  heroUsers,
  heroMapPin,
  heroShieldCheck,
  heroTrash,
  heroChatBubbleLeftRight,
} from '@ng-icons/heroicons/outline';
import { CommuneNav } from '../commune-nav';

interface Groupe {
  id: string;
  nom: string;
  description: string;
  quartier: string;
  membres: number;
  type: 'nettoyage' | 'securite' | 'entraide' | 'discussion';
  avecPolice: boolean;
  actif: boolean;
}

@Component({
  selector: 'app-commune-groupes',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon, CommuneNav],
  templateUrl: './groupes.html',
  styleUrl: './groupes.css',
  viewProviders: [
    provideIcons({
      heroUserGroup,
      heroUsers,
      heroMapPin,
      heroShieldCheck,
      heroTrash,
      heroChatBubbleLeftRight,
    }),
  ],
})
export class CommuneGroupes {
  groupes = signal<Groupe[]>([
    {
      id: 'g1',
      nom: 'Nettoyage Tana 5',
      description: 'Groupe modéré pour les opérations de nettoyage dans la ville de Tana 5.',
      quartier: 'Antananarivo V',
      membres: 64,
      type: 'nettoyage',
      avecPolice: false,
      actif: true,
    },
    {
      id: 'g2',
      nom: 'Rondes Isotry + Police',
      description: 'Organisation des rondes de quartier avec un représentant de la police.',
      quartier: 'Isotry',
      membres: 28,
      type: 'securite',
      avecPolice: true,
      actif: true,
    },
    {
      id: 'g3',
      nom: 'Entraide Analakely',
      description: 'Forum d\'entraide locale : objets perdus, alertes, solidarité.',
      quartier: 'Analakely',
      membres: 112,
      type: 'entraide',
      avecPolice: false,
      actif: true,
    },
    {
      id: 'g4',
      nom: 'Discussion camion poubelle',
      description: 'Groupe lié au sondage sur le passage du camion poubelle.',
      quartier: '67Ha',
      membres: 19,
      type: 'discussion',
      avecPolice: false,
      actif: false,
    },
  ]);

  typeIcon(type: Groupe['type']) {
    return (
      {
        nettoyage: 'heroTrash',
        securite: 'heroShieldCheck',
        entraide: 'heroUserGroup',
        discussion: 'heroChatBubbleLeftRight',
      } as const
    )[type];
  }

  typeLabel(type: Groupe['type']) {
    return (
      {
        nettoyage: 'Nettoyage',
        securite: 'Sécurité',
        entraide: 'Entraide',
        discussion: 'Discussion',
      } as const
    )[type];
  }
}
