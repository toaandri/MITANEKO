import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroPlusCircle,
  heroDocumentText,
  heroShieldExclamation,
  heroUserGroup,
  heroChartBar,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-commune-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIcon],
  viewProviders: [
    provideIcons({
      heroPlusCircle,
      heroDocumentText,
      heroShieldExclamation,
      heroUserGroup,
      heroChartBar,
    }),
  ],
  template: `
    <nav class="mb-6 overflow-x-auto">
      <div class="flex gap-2 min-w-max">
        @for (link of links; track link.path) {
          <a
            [routerLink]="link.path"
            routerLinkActive="bg-pink-600 text-white border-pink-600"
            class="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
          >
            <ng-icon [name]="link.icon" class="text-base" />
            {{ link.label }}
          </a>
        }
      </div>
    </nav>
  `,
})
export class CommuneNav {
  links = [
    { path: '/commune/creer-publication', label: 'Créer', icon: 'heroPlusCircle' },
    { path: '/commune/publications', label: 'Publications', icon: 'heroDocumentText' },
    { path: '/commune/censure', label: 'Censure', icon: 'heroShieldExclamation' },
    { path: '/commune/groupes', label: 'Groupes', icon: 'heroUserGroup' },
    { path: '/commune/performance', label: 'Performance', icon: 'heroChartBar' },
  ];
}
