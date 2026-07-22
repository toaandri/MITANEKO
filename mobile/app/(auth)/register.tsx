import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

export default function RegisterScreen() {
  const { registerWithToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [tokenCode, setTokenCode] = useState('DEMO0001');
  const [telephone, setTelephone] = useState('');
  const [pseudonyme, setPseudonyme] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!tokenCode.trim() || !telephone.trim() || !pseudonyme.trim() || password.length < 8) {
      setError('Code, téléphone, pseudo et mot de passe (8+ car.) requis.');
      return;
    }
    setLoading(true);
    try {
      await registerWithToken({
        token_code: tokenCode.trim(),
        telephone: telephone.trim(),
        password,
        pseudonyme: pseudonyme.trim(),
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Inscription impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.safe, { paddingTop: insets.top + 24 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Inscription</Text>
        <Text style={styles.subtitle}>Avec le code fourni par votre fokontany</Text>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>Code fokontany</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="characters"
          value={tokenCode}
          onChangeText={setTokenCode}
          placeholder="DEMO0001"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Téléphone</Text>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          value={telephone}
          onChangeText={setTelephone}
          placeholder="+26132…"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Pseudonyme</Text>
        <TextInput
          style={styles.input}
          value={pseudonyme}
          onChangeText={setPseudonyme}
          placeholder="Votre pseudo public"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="8 caractères minimum"
          placeholderTextColor="#9ca3af"
        />

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Créer mon compte</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkText}>Déjà un compte ? Se connecter</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  logo: { fontSize: 28, fontWeight: '800', color: '#db2777', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#6b7280', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#f9fafb',
    color: '#111827',
  },
  btn: {
    marginTop: 24,
    backgroundColor: '#ec4899',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkBtn: { marginTop: 18, alignItems: 'center' },
  linkText: { color: '#db2777', fontWeight: '600' },
  error: {
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
});
