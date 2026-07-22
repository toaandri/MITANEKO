import { Component, OnInit, inject, signal } from '@angular/core';
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
import { CommuneApiService, CommuneGroupe } from '../../../core/api-services';

interface GroupeView {
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
export class CommuneGroupes implements OnInit {
  private communeApi = inject(CommuneApiService);

  groupes = signal<GroupeView[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.communeApi.listGroupes().subscribe({
      next: (res) => {
        this.groupes.set((res.data || []).map((g) => this.mapGroupe(g)));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Impossible de charger les groupes.');
      },
    });
  }

  private mapGroupe(g: CommuneGroupe): GroupeView {
    const nom = (g.nom || '').toLowerCase();
    let type: GroupeView['type'] = 'discussion';
    if (nom.includes('nettoy') || nom.includes('assain')) type = 'nettoyage';
    else if (nom.includes('ronde') || nom.includes('sécur') || nom.includes('secur')) type = 'securite';
    else if (nom.includes('entraid')) type = 'entraide';

    return {
      id: g.id,
      nom: g.nom,
      description: g.description || 'Groupe modéré par la commune.',
      quartier: g.commune_nom || 'Commune',
      membres: g.nb_membres ?? 0,
      type,
      avecPolice: type === 'securite',
      actif: g.is_active !== false,
    };
  }

  typeIcon(type: GroupeView['type']) {
    return (
      {
        nettoyage: 'heroTrash',
        securite: 'heroShieldCheck',
        entraide: 'heroUserGroup',
        discussion: 'heroChatBubbleLeftRight',
      } as const
    )[type];
  }

  typeLabel(type: GroupeView['type']) {
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
