import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { 
  heroShieldExclamation, 
  heroTrash, 
  heroHeart, 
  heroSparkles, 
  heroWrenchScrewdriver,
  heroAdjustmentsHorizontal,
  heroMapPin
} from '@ng-icons/heroicons/outline';

interface Publication {
  id: string;
  titre: string;
  contenu: string;
  categorie: string;
  latitude: number;
  longitude: number;
  adresse?: string;
  photo?: string;
  created_at?: string;
}

@Component({
  selector: 'app-carte',
  standalone: true,
  imports: [CommonModule, NgIcon],
  templateUrl: './carte.html',
  styleUrl: './carte.css',
  viewProviders: [
    provideIcons({ 
      heroShieldExclamation, 
      heroTrash, 
      heroHeart, 
      heroSparkles, 
      heroWrenchScrewdriver,
      heroAdjustmentsHorizontal,
      heroMapPin
    })
  ]
})
export class CarteComponent implements AfterViewInit {

  private L: any;
  private map: any;
  private markersLayer: any;

  allPublications: Publication[] = [];
  selectedCategory: string = 'all';

  categories = [
    { id: 'all', label: 'Tous', icon: 'heroAdjustmentsHorizontal' },
    { id: 'securite', label: 'Sécurité', icon: 'heroShieldExclamation' },
    { id: 'hygiene', label: 'Hygiène', icon: 'heroTrash' },
    { id: 'entraide', label: 'Entraide', icon: 'heroHeart' },
    { id: 'communaute', label: 'Communauté', icon: 'heroSparkles' },
    { id: 'conseil', label: 'Conseil', icon: 'heroWrenchScrewdriver' }
  ];

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  async ngAfterViewInit(): Promise<void> {
    // Exécution sécurisée côté navigateur uniquement (SSR-safe)
    if (isPlatformBrowser(this.platformId)) {
      this.L = await import('leaflet');
      this.initMap();
      this.loadPublications();
    }
  }

  private initMap(): void {
    const L = this.L;
    const defaultLat = -18.8792;
    const defaultLng = 47.5079;

    this.map = L.map('map-full', {
      zoomControl: false
    }).setView([defaultLat, defaultLng], 13);

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
  }

  private loadPublications(): void {
    this.http.get<Publication[]>('/api/publications').subscribe({
      next: (data) => {
        this.allPublications = data.filter(p => p.latitude && p.longitude);
        this.renderMarkers();
      },
      error: (err) => console.error('Erreur chargement signalements :', err)
    });
  }

  filterCategory(catId: string): void {
    this.selectedCategory = catId;
    this.renderMarkers();
  }

  private renderMarkers(): void {
    if (!this.L || !this.markersLayer) return;
    const L = this.L;

    this.markersLayer.clearLayers();

    const filtered = this.selectedCategory === 'all' 
      ? this.allPublications 
      : this.allPublications.filter(p => p.categorie === this.selectedCategory);

    filtered.forEach(pub => {
      const color = this.getCategoryColor(pub.categorie);

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); transform: translate(-50%, -50%);">
            <span style="font-size: 12px; color: white;">📍</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const popupContent = `
        <div style="max-width: 200px;">
          ${pub.photo ? `<img src="${pub.photo}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />` : ''}
          <span style="background-color: ${color}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold; text-transform: uppercase;">
            ${pub.categorie}
          </span>
          <h4 style="margin: 6px 0 2px 0; font-size: 14px; font-weight: bold;">${pub.titre}</h4>
          <p style="margin: 0; font-size: 12px; color: #555;">${pub.contenu}</p>
        </div>
      `;

      const marker = L.marker([pub.latitude, pub.longitude], { icon: customIcon })
        .bindPopup(popupContent);

      this.markersLayer.addLayer(marker);
    });
  }

  private getCategoryColor(cat: string): string {
    switch (cat) {
      case 'securite': return '#ef4444';
      case 'hygiene': return '#10b981';
      case 'entraide': return '#ec4899';
      case 'communaute': return '#a855f7';
      case 'conseil': return '#3b82f6';
      default: return '#6b7280';
    }
  }
}