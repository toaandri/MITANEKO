import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { apiRequest, ApiError } from '@/lib/api';

let MapView: any, Marker: any;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

const CATEGORIES = [
  { id: 'securite', label: 'Sécurité', icon: 'shield-checkmark-outline', color: '#ef4444' },
  { id: 'hygiene', label: 'Hygiène', icon: 'trash-outline', color: '#10b981' },
  { id: 'entraide', label: 'Entraide', icon: 'heart-outline', color: '#ec4899' },
  { id: 'communaute', label: 'Communauté', icon: 'sparkles-outline', color: '#a855f7' },
  { id: 'conseil', label: 'Conseil', icon: 'build-outline', color: '#3b82f6' },
  { id: 'autre', label: 'Autre', icon: 'ellipsis-horizontal-outline', color: '#6b7280' },
];

export default function NouvellePublicationScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [categorie, setCategorie] = useState('securite');
  const [adresse, setAdresse] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission requise', 'L’accès à la galerie est nécessaire.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Erreur', 'Vous devez être connecté.');
      return;
    }
    if (titre.length < 3 || contenu.length < 5) {
      Alert.alert('Erreur', 'Titre (3+) et description (5+) requis.');
      return;
    }
    if (categorie === 'securite' && !selectedCoords) {
      Alert.alert('Erreur', 'Pour la sécurité, touchez la carte pour placer le point.');
      return;
    }
    if (!user?.quartier_id && categorie !== 'securite') {
      Alert.alert('Erreur', 'Votre compte n’a pas de fokontany — utilisez l’inscription par code.');
      return;
    }

    setSubmitting(true);
    try {
      const portee = categorie === 'securite' ? 'securite_zone' : 'fokontany';
      const formData = new FormData();
      formData.append('titre', titre);
      formData.append('contenu', contenu);
      formData.append('categorie', categorie);
      formData.append('portee', portee);
      if (user?.quartier_id) formData.append('quartier_id', user.quartier_id);
      if (user?.commune_id) formData.append('commune_id', user.commune_id);
      if (adresse) formData.append('adresse', adresse);
      if (selectedCoords) {
        formData.append('latitude', String(selectedCoords.latitude));
        formData.append('longitude', String(selectedCoords.longitude));
      }
      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('photo', { uri: imageUri, name: filename, type } as any);
      }

      await apiRequest('/publications', {
        method: 'POST',
        token,
        formData,
      });

      Alert.alert('Succès', 'Publication créée !', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Échec de publication.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
    >
      <Text style={styles.headerTitle}>Nouvelle publication</Text>

      <Text style={styles.label}>Titre *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Éclairage cassé, aide demandée…"
        value={titre}
        onChangeText={setTitre}
      />

      <Text style={styles.label}>Catégorie *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
        {CATEGORIES.map((cat) => {
          const isSelected = categorie === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, isSelected && { backgroundColor: cat.color }]}
              onPress={() => setCategorie(cat.id)}
            >
              <Ionicons name={cat.icon as any} size={16} color={isSelected ? '#fff' : '#374151'} />
              <Text style={[styles.catText, isSelected && styles.catTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Décrivez la situation…"
        multiline
        numberOfLines={4}
        value={contenu}
        onChangeText={setContenu}
      />

      <Text style={styles.label}>Adresse (optionnel)</Text>
      <TextInput
        style={styles.input}
        placeholder="Rue, lieu-dit…"
        value={adresse}
        onChangeText={setAdresse}
      />

      <Text style={styles.label}>Photo</Text>
      {imageUri ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
            <Ionicons name="close-circle" size={28} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
          <Ionicons name="camera-outline" size={24} color="#6b7280" />
          <Text style={styles.uploadBtnText}>Ajouter une photo</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>
        Localisation {categorie === 'securite' ? '(obligatoire — touchez la carte)' : '(optionnel)'}
      </Text>
      {Platform.OS === 'web' || !MapView ? (
        <View style={styles.mapFallback}>
          <Text style={styles.mapFallbackText}>Carte disponible sur mobile natif.</Text>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: -18.8792,
              longitude: 47.5079,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onPress={(e: any) => setSelectedCoords(e.nativeEvent.coordinate)}
          >
            {selectedCoords && <Marker coordinate={selectedCoords} />}
          </MapView>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.disabledBtn]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Publier</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9fafb',
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  catScroll: { flexDirection: 'row', marginBottom: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  catText: { fontSize: 13, color: '#374151' },
  catTextActive: { color: '#fff', fontWeight: 'bold' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9ca3af',
    borderRadius: 8,
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  uploadBtnText: { color: '#4b5563', fontWeight: '500' },
  imagePreviewContainer: { position: 'relative' },
  imagePreview: { width: '100%', height: 180, borderRadius: 8 },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  map: { width: '100%', height: '100%' },
  mapFallback: {
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFallbackText: { color: '#6b7280' },
  submitBtn: {
    backgroundColor: '#ec4899',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledBtn: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
