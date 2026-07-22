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

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!identifier.trim() || !password) {
      setError('Téléphone/email et mot de passe requis.');
      return;
    }
    setLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Connexion impossible.');
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
        <Text style={styles.logo}>Mitaneko</Text>
        <Text style={styles.subtitle}>Connexion citoyen</Text>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>Téléphone ou email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="default"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="+261… ou email"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
        />

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Se connecter</Text>}
        </TouchableOpacity>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkText}>Créer un compte avec code fokontany</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  logo: { fontSize: 32, fontWeight: '800', color: '#db2777', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 24 },
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
