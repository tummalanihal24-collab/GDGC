import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../theme';
import { useWishlist } from '../context/WishlistContext';

/** Card showing a destination's image, name, location and category with a wishlist heart. */
export default function DestinationCard({ item, onPress }) {
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(item.id);

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <Image source={item.image} style={styles.image} />
      <Pressable
        style={styles.heart}
        onPress={() => toggle(item.id)}
        hitSlop={8}
        accessibilityLabel={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? colors.heart : colors.text} />
      </Pressable>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{item.category}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.row}>
          <Ionicons name="location-sharp" size={14} color={colors.accent} />
          <Text style={styles.location}>{item.location}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: 18, overflow: 'hidden', ...shadow },
  image: { width: '100%', height: 190 },
  body: { padding: 14 },
  name: { fontSize: 19, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  location: { color: colors.muted, fontSize: 14 },
  heart: {
    position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.92)',
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 12, left: 12, backgroundColor: colors.primary,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  badgeText: { color: '#fff', fontWeight: '600', fontSize: 12 },
});
