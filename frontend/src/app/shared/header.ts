import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  template: `
    <header class="w-full bg-white border-b-2 border-pink-100 py-4 px-6 shadow-sm">
      <div class="flex items-center gap-3">
        <img src="favicon.ico" alt="Mitaneko logo" class="w-8 h-8" />
        <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 tracking-wide">Mitaneko</h1>
      </div>
    </header>
  `
})
export class Header {}
