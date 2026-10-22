import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, destinations, filterDestinations } from '../data/destinations';
import DestinationCard from '../components/DestinationCard';
import CategoryChips from '../components/CategoryChips';
import { colors } from '../theme';

/** Stage 1 + 3: destination list with search by name and category filter. */
export default function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const data = useMemo(() => filterDestinations(destinations, query, category), [query, category]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={data}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.hello}>Explore</Text>
                <Text style={styles.title}>Incredible India</Text>
              </View>
              <Pressable style={styles.matchBtn} onPress={() => navigation.navigate('Matcher')}>
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={styles.matchText}>Match me</Text>
              </Pressable>
            </View>

            <View style={styles.search}>
              <Ionicons name="search" size={20} color={colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="Search destinations by name"
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={colors.muted} />
                </Pressable>
              )}
            </View>

            <View style={styles.chipsWrap}>
              <CategoryChips options={['All', ...CATEGORIES]} selected={category} onSelect={setCategory} />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <DestinationCard item={item} onPress={() => navigation.navigate('Details', { id: item.id })} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="compass-outline" size={52} color={colors.muted} />
            <Text style={styles.emptyText}>No destinations match your search.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  hello: { color: colors.muted, fontSize: 15 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  matchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
  },
  matchText: { color: '#fff', fontWeight: '700' },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card,
    borderRadius: 14, paddingHorizontal: 14, height: 48, marginTop: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontSize: 16, color: colors.text },
  chipsWrap: { marginHorizontal: -20, marginVertical: 14 },
  empty: { alignItems: 'center', marginTop: 50, gap: 10 },
  emptyText: { color: colors.muted, fontSize: 16 },
});
