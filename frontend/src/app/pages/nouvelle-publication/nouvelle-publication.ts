import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { 
  heroMapPin, 
  heroPhoto, 
  heroShieldExclamation, 
  heroTrash, 
  heroHeart, 
  heroWrenchScrewdriver,
  heroXMark,
  heroSparkles
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-nouvelle-publication',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIcon],
  templateUrl: './nouvelle-publication.html',
  styleUrl: './nouvelle-publication.css',
  viewProviders: [
    provideIcons({ 
      heroMapPin, 
      heroPhoto, 
      heroShieldExclamation, 
      heroTrash, 
      heroHeart, 
      heroWrenchScrewdriver,
      heroXMark,
      heroSparkles
    })
  ]
})
export class NouvellePublication implements AfterViewInit {

  titre: string = '';
  contenu: string = '';
  categorie: string = 'securite';
  portee: string = 'fokontany';
  adresse: string = '';
  
  selectedCoords: { lat: number; lng: number } | null = null;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isSubmitting: boolean = false;
  errorMessage: string = '';

  private L: any;
  private map: any;
  private marker: any;

  categories = [
    { id: 'securite', label: 'Sécurité', icon: 'heroShieldExclamation' },
    { id: 'hygiene', label: 'Fako / Hygiène', icon: 'heroTrash' },
    { id: 'entraide', label: 'Entraide', icon: 'heroHeart' },
    { id: 'communaute', label: 'Communauté', icon: 'heroSparkles' },
    { id: 'conseil', label: 'Conseil', icon: 'heroWrenchScrewdriver' }
  ];

  constructor(
    private http: HttpClient, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      this.L = await import('leaflet');
      this.initMap();
    }
  }

  private initMap(): void {
    const L = this.L;
    const defaultLat = -18.8792;
    const defaultLng = 47.5079;

    this.map = L.map('map').setView([defaultLat, defaultLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });

    this.map.on('click', (e: any) => {
      this.selectedCoords = { lat: e.latlng.lat, lng: e.latlng.lng };

      if (this.marker) {
        this.marker.setLatLng(e.latlng);
      } else {
        this.marker = L.marker(e.latlng, { icon: defaultIcon }).addTo(this.map);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removePhoto(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (this.titre.length < 3) {
      this.errorMessage = 'Le titre doit faire au moins 3 caractères.';
      return;
    }
    if (this.contenu.length < 5) {
      this.errorMessage = 'Le contenu doit faire au moins 5 caractères.';
      return;
    }

    this.isSubmitting = true;

    const formData = new FormData();
    formData.append('titre', this.titre);
    formData.append('contenu', this.contenu);
    formData.append('categorie', this.categorie);
    formData.append('portee', this.categorie === 'securite' ? 'securite_zone' : this.portee);

    if (this.adresse) {
      formData.append('adresse', this.adresse);
    }

    if (this.selectedCoords) {
      formData.append('latitude', this.selectedCoords.lat.toString());
      formData.append('longitude', this.selectedCoords.lng.toString());
    }

    if (this.selectedFile) {
      formData.append('photo', this.selectedFile);
    }

    this.http.post('http://localhost:3000/api/publications', formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/feed']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Une erreur est survenue lors de la création.';
      }
    });
  }
}