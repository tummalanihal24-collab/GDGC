import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { destinations } from '../data/destinations';
import { useWishlist } from '../context/WishlistContext';
import DestinationCard from '../components/DestinationCard';
import { colors } from '../theme';

/** Stage 4: saved destinations. The heart on each card removes it, and the list updates instantly. */
export default function WishlistScreen({ navigation }) {
  const { ids } = useWishlist();
  const saved = destinations.filter((d) => ids.includes(d.id));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={saved}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.title}>My Wishlist</Text>
            <Text style={styles.sub}>{saved.length} saved {saved.length === 1 ? 'place' : 'places'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <DestinationCard item={item} onPress={() => navigation.navigate('Details', { id: item.id })} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-dislike-outline" size={52} color={colors.muted} />
            <Text style={styles.emptyText}>Nothing saved yet.</Text>
            <Text style={styles.emptyHint}>Tap the heart on any destination to save it for later.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
  sub: { color: colors.muted, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 70, gap: 8, paddingHorizontal: 30 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyHint: { color: colors.muted, textAlign: 'center' },
});
