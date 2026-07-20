import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Chargement conditionnel de react-native-maps (Mobile uniquement)
let MapView: any, Marker: any, Callout: any;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Callout = Maps.Callout;
}

// Interface des données
interface Publication {
  id: string;
  titre: string;
  contenu: string;
  categorie: string;
  latitude: number;
  longitude: number;
  adresse?: string;
  photo?: string;
}

// Configuration des catégories
const CATEGORIES = [
  { id: 'all', label: 'Tous', icon: 'options-outline', color: '#1f2937' },
  { id: 'securite', label: 'Sécurité', icon: 'shield-checkmark-outline', color: '#ef4444' },
  { id: 'hygiene', label: 'Hygiène', icon: 'trash-outline', color: '#10b981' },
  { id: 'entraide', label: 'Entraide', icon: 'heart-outline', color: '#ec4899' },
  { id: 'communaute', label: 'Communauté', icon: 'sparkles-outline', color: '#a855f7' },
  { id: 'conseil', label: 'Conseil', icon: 'build-outline', color: '#3b82f6' },
];

const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function CarteScreen() {
  const router = useRouter();

  const [publications, setPublications] = useState<Publication[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Region initiale (Antananarivo)
  const initialRegion = {
    latitude: -18.8792,
    longitude: 47.5079,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/publications`);
      const data = await response.json();
      
      const validPubs = data.filter((p: Publication) => p.latitude && p.longitude);
      setPublications(validPubs);
    } catch (error) {
      console.error('Erreur lors du chargement des signalements :', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    const found = CATEGORIES.find(c => c.id === cat);
    return found ? found.color : '#6b7280';
  };

  const filteredPublications = selectedCategory === 'all'
    ? publications
    : publications.filter(p => p.categorie === selectedCategory);

  // Fallback si l'application est exécutée sur un navigateur Web
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallbackContainer}>
        <Ionicons name="map-outline" size={64} color="#ec4899" />
        <Text style={styles.webFallbackTitle}>Carte Interactive Mobile</Text>
        <Text style={styles.webFallbackText}>
          La carte native est optimisée pour Android et iOS. Veuillez lancer l'application sur un émulateur ou via Expo Go.
        </Text>
        <TouchableOpacity 
          style={styles.webAddBtn}
          onPress={() => router.push('/nouvelle-publication')}
        >
          <Text style={styles.webAddBtnText}>+ Ajouter un signalement</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {/* BARRE DE FILTRES HORIZONTALE */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterChip,
                  isSelected && { backgroundColor: cat.color }
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={cat.icon as any} 
                  size={16} 
                  color={isSelected ? '#ffffff' : '#374151'} 
                />
                <Text style={[
                  styles.filterText,
                  isSelected && styles.filterTextActive
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* BOUTON D'ACCÈS RAPIDE HEADER */}
      <TouchableOpacity 
        style={styles.headerAddBtn}
        onPress={() => router.push('/nouvelle-publication')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* CARTE INTERACTIVE */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ec4899" />
        </View>
      ) : (
        <MapView style={styles.map} initialRegion={initialRegion}>
          {filteredPublications.map((pub) => {
            const pinColor = getCategoryColor(pub.categorie);
            
            return (
              <Marker
                key={pub.id}
                coordinate={{ 
                  latitude: Number(pub.latitude), 
                  longitude: Number(pub.longitude) 
                }}
              >
                <View style={[styles.markerPin, { backgroundColor: pinColor }]}>
                  <Ionicons name="location" size={18} color="#ffffff" />
                </View>

                <Callout tooltip>
                  <View style={styles.calloutCard}>
                    {pub.photo ? (
                      <Image source={{ uri: pub.photo }} style={styles.calloutImage} />
                    ) : null}
                    <View style={[styles.badge, { backgroundColor: pinColor }]}>
                      <Text style={styles.badgeText}>{pub.categorie}</Text>
                    </View>
                    <Text style={styles.calloutTitle}>{pub.titre}</Text>
                    <Text numberOfLines={2} style={styles.calloutDescription}>
                      {pub.contenu}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  filterContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 70,
    zIndex: 10,
  },
  filterScroll: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  headerAddBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  calloutCard: {
    width: 200,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  calloutImage: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    marginBottom: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  calloutDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  // Fallback Styles pour le Web
  webFallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  webFallbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  webFallbackText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 360,
    marginBottom: 20,
  },
  webAddBtn: {
    backgroundColor: '#ec4899',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  webAddBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});