import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDestination } from '../data/destinations';
import { useWishlist } from '../context/WishlistContext';
import { fetchWeather } from '../utils/weather';
import { colors, radius, shadow } from '../theme';

/** Stage 2: description, best time, attractions, plus live weather and a Google Maps link. */
export default function DetailsScreen({ route, navigation }) {
  const dest = getDestination(route.params.id);
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(dest.id);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(false);

  useEffect(() => {
    fetchWeather(dest.coords).then(setWeather).catch(() => setWeatherError(true));
  }, [dest]);

  const openMaps = () =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${dest.coords.lat},${dest.coords.lon}`);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View>
        <Image source={dest.image} style={styles.hero} />
        <Pressable style={[styles.circle, { left: 16 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable style={[styles.circle, { right: 16 }]} onPress={() => toggle(dest.id)}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? colors.heart : colors.text} />
        </Pressable>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.category}>{dest.category.toUpperCase()}</Text>
        <Text style={styles.name}>{dest.name}</Text>
        <View style={styles.row}>
          <Ionicons name="location-sharp" size={16} color={colors.accent} />
          <Text style={styles.location}>{dest.location}</Text>
        </View>

        <Text style={styles.heading}>About</Text>
        <Text style={styles.body}>{dest.description}</Text>

        <View style={styles.infoCard}>
          <Ionicons name="calendar" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Best time to visit</Text>
            <Text style={styles.infoValue}>{dest.bestTime}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="partly-sunny" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Weather right now</Text>
            {weather ? (
              <Text style={styles.infoValue}>
                {weather.temp}°C · {weather.summary} · wind {weather.wind} km/h
              </Text>
            ) : weatherError ? (
              <Text style={styles.infoValue}>Unavailable offline</Text>
            ) : (
              <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: 'flex-start' }} />
            )}
          </View>
        </View>

        <Text style={styles.heading}>Popular attractions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 6 }}>
          {dest.attractions.map((a) => (
            <View key={a.name} style={styles.attraction}>
              <Image source={a.image} style={styles.attractionImg} />
              <Text style={styles.attractionName} numberOfLines={2}>{a.name}</Text>
            </View>
          ))}
        </ScrollView>

        <Pressable style={styles.mapBtn} onPress={openMaps}>
          <Ionicons name="map" size={20} color="#fff" />
          <Text style={styles.mapText}>View on Google Maps</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { width: '100%', height: 330 },
  circle: {
    position: 'absolute', top: 50, width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.93)', alignItems: 'center', justifyContent: 'center',
  },
  sheet: {
    marginTop: -28, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 22,
  },
  category: { color: colors.primary, fontWeight: '800', letterSpacing: 1, fontSize: 12 },
  name: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  location: { color: colors.muted, fontSize: 15 },
  heading: { fontSize: 19, fontWeight: '700', color: colors.text, marginTop: 24, marginBottom: 8 },
  body: { color: colors.muted, fontSize: 15.5, lineHeight: 23 },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card,
    padding: 14, borderRadius: radius.md, marginTop: 12, ...shadow,
  },
  infoLabel: { color: colors.muted, fontSize: 13 },
  infoValue: { color: colors.text, fontWeight: '600', fontSize: 15, marginTop: 2 },
  attraction: { width: 150 },
  attractionImg: { width: 150, height: 110, borderRadius: radius.md },
  attractionName: { marginTop: 8, fontWeight: '600', color: colors.text },
  mapBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 28,
    backgroundColor: colors.primary, paddingVertical: 15, borderRadius: radius.md,
  },
  mapText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
