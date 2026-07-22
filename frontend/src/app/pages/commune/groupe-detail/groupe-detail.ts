import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroArrowLeft,
  heroUsers,
  heroMapPin,
  heroPaperAirplane,
  heroShieldCheck,
} from '@ng-icons/heroicons/outline';
import { CommuneNav } from '../commune-nav';

interface Message {
  id: string;
  auteur: string;
  role: 'commune' | 'citoyen' | 'police';
  contenu: string;
  heure: string;
}

@Component({
  selector: 'app-commune-groupe-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIcon, CommuneNav],
  templateUrl: './groupe-detail.html',
  styleUrl: './groupe-detail.css',
  viewProviders: [
    provideIcons({
      heroArrowLeft,
      heroUsers,
      heroMapPin,
      heroPaperAirplane,
      heroShieldCheck,
    }),
  ],
})
export class CommuneGroupeDetail {
  groupeId = signal('g1');
  nouveauMessage = '';

  private readonly groupesMeta: Record<
    string,
    { nom: string; quartier: string; membres: number; avecPolice: boolean; description: string }
  > = {
    g1: {
      nom: 'Nettoyage Tana 5',
      quartier: 'Antananarivo V',
      membres: 64,
      avecPolice: false,
      description: 'Organisation du nettoyage : lieu, heure, matériel.',
    },
    g2: {
      nom: 'Rondes Isotry + Police',
      quartier: 'Isotry',
      membres: 28,
      avecPolice: true,
      description: 'Échanges sur les rondes, présence et horaires avec la police.',
    },
    g3: {
      nom: 'Entraide Analakely',
      quartier: 'Analakely',
      membres: 112,
      avecPolice: false,
      description: 'Forum d\'entraide du quartier.',
    },
    g4: {
      nom: 'Discussion camion poubelle',
      quartier: '67Ha',
      membres: 19,
      avecPolice: false,
      description: 'Suite du sondage sur le passage du camion.',
    },
  };

  messages = signal<Message[]>([
    {
      id: 'm1',
      auteur: 'Commune',
      role: 'commune',
      contenu: 'Bienvenue dans le groupe. Indiquez votre disponibilité et le point de rendez-vous.',
      heure: '09:12',
    },
    {
      id: 'm2',
      auteur: 'Miora R.',
      role: 'citoyen',
      contenu: 'Je peux venir samedi à 10h près du marché.',
      heure: '09:18',
    },
    {
      id: 'm3',
      auteur: 'Police - Agent Ravo',
      role: 'police',
      contenu: 'Pour les rondes, on propose un départ à 19h30 au carrefour principal.',
      heure: '09:25',
    },
    {
      id: 'm4',
      auteur: 'Hery T.',
      role: 'citoyen',
      contenu: 'Je participe. On emmène des lampes de poche ?',
      heure: '09:31',
    },
  ]);

  meta = computed(() => this.groupesMeta[this.groupeId()] ?? this.groupesMeta['g1']);

  constructor(route: ActivatedRoute) {
    const id = route.snapshot.paramMap.get('id') ?? 'g1';
    this.groupeId.set(id);
  }

  roleClass(role: Message['role']) {
    return (
      {
        commune: 'bg-pink-100 text-pink-700',
        citoyen: 'bg-gray-100 text-gray-700',
        police: 'bg-blue-100 text-blue-700',
      } as const
    )[role];
  }

  envoyer() {
    const text = this.nouveauMessage.trim();
    if (!text) return;
    this.messages.update((list) => [
      ...list,
      {
        id: `m${Date.now()}`,
        auteur: 'Vous (Commune)',
        role: 'commune',
        contenu: text,
        heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    this.nouveauMessage = '';
  }
}
