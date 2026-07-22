import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ec4899',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="carte"
        options={{
          title: 'Carte',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nouvelle-publication"
        options={{
          title: '',
          tabBarButton: () => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.floatingButtonContainer}
              onPress={() => router.push('/(tabs)/nouvelle-publication')}
            >
              <View style={styles.floatingButton}>
                <Ionicons name="add" size={28} color="#ffffff" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    top: -12,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  floatingButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
});
