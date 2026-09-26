import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'android' ? 'rgba(3, 7, 18, 0.9)' : 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: 64,
          bottom: 24,
          left: 20,
          right: 20,
          borderRadius: 32,
          paddingBottom: 0,
          overflow: 'hidden',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          borderWidth: 1,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 10,
        },
        tabBarBackground: () => (
          <GlassView
            colorScheme="dark"
            glassEffectStyle="regular"
            style={{
              flex: 1,
              backgroundColor: 'rgba(3, 7, 18, 0.4)',
            }}
          />
        ),
        tabBarActiveTintColor: '#60a5fa',
        tabBarInactiveTintColor: '#475569',
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Capital',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "pie-chart" : "pie-chart-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Produits',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "cube" : "cube-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Ventes',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "cart" : "cart-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
