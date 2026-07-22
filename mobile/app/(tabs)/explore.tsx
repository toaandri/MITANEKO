import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, logout, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setLoading(true);
          await refreshProfile();
        } catch {
          // keep cached user
        } finally {
          setLoading(false);
        }
      })();
    }, [refreshProfile]),
  );

  const onLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const displayName =
    user?.pseudonyme ||
    [user?.prenom, user?.nom].filter(Boolean).join(' ') ||
    user?.telephone ||
    user?.email ||
    'Citoyen';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>

        {loading ? (
          <ActivityIndicator color="#ec4899" style={{ marginTop: 16 }} />
        ) : (
          <>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.meta}>{user?.telephone || user?.email || '—'}</Text>
            <Text style={styles.role}>Rôle : {user?.role || 'citoyen'}</Text>
            {!!user?.quartier_id && (
              <Text style={styles.meta}>Fokontany lié ✓</Text>
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/pages/settings')}
        >
          <Ionicons name="settings-outline" size={18} color="#374151" />
          <Text style={styles.settingsTxt}>Paramètres</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutTxt}>Se déconnecter</Text>
        </TouchableOpacity>

        {!token && (
          <Text style={styles.warn}>Session expirée — reconnectez-vous.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#db2777' },
  body: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#db2777',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginTop: 16, fontSize: 20, fontWeight: '800', color: '#111827' },
  meta: { marginTop: 4, fontSize: 14, color: '#6b7280' },
  role: { marginTop: 8, fontSize: 13, fontWeight: '600', color: '#db2777' },
  settingsBtn: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingsTxt: { fontWeight: '600', color: '#374151' },
  logoutBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ec4899',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  logoutTxt: { fontWeight: '700', color: '#fff' },
  warn: { marginTop: 16, color: '#b91c1c' },
});
