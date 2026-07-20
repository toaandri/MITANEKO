import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroHome,
  heroUserGroup,
  heroBell,
  heroMagnifyingGlass,
  heroBars3,
  heroChatBubbleLeftEllipsis,
  heroPlusCircle,
  heroVideoCamera,
  heroShoppingBag,
  heroUser,
  heroMap, // <-- Icône Carte ajoutée
} from '@ng-icons/heroicons/outline';
import {
  heroHomeSolid,
  heroUserGroupSolid,
  heroBellSolid,
} from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIcon],
  viewProviders: [provideIcons({
    heroHome, heroUserGroup, heroBell, heroMagnifyingGlass,
    heroBars3, heroChatBubbleLeftEllipsis, heroPlusCircle,
    heroVideoCamera, heroShoppingBag, heroUser, heroMap,
    heroHomeSolid, heroUserGroupSolid, heroBellSolid,
  })],
  template: `
    <!-- NAVBAR DESKTOP & MOBILE TOP -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm h-14 flex items-center justify-between px-4">

      <!-- Gauche : Logo + Recherche -->
      <div class="flex items-center gap-2 w-[280px]">
        <a routerLink="/feed" class="flex-shrink-0">
          <img src="favicon.ico" alt="logo" class="w-10 h-10" />
        </a>
        <!-- Recherche desktop -->
        <div class="hidden md:flex items-center bg-gray-100 rounded-full px-3 py-2 gap-2 flex-1">
          <ng-icon name="heroMagnifyingGlass" class="text-gray-500 text-sm flex-shrink-0" />
          <input type="text" placeholder="Rechercher sur Mitaneko" class="bg-transparent text-sm outline-none w-full placeholder-gray-500" />
        </div>
        <!-- Recherche mobile -->
        <button class="md:hidden w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <ng-icon name="heroMagnifyingGlass" class="text-gray-800 text-lg" />
        </button>
      </div>

      <!-- Centre : Nav links (desktop seulement) -->
      <nav class="hidden md:flex items-stretch h-14 gap-1">
        <a routerLink="/feed" routerLinkActive="text-pink-600 border-b-[3px] border-pink-600" class="relative flex items-center justify-center w-24 lg:w-36 text-gray-500 hover:bg-gray-100 hover:text-pink-500 rounded-lg transition-colors" title="Accueil">
          <ng-icon name="heroHome" class="text-2xl" />
        </a>
        <a routerLink="/carte" routerLinkActive="text-pink-600 border-b-[3px] border-pink-600" class="relative flex items-center justify-center w-24 lg:w-36 text-gray-500 hover:bg-gray-100 hover:text-pink-500 rounded-lg transition-colors" title="Carte des signalements">
          <ng-icon name="heroMap" class="text-2xl" />
        </a>
        <a routerLink="/feed" class="relative flex items-center justify-center w-24 lg:w-36 text-gray-500 hover:bg-gray-100 hover:text-pink-500 rounded-lg transition-colors" title="Vidéos">
          <ng-icon name="heroVideoCamera" class="text-2xl" />
        </a>
      </nav>

      <!-- Droite : Actions -->
      <div class="flex items-center gap-1 justify-end">
        <!-- BOUTON PLUS DESKTOP -->
        <a routerLink="/nouvelle-publication" class="hidden md:flex w-10 h-10 rounded-full bg-gray-100 items-center justify-center hover:bg-gray-200 transition-colors" title="Créer">
          <ng-icon name="heroPlusCircle" class="text-gray-800 text-xl" />
        </a>

        <button class="hidden md:flex w-10 h-10 rounded-full bg-gray-100 items-center justify-center hover:bg-gray-200 transition-colors" title="Messagerie">
          <ng-icon name="heroChatBubbleLeftEllipsis" class="text-gray-800 text-xl" />
        </button>
        <button class="hidden md:flex w-10 h-10 rounded-full bg-gray-100 items-center justify-center hover:bg-gray-200 transition-colors" title="Notifications">
          <ng-icon name="heroBell" class="text-gray-800 text-xl" />
        </button>
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white cursor-pointer hover:opacity-90 transition-opacity" title="Profil">
          <ng-icon name="heroUser" class="text-xl" />
        </div>
      </div>

    </header>

    <!-- NAV BOTTOM MOBILE -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-center h-14">
      <a routerLink="/feed" routerLinkActive="text-pink-600 border-t-2 border-pink-600" class="flex-1 flex flex-col items-center justify-center h-full text-gray-500 transition-colors">
        <ng-icon name="heroHome" class="text-2xl" />
      </a>
      
      <!-- BOUTON CARTE MOBILE -->
      <a routerLink="/carte" routerLinkActive="text-pink-600 border-t-2 border-pink-600" class="flex-1 flex flex-col items-center justify-center h-full text-gray-500 transition-colors">
        <ng-icon name="heroMap" class="text-2xl" />
      </a>

      <!-- BOUTON PLUS MOBILE -->
      <a routerLink="/nouvelle-publication" class="flex-1 flex flex-col items-center justify-center h-full text-gray-500">
        <div class="w-9 h-9 rounded-md bg-gray-200 flex items-center justify-center">
          <ng-icon name="heroPlusCircle" class="text-gray-800 text-xl" />
        </div>
      </a>

      <button class="flex-1 flex flex-col items-center justify-center h-full text-gray-500">
        <ng-icon name="heroBell" class="text-2xl" />
      </button>
      <button class="flex-1 flex flex-col items-center justify-center h-full text-gray-500">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white">
          <ng-icon name="heroUser" class="text-base" />
        </div>
      </button>
    </nav>
  `
})
export class Header {}