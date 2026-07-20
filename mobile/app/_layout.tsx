import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ec4899', // Couleur rose Mitaneko quand actif
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
        },
      }}
    >
      {/* 1. Onglet Accueil */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 2. Onglet Carte */}
      <Tabs.Screen
        name="carte"
        options={{
          title: 'Carte',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 3. BOUTON D'ACCÈS RAPIDE + (Redirige vers la page de création) */}
      <Tabs.Screen
        name="plus_action"
        options={{
          title: '',
          tabBarButton: (props) => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.floatingButtonContainer}
              onPress={() => router.push('/nouvelle-publication')}
            >
              <View style={styles.floatingButton}>
                <Ionicons name="add" size={28} color="#ffffff" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />

      {/* 4. Onglet Explore */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorer',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    top: -15, // Fait dépasser le bouton au-dessus de la navbar
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  floatingButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ec4899', // Couleur principale
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
});