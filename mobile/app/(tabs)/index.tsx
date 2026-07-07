import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Categorie = 'tous' | 'securite' | 'proprete' | 'entraide' | 'infrastructure';

interface Publication {
  id: string;
  titre: string;
  description: string;
  categorie: Categorie;
  auteur: string;
  quartier: string;
  date: string;
  votes: number;
  commentaires: number;
  partages: number;
  status: 'cree' | 'en_cours' | 'resolu';
  anonyme: boolean;
  liked: boolean;
}

const FILTRES: { label: string; value: Categorie; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Tous',           value: 'tous',           icon: 'globe-outline' },
  { label: 'Sécurité',       value: 'securite',       icon: 'shield-checkmark-outline' },
  { label: 'Fako',           value: 'proprete',       icon: 'trash-outline' },
  { label: 'Entraide',       value: 'entraide',       icon: 'heart-outline' },
  { label: 'Infrastructure', value: 'infrastructure', icon: 'construct-outline' },
];

const STATUS_LABELS: Record<string, string> = {
  cree: 'Nouveau', en_cours: 'En cours', resolu: 'Résolu',
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  cree:     { bg: '#fff7ed', text: '#c2410c' },
  en_cours: { bg: '#eff6ff', text: '#1d4ed8' },
  resolu:   { bg: '#f0fdf4', text: '#15803d' },
};

const CATEGORIE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  tous:           { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
  securite:       { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
  proprete:       { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  entraide:       { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  infrastructure: { bg: '#fefce8', text: '#a16207', border: '#fde047' },
};

export default function FeedScreen() {
  const [filtreActif, setFiltreActif] = useState<Categorie>('tous');
  const [publications, setPublications] = useState<Publication[]>([]);
  const insets = useSafeAreaInsets();

  const filtered = filtreActif === 'tous'
    ? publications
    : publications.filter(p => p.categorie === filtreActif);

  const toggleLike = (id: string) => {
    setPublications(prev => prev.map(p =>
      p.id === id ? { ...p, liked: !p.liked, votes: p.liked ? p.votes - 1 : p.votes + 1 } : p
    ));
  };

  const getCatInfo = (cat: string) => CATEGORIE_COLORS[cat] ?? CATEGORIE_COLORS['tous'];
  const getFiltre = (cat: string) => FILTRES.find(f => f.value === cat) ?? FILTRES[0];

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>Mitaneko</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="search-outline" size={22} color="#1c1e21" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="chatbubble-outline" size={22} color="#1c1e21" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color="#1c1e21" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtres */}
      <View style={styles.filtresContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtresScroll}>
          {FILTRES.map(f => (
            <TouchableOpacity
              key={f.value}
              onPress={() => setFiltreActif(f.value)}
              style={[
                styles.filtreBtn,
                filtreActif === f.value && styles.filtreBtnActive,
              ]}
            >
              <Ionicons
                name={f.icon}
                size={16}
                color={filtreActif === f.value ? '#ffffff' : '#374151'}
              />
              <Text style={[
                styles.filtreTxt,
                filtreActif === f.value && styles.filtreTxtActive,
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Feed */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={56} color="#f9a8d4" />
            <Text style={styles.emptyText}>Aucune publication pour le moment</Text>
          </View>
        }
        renderItem={({ item }) => {
          const catInfo = getCatInfo(item.categorie);
          const filtre = getFiltre(item.categorie);
          const statusColor = STATUS_COLORS[item.status];
          return (
            <View style={styles.card}>
              {/* Header post */}
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
                <View style={styles.cardBadges}>
                  <View style={[styles.badge, { backgroundColor: catInfo.bg, borderColor: catInfo.border }]}>
                    <Ionicons name={filtre.icon} size={11} color={catInfo.text} />
                    <Text style={[styles.badgeTxt, { color: catInfo.text }]}>{filtre.label}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.moreBtn}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#65676b" />
                </TouchableOpacity>
              </View>

              {/* Contenu */}
              <View style={styles.cardBody}>
                <Text style={styles.titre}>{item.titre}</Text>
                <Text style={styles.description}>{item.description}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                    <Text style={[styles.statusTxt, { color: statusColor.text }]}>
                      {STATUS_LABELS[item.status]}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Compteurs */}
              <View style={styles.counters}>
                <View style={styles.likesRow}>
                  <View style={styles.likeIcon}>
                    <Ionicons name="thumbs-up" size={10} color="#fff" />
                  </View>
                  <Text style={styles.counterTxt}>{item.votes}</Text>
                </View>
                <Text style={styles.counterTxt}>{item.commentaires} commentaires · {item.partages} partages</Text>
              </View>

              {/* Actions */}
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
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="chatbubble-outline" size={20} color="#65676b" />
                  <Text style={styles.actionTxt}>Commenter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="arrow-redo-outline" size={20} color="#65676b" />
                  <Text style={styles.actionTxt}>Partager</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f2f5' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerLeft: { flex: 1 },
  logo: { fontSize: 22, fontWeight: '800', color: '#db2777' },
  headerRight: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },

  // Filtres
  filtresContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  filtresScroll: { paddingHorizontal: 8, paddingVertical: 8, gap: 6 },
  filtreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filtreBtnActive: { backgroundColor: '#db2777' },
  filtreTxt: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filtreTxtActive: { color: '#ffffff' },

  // Feed
  feedContent: { paddingVertical: 8, gap: 8 },

  // Card
  card: { backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 8 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#db2777', alignItems: 'center', justifyContent: 'center',
  },
  cardMeta: { flex: 1 },
  auteur: { fontSize: 14, fontWeight: '700', color: '#1c1e21' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  metaText: { fontSize: 12, color: '#65676b' },
  metaDot: { fontSize: 12, color: '#65676b' },
  cardBadges: { alignItems: 'flex-end' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12, borderWidth: 1,
  },
  badgeTxt: { fontSize: 11, fontWeight: '600' },
  moreBtn: { padding: 4 },

  cardBody: { paddingHorizontal: 12, paddingBottom: 10 },
  titre: { fontSize: 14, fontWeight: '700', color: '#1c1e21', marginBottom: 4 },
  description: { fontSize: 14, color: '#3c4043', lineHeight: 20 },
  statusRow: { flexDirection: 'row', marginTop: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusTxt: { fontSize: 12, fontWeight: '600' },

  counters: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  likesRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeIcon: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#db2777', alignItems: 'center', justifyContent: 'center',
  },
  counterTxt: { fontSize: 13, color: '#65676b' },

  actions: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb',
    paddingVertical: 2,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8,
  },
  actionTxt: { fontSize: 14, fontWeight: '600', color: '#65676b' },

  // Vide
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#65676b' },
});
