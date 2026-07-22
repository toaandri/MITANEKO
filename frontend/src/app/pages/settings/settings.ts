import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroUser,
  heroLanguage,
  heroDocumentText,
  heroEye,
  heroKey,
  heroLockClosed,
  heroArrowRightOnRectangle,
  heroChevronDown,
  heroXMark,
} from '@ng-icons/heroicons/outline';

type Language = 'Malagasy' | 'Francais' | 'English';

type Publication = {
  id: string;
  title: string;
  content: string;
  date: string;
  language: Language;
  region: string;
  commune: string;
};

const LANGUAGE_OPTIONS: Language[] = ['Malagasy', 'Francais', 'English'];

const REGION_TREE: Record<string, Record<string, string[]>> = {
  Analamanga: {
    'Antananarivo Renivohitra': ['Isotry', 'Anosy', 'Andavamamba', '67Ha'],
    Avaradrano: ['Ambohitrarahaba', 'Alasora', 'Sabotsy Namehana'],
  },
  Vakinankaratra: {
    Antsirabe: ['Ambohidrano', 'Tsarasaotra', 'Antanambao'],
    Betafo: ['Mandritsara', 'Antohobe', 'Soanindrariny'],
  },
  Atsinanana: {
    Toamasina: ['Tanambao V', 'Morafeno', 'Mangarano'],
    Vatomandry: ['Miadana', 'Anjoma', 'Niarovana'],
  },
};

const AVATAR_PRESETS = [
  'https://i.pravatar.cc/200?img=1',
  'https://i.pravatar.cc/200?img=5',
  'https://i.pravatar.cc/200?img=12',
  'https://i.pravatar.cc/200?img=20',
];

const MY_PUBLICATIONS: Publication[] = [
  {
    id: '1',
    title: 'Nettoyage de quartier',
    content: 'Mobilisation ce samedi pour nettoyer les ruelles principales.',
    date: '2026-06-20',
    language: 'Francais',
    region: 'Analamanga',
    commune: 'Antananarivo Renivohitra',
  },
  {
    id: '2',
    title: 'Fanentanana eny an-tsena',
    content: 'Hampahafantarana ny mponina momba ny fitantanana fako.',
    date: '2026-06-18',
    language: 'Malagasy',
    region: 'Analamanga',
    commune: 'Avaradrano',
  },
  {
    id: '3',
    title: 'Road safety awareness',
    content: 'Community talk on road safety for children and parents.',
    date: '2026-06-10',
    language: 'English',
    region: 'Atsinanana',
    commune: 'Toamasina',
  },
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  viewProviders: [
    provideIcons({
      heroUser,
      heroLanguage,
      heroDocumentText,
      heroEye,
      heroKey,
      heroLockClosed,
      heroArrowRightOnRectangle,
      heroChevronDown,
      heroXMark,
    }),
  ],
})
export class Settings {
  private readonly initialRegion = Object.keys(REGION_TREE)[0];
  private readonly initialCommune = Object.keys(REGION_TREE[this.initialRegion])[0];
  private readonly initialFokontany = REGION_TREE[this.initialRegion][this.initialCommune][0];

  profileName = 'Miora Rakoto';
  profileEmail = 'miora.rakoto@example.com';
  profilePhone = '+261 34 12 345 67';
  profileBio = 'Actif/active dans les actions citoyennes de mon quartier.';
  avatarUrl = signal(AVATAR_PRESETS[0]);
  avatarInput = AVATAR_PRESETS[0];
  private avatarIndex = 0;

  selectedLanguage = signal<Language>('Francais');
  selectedRegion = signal(this.initialRegion);
  selectedCommune = signal(this.initialCommune);
  selectedFokontany = signal(this.initialFokontany);

  pickerOpen = signal(false);
  pickerTitle = signal('');
  pickerOptions = signal<string[]>([]);
  private pickerOnSelect: ((value: string) => void) | null = null;

  generatedCode = '';
  enteredCode = '';
  resetPassword = '';
  resetPasswordConfirm = '';

  currentPassword = '';
  newPassword = '';
  newPasswordConfirm = '';

  accessLargeText = false;
  accessHighContrast = false;
  accessScreenReaderHints = true;
  accessReduceMotion = false;

  feedback = signal<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  communeOptions = computed(() => Object.keys(REGION_TREE[this.selectedRegion()] ?? {}));
  fokontanyOptions = computed(
    () => REGION_TREE[this.selectedRegion()]?.[this.selectedCommune()] ?? [],
  );

  filteredPublications = computed(() =>
    MY_PUBLICATIONS.filter(
      (item) =>
        item.language === this.selectedLanguage() &&
        item.region === this.selectedRegion() &&
        item.commune === this.selectedCommune(),
    ),
  );

  languageOptions = LANGUAGE_OPTIONS;
  regionOptions = Object.keys(REGION_TREE);

  private showFeedback(type: 'success' | 'error' | 'info', message: string) {
    this.feedback.set({ type, message });
    window.setTimeout(() => this.feedback.set(null), 4000);
  }

  openPicker(title: string, options: string[], onSelect: (value: string) => void) {
    this.pickerTitle.set(title);
    this.pickerOptions.set(options);
    this.pickerOnSelect = onSelect;
    this.pickerOpen.set(true);
  }

  closePicker() {
    this.pickerOpen.set(false);
    this.pickerOnSelect = null;
  }

  selectPickerOption(option: string) {
    this.pickerOnSelect?.(option);
    this.closePicker();
  }

  openLanguagePicker() {
    this.openPicker('Choisir la langue', [...LANGUAGE_OPTIONS], (value) => {
      this.selectedLanguage.set(value as Language);
    });
  }

  openRegionPicker() {
    this.openPicker('Choisir la region', Object.keys(REGION_TREE), (value) => {
      const firstCommune = Object.keys(REGION_TREE[value])[0];
      const firstFokontany = REGION_TREE[value][firstCommune][0];
      this.selectedRegion.set(value);
      this.selectedCommune.set(firstCommune);
      this.selectedFokontany.set(firstFokontany);
    });
  }

  openCommunePicker() {
    this.openPicker('Choisir la commune', this.communeOptions(), (value) => {
      const nextFokontany = REGION_TREE[this.selectedRegion()][value][0];
      this.selectedCommune.set(value);
      this.selectedFokontany.set(nextFokontany);
    });
  }

  openFokontanyPicker() {
    this.openPicker('Choisir le fokontany', this.fokontanyOptions(), (value) => {
      this.selectedFokontany.set(value);
    });
  }

  applyAvatarFromInput() {
    const clean = this.avatarInput.trim();
    if (!clean) {
      this.showFeedback('error', 'Veuillez entrer une URL valide.');
      return;
    }
    this.avatarUrl.set(clean);
    this.showFeedback('success', 'Votre photo de profil a ete mise a jour.');
  }

  useNextPresetAvatar() {
    this.avatarIndex = (this.avatarIndex + 1) % AVATAR_PRESETS.length;
    this.avatarUrl.set(AVATAR_PRESETS[this.avatarIndex]);
    this.avatarInput = AVATAR_PRESETS[this.avatarIndex];
  }

  saveProfile() {
    this.showFeedback('success', 'Les informations du profil ont ete enregistrees.');
  }

  sendVerificationCode() {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.generatedCode = code;
    this.showFeedback('info', `Un code a 6 chiffres a ete genere: ${code} (test UI).`);
  }

  onCodeInput(event: Event) {
    const value = (event.target as HTMLInputElement).value.replace(/[^0-9]/g, '').slice(0, 6);
    this.enteredCode = value;
  }

  validateResetPassword() {
    if (!this.generatedCode) {
      this.showFeedback('error', 'Veuillez d\'abord demander un code.');
      return;
    }
    if (this.enteredCode.length !== 6) {
      this.showFeedback('error', 'Le code doit contenir 6 chiffres.');
      return;
    }
    if (this.enteredCode !== this.generatedCode) {
      this.showFeedback('error', 'Le code saisi est incorrect.');
      return;
    }
    if (!this.resetPassword || this.resetPassword.length < 8) {
      this.showFeedback('error', 'Le nouveau mot de passe doit contenir au moins 8 caracteres.');
      return;
    }
    if (this.resetPassword !== this.resetPasswordConfirm) {
      this.showFeedback('error', 'Les mots de passe ne correspondent pas.');
      return;
    }

    this.enteredCode = '';
    this.generatedCode = '';
    this.resetPassword = '';
    this.resetPasswordConfirm = '';
    this.showFeedback('success', 'Votre mot de passe a ete change avec succes.');
  }

  updateCurrentPassword() {
    if (!this.currentPassword || !this.newPassword || !this.newPasswordConfirm) {
      this.showFeedback('error', 'Veuillez remplir tous les champs mot de passe.');
      return;
    }
    if (this.newPassword.length < 8) {
      this.showFeedback('error', 'Le nouveau mot de passe doit contenir au moins 8 caracteres.');
      return;
    }
    if (this.newPassword !== this.newPasswordConfirm) {
      this.showFeedback('error', 'La confirmation du nouveau mot de passe est incorrecte.');
      return;
    }

    this.currentPassword = '';
    this.newPassword = '';
    this.newPasswordConfirm = '';
    this.showFeedback('success', 'Votre mot de passe actuel a ete modifie.');
  }

  disconnectOtherDevices() {
    this.showFeedback('info', 'Toutes les autres sessions ont ete deconnectees de votre compte.');
  }

  logout() {
    this.showFeedback('info', 'Vous avez ete deconnecte(e).');
  }
}
