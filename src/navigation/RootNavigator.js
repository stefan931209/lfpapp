import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../lib/supabase';
import { colors, spacing } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreateMatchScreen from '../screens/CreateMatchScreen';
import MatchHistoryScreen from '../screens/MatchHistoryScreen';
import PlayerProfileScreen from '../screens/PlayerProfileScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function LogoHeader() {
  return (
    <View style={headerStyles.wrapper}>
      <Text style={headerStyles.logo}>LFP</Text>
      <Text style={headerStyles.tagline}>Get me on court.</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitle: () => <LogoHeader />,
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: colors.card, elevation: 0, shadowOpacity: 0 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'radio-outline',
            Profile: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Radar' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

const headerStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  logo: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: -2,
  },
});

export default function RootNavigator() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return null; // aici poți pune un splash screen

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="CreateMatch"
              component={CreateMatchScreen}
              options={{ headerShown: true, title: 'Creează meci', presentation: 'modal' }}
            />
            <Stack.Screen
              name="MatchHistory"
              component={MatchHistoryScreen}
              options={{ headerShown: true, title: 'Istoric meciuri' }}
            />
            <Stack.Screen
              name="PlayerProfile"
              component={PlayerProfileScreen}
              options={{ headerShown: true, title: 'Profil jucător' }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={({ route }) => ({
                headerShown: true,
                title: route.params?.userName ?? 'Chat',
              })}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
