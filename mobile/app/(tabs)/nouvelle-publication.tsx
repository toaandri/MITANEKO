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
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CATEGORIES = [
  { id: 'securite', label: 'Sécurité', icon: 'shield-checkmark-outline', color: '#ef4444' },
  { id: 'hygiene', label: 'Hygiène', icon: 'trash-outline', color: '#10b981' },
  { id: 'entraide', label: 'Entraide', icon: 'heart-outline', color: '#ec4899' },
  { id: 'communaute', label: 'Communauté', icon: 'sparkles-outline', color: '#a855f7' },
  { id: 'conseil', label: 'Conseil', icon: 'build-outline', color: '#3b82f6' },
];

const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function NouvellePublicationScreen() {
  const router = useRouter();

  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [categorie, setCategorie] = useState('securite');
  const [adresse, setAdresse] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Choisir une photo dans la galerie
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission requise', 'L’accès à la galerie est nécessaire pour ajouter une image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Soumission du formulaire
  const handleSubmit = async () => {
    if (titre.length < 3) {
      Alert.alert('Erreur', 'Le titre doit contenir au moins 3 caractères.');
      return;
    }
    if (contenu.length < 5) {
      Alert.alert('Erreur', 'Le contenu doit contenir au moins 5 caractères.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('titre', titre);
      formData.append('contenu', contenu);
      formData.append('categorie', categorie);
      if (adresse) formData.append('adresse', adresse);

      if (selectedCoords) {
        formData.append('latitude', selectedCoords.latitude.toString());
        formData.append('longitude', selectedCoords.longitude.toString());
      }

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        // Format requis pour Multipart Form-Data dans React Native
        formData.append('photo', {
          uri: imageUri,
          name: filename,
          type: type,
        } as any);
      }

      const response = await fetch(`${API_BASE_URL}/api/publications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Succès', 'Signalement publié avec succès !', [
          { text: 'OK', onPress: () => router.push('/(tabs)/carte') }
        ]);
      } else {
        const errorData = await response.json();
        Alert.alert('Erreur', errorData.message || 'Échec lors de la création de la publication.');
      }
    } catch (error) {
      console.error('Erreur d’envoi :', error);
      Alert.alert('Erreur', 'Impossible de contacter le serveur.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Nouveau signalement</Text>

      {/* Titre */}
      <Text style={styles.label}>Titre *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Nid de poule, Panne d'éclairage..."
        value={titre}
        onChangeText={setTitre}
      />

      {/* Catégorie */}
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

      {/* Contenu / Description */}
      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Décrivez la situation en détails..."
        multiline
        numberOfLines={4}
        value={contenu}
        onChangeText={setContenu}
      />

      {/* Sélection d'image */}
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

      {/* Sélection sur la Carte */}
      <Text style={styles.label}>Localisation (Touchez la carte)</Text>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: -18.8792,
            longitude: 47.5079,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={(e) => setSelectedCoords(e.nativeEvent.coordinate)}
        >
          {selectedCoords && <Marker coordinate={selectedCoords} />}
        </MapView>
      </View>

      {/* Bouton de soumission */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.disabledBtn]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Publier le signalement</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9fafb',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
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
  catText: {
    fontSize: 13,
    color: '#374151',
  },
  catTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
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
  uploadBtnText: {
    color: '#4b5563',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
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
  map: {
    width: '100%',
    height: '100%',
  },
  submitBtn: {
    backgroundColor: '#ec4899',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});