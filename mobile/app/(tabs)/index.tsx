import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { apiRequest, ApiError } from '@/lib/api';

type Categorie = 'tous' | 'securite' | 'hygiene' | 'entraide' | 'communaute' | 'conseil' | 'autre';

interface Publication {
  id: string;
  titre: string;
  description: string;
  categorie: Categorie | string;
  auteur: string;
  quartier: string;
  date: string;
  votes: number;
  commentaires: number;
  partages: number;
  status: string;
  anonyme: boolean;
  liked: boolean;
  participationActive?: boolean;
}

const FILTRES: { label: string; value: Categorie; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Tous', value: 'tous', icon: 'globe-outline' },
  { label: 'Sécurité', value: 'securite', icon: 'shield-checkmark-outline' },
  { label: 'Hygiène', value: 'hygiene', icon: 'trash-outline' },
  { label: 'Entraide', value: 'entraide', icon: 'heart-outline' },
  { label: 'Communauté', value: 'communaute', icon: 'people-outline' },
];

const STATUS_LABELS: Record<string, string> = {
  cree: 'Nouveau',
  en_attente: 'En attente',
  approuve: 'Publié',
  en_cours: 'En cours',
  resolu: 'Résolu',
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  cree: { bg: '#fff7ed', text: '#c2410c' },
  en_attente: { bg: '#fff7ed', text: '#c2410c' },
  approuve: { bg: '#f0fdf4', text: '#15803d' },
  en_cours: { bg: '#eff6ff', text: '#1d4ed8' },
  resolu: { bg: '#f0fdf4', text: '#15803d' },
};

const CATEGORIE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  tous: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
  securite: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
  hygiene: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  entraide: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  communaute: { bg: '#faf5ff', text: '#7e22ce', border: '#d8b4fe' },
  conseil: { bg: '#fefce8', text: '#a16207', border: '#fde047' },
  autre: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
};

export default function FeedScreen() {
  const { token } = useAuth();
  const [filtreActif, setFiltreActif] = useState<Categorie>('tous');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      const res = await apiRequest<Record<string, unknown>[]>('/publications', {
        token,
        query: { limit: 50 },
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      setPublications(
        rows.map((r) => ({
          id: String(r.id),
          titre: String(r.titre || ''),
          description: String(r.contenu || ''),
          categorie: String(r.categorie || 'autre'),
          auteur: String(r.auteur || r.pseudonyme || 'Citoyen'),
          quartier: String(r.fokontany_nom || r.quartier_nom || 'Quartier'),
          date: r.created_at
            ? new Date(String(r.created_at)).toLocaleDateString('fr-FR')
            : '',
          votes: Number(r.nb_votes_sondage || r.nb_participants || 0),
          commentaires: 0,
          partages: 0,
          status: String(r.moderation_statut || 'approuve'),
          anonyme: !!r.anonyme,
          liked: false,
          participationActive: !!r.participation_active,
        })),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const filtered =
    filtreActif === 'tous'
      ? publications
      : publications.filter((p) => p.categorie === filtreActif);

  const toggleLike = (id: string) => {
    setPublications((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, liked: !p.liked, votes: p.liked ? p.votes - 1 : p.votes + 1 } : p,
      ),
    );
  };

  const participer = async (id: string) => {
    if (!token) return;
    try {
      await apiRequest(`/publications/${id}/participer`, { method: 'POST', token });
      setPublications((prev) =>
        prev.map((p) => (p.id === id ? { ...p, votes: p.votes + 1 } : p)),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Participation impossible.');
    }
  };

  const getCatInfo = (cat: string) => CATEGORIE_COLORS[cat] ?? CATEGORIE_COLORS.tous;
  const getFiltre = (cat: string) => FILTRES.find((f) => f.value === cat) ?? FILTRES[0];

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>Mitaneko</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={load}>
            <Ionicons name="refresh-outline" size={22} color="#1c1e21" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filtresContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtresScroll}>
          {FILTRES.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => setFiltreActif(f.value)}
              style={[styles.filtreBtn, filtreActif === f.value && styles.filtreBtnActive]}
            >
              <Ionicons name={f.icon} size={16} color={filtreActif === f.value ? '#ffffff' : '#374151'} />
              <Text style={[styles.filtreTxt, filtreActif === f.value && styles.filtreTxtActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!!error && (
        <Text style={styles.errorBanner}>{error}</Text>
      )}

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#ec4899" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#ec4899"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={56} color="#f9a8d4" />
              <Text style={styles.emptyText}>Aucune publication pour le moment</Text>
            </View>
          }
          renderItem={({ item }) => {
            const catInfo = getCatInfo(item.categorie);
            const filtre = getFiltre(item.categorie);
            const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.approuve;
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={18} color="#fff" />
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.auteur}>{item.anonyme ? 'Anonyme' : item.auteur}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>{item.date}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Ionicons name="location-outline" size={12} color="#65676b" />
                      <Text style={styles.metaText}>{item.quartier}</Text>
                    </View>
                  </View>
                  <View style={[styles.badge, { backgroundColor: catInfo.bg, borderColor: catInfo.border }]}>
                    <Ionicons name={filtre.icon} size={11} color={catInfo.text} />
                    <Text style={[styles.badgeTxt, { color: catInfo.text }]}>{filtre.label}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.titre}>{item.titre}</Text>
                  <Text style={styles.description}>{item.description}</Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[styles.statusTxt, { color: statusColor.text }]}>
                        {STATUS_LABELS[item.status] || item.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.counters}>
                  <View style={styles.likesRow}>
                    <View style={styles.likeIcon}>
                      <Ionicons name="thumbs-up" size={10} color="#fff" />
                    </View>
                    <Text style={styles.counterTxt}>{item.votes}</Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item.id)}>
                    <Ionicons
                      name={item.liked ? 'thumbs-up' : 'thumbs-up-outline'}
                      size={20}
                      color={item.liked ? '#db2777' : '#65676b'}
                    />
                    <Text style={[styles.actionTxt, item.liked && { color: '#db2777' }]}>
                      {item.liked ? 'Aimé' : "J'aime"}
                    </Text>
                  </TouchableOpacity>
                  {item.participationActive && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => participer(item.id)}>
                      <Ionicons name="hand-left-outline" size={20} color="#db2777" />
                      <Text style={[styles.actionTxt, { color: '#db2777' }]}>Je participe</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: { flex: 1 },
  logo: { fontSize: 22, fontWeight: '800', color: '#db2777' },
  headerRight: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtresContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  filtresScroll: { paddingHorizontal: 8, paddingVertical: 8, gap: 6 },
  filtreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filtreBtnActive: { backgroundColor: '#db2777' },
  filtreTxt: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filtreTxtActive: { color: '#ffffff' },
  errorBanner: {
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    padding: 10,
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  feedContent: { paddingVertical: 8, gap: 8 },
  card: { backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#db2777',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: { flex: 1 },
  auteur: { fontSize: 14, fontWeight: '700', color: '#1c1e21' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  metaText: { fontSize: 12, color: '#65676b' },
  metaDot: { fontSize: 12, color: '#65676b' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeTxt: { fontSize: 11, fontWeight: '600' },
  cardBody: { paddingHorizontal: 12, paddingBottom: 10 },
  titre: { fontSize: 14, fontWeight: '700', color: '#1c1e21', marginBottom: 4 },
  description: { fontSize: 14, color: '#3c4043', lineHeight: 20 },
  statusRow: { flexDirection: 'row', marginTop: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusTxt: { fontSize: 12, fontWeight: '600' },
  counters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  likesRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#db2777',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterTxt: { fontSize: 13, color: '#65676b' },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  actionTxt: { fontSize: 14, fontWeight: '600', color: '#65676b' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#65676b' },
});
