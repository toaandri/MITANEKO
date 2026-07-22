import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { CommuneApiService } from '../../../core/api-services';

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
export class CommuneGroupeDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private communeApi = inject(CommuneApiService);

  groupeId = signal('');
  nouveauMessage = '';
  loading = signal(true);
  error = signal<string | null>(null);

  meta = signal({
    nom: '',
    quartier: '',
    membres: 0,
    avecPolice: false,
    description: '',
  });

  messages = signal<Message[]>([]);
  publications = signal<Array<{ titre: string; contenu: string }>>([]);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.groupeId.set(id);
    if (!id) {
      this.loading.set(false);
      this.error.set('Groupe introuvable.');
      return;
    }

    this.communeApi.getGroupe(id).subscribe({
      next: (res) => {
        const g = res.data;
        this.meta.set({
          nom: g.nom,
          quartier: String(g['commune_nom'] || 'Commune'),
          membres: Array.isArray(g.membres) ? g.membres.length : Number(g.nb_membres || 0),
          avecPolice: false,
          description: g.description || 'Groupe modéré par la commune.',
        });
        this.publications.set(
          (g.publications || []).map((p) => ({
            titre: String(p['titre'] || ''),
            contenu: String(p['contenu'] || ''),
          })),
        );
        this.messages.set(
          (g.membres || []).slice(0, 8).map((m, idx) => ({
            id: String(m['id'] || idx),
            auteur: String(m['pseudonyme'] || m['nom'] || 'Membre'),
            role: 'citoyen',
            contenu: `Membre du groupe (${m['role_dans_groupe'] || 'membre'}).`,
            heure: '',
          })),
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Impossible de charger le groupe.');
      },
    });
  }

  groupe = computed(() => this.meta());

  roleClass(role: Message['role']) {
    const map: Record<Message['role'], string> = {
      commune: 'bg-pink-100 text-pink-700',
      citoyen: 'bg-gray-200 text-gray-700',
      police: 'bg-blue-100 text-blue-700',
    };
    return map[role];
  }

  envoyer() {
    const texte = this.nouveauMessage.trim();
    if (!texte) return;
    this.messages.update((list) => [
      ...list,
      {
        id: `local-${Date.now()}`,
        auteur: 'Commune',
        role: 'commune',
        contenu: texte,
        heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    this.nouveauMessage = '';
  }
}
