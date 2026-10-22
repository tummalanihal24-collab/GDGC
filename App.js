import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { WishlistProvider, useWishlist } from './src/context/WishlistContext';
import HomeScreen from './src/screens/HomeScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import DetailsScreen from './src/screens/DetailsScreen';
import MatcherScreen from './src/screens/MatcherScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Home and Wishlist live in tabs; Details and Matcher are pushed on top of them.
function Tabs() {
  const { ids } = useWishlist();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size, focused }) => {
          const base = route.name === 'Home' ? 'compass' : 'heart';
          return <Ionicons name={focused ? base : `${base}-outline`} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ tabBarBadge: ids.length || undefined, tabBarBadgeStyle: { backgroundColor: colors.accent } }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <WishlistProvider>
        <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg } }}>
          <StatusBar style="dark" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="Details" component={DetailsScreen} />
            <Stack.Screen name="Matcher" component={MatcherScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </WishlistProvider>
    </SafeAreaProvider>
  );
}
