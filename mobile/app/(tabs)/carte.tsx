import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { apiRequest, coordsFromLocalisation, ApiError } from '@/lib/api';

let MapView: any, Marker: any, Callout: any;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Callout = Maps.Callout;
}

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

const CATEGORIES = [
  { id: 'all', label: 'Tous', icon: 'options-outline', color: '#1f2937' },
  { id: 'securite', label: 'Sécurité', icon: 'shield-checkmark-outline', color: '#ef4444' },
  { id: 'hygiene', label: 'Hygiène', icon: 'trash-outline', color: '#10b981' },
  { id: 'entraide', label: 'Entraide', icon: 'heart-outline', color: '#ec4899' },
  { id: 'communaute', label: 'Communauté', icon: 'sparkles-outline', color: '#a855f7' },
  { id: 'conseil', label: 'Conseil', icon: 'build-outline', color: '#3b82f6' },
];

export default function CarteScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const initialRegion = {
    latitude: -18.8792,
    longitude: 47.5079,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const fetchPublications = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      const res = await apiRequest<Record<string, unknown>[]>('/publications', {
        token,
        query: {
          limit: 100,
          latitude: initialRegion.latitude,
          longitude: initialRegion.longitude,
        },
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      const mapped: Publication[] = [];
      for (const r of rows) {
        const coords = coordsFromLocalisation(r.localisation);
        if (!coords) continue;
        mapped.push({
          id: String(r.id),
          titre: String(r.titre || ''),
          contenu: String(r.contenu || ''),
          categorie: String(r.categorie || 'autre'),
          latitude: coords.latitude,
          longitude: coords.longitude,
          adresse: r.adresse ? String(r.adresse) : undefined,
          photo: r.photo_url ? String(r.photo_url) : undefined,
        });
      }
      setPublications(mapped);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement carte impossible.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPublications();
    }, [fetchPublications]),
  );

  const getCategoryColor = (cat: string) =>
    CATEGORIES.find((c) => c.id === cat)?.color || '#6b7280';

  const filteredPublications =
    selectedCategory === 'all'
      ? publications
      : publications.filter((p) => p.categorie === selectedCategory);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallbackContainer}>
        <Ionicons name="map-outline" size={64} color="#ec4899" />
        <Text style={styles.webFallbackTitle}>Carte Interactive Mobile</Text>
        <Text style={styles.webFallbackText}>
          La carte native est optimisée pour Android et iOS (Expo Go / émulateur).
        </Text>
        <TouchableOpacity
          style={styles.webAddBtn}
          onPress={() => router.push('/(tabs)/nouvelle-publication')}
        >
          <Text style={styles.webAddBtnText}>+ Ajouter une publication</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.filterChip, isSelected && { backgroundColor: cat.color }]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Ionicons name={cat.icon as any} size={16} color={isSelected ? '#fff' : '#374151'} />
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.headerAddBtn}
        onPress={() => router.push('/(tabs)/nouvelle-publication')}
      >
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

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
                coordinate={{ latitude: pub.latitude, longitude: pub.longitude }}
              >
                <View style={[styles.markerPin, { backgroundColor: pinColor }]}>
                  <Ionicons name="location" size={18} color="#ffffff" />
                </View>
                <Callout tooltip>
                  <View style={styles.calloutCard}>
                    {pub.photo ? <Image source={{ uri: pub.photo }} style={styles.calloutImage} /> : null}
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  filterContainer: { position: 'absolute', top: 50, left: 0, right: 70, zIndex: 10 },
  filterScroll: { paddingLeft: 16, paddingRight: 8, gap: 8 },
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
  filterText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filterTextActive: { color: '#ffffff' },
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
  },
  errorBox: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    zIndex: 30,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
  },
  errorText: { color: '#b91c1c', fontSize: 13 },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  markerPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calloutCard: {
    width: 200,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
  },
  calloutImage: { width: '100%', height: 90, borderRadius: 8, marginBottom: 6 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  calloutTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  calloutDescription: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  webFallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  webFallbackTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginTop: 16, marginBottom: 8 },
  webFallbackText: { fontSize: 14, color: '#6b7280', textAlign: 'center', maxWidth: 360, marginBottom: 20 },
  webAddBtn: { backgroundColor: '#ec4899', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  webAddBtnText: { color: '#ffffff', fontWeight: 'bold' },
});
