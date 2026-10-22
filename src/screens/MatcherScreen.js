import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, destinations } from '../data/destinations';
import CategoryChips from '../components/CategoryChips';
import DestinationCard from '../components/DestinationCard';
import { colors } from '../theme';

const BUDGETS = { Budget: 1, Moderate: 2, Premium: 3 };
const DURATIONS = { 'Weekend (1-3 days)': 3, 'About a week (4-6)': 6, 'Long trip (7+)': 99 };

/**
 * Smart Destination Matcher: scores each destination on travel type, budget and duration
 * (higher = better fit) and lists the best matches first.
 */
export default function MatcherScreen({ navigation }) {
  const [type, setType] = useState('Beaches');
  const [budget, setBudget] = useState('Moderate');
  const [duration, setDuration] = useState('About a week (4-6)');

  const matches = useMemo(() => {
    const maxDays = DURATIONS[duration];
    return destinations
      .map((d) => {
        let score = 0;
        if (d.category === type) score += 3;
        score += 2 - Math.abs(d.budget - BUDGETS[budget]);
        const fitsDays = maxDays === 99 ? d.days >= 7 : d.days <= maxDays && d.days >= maxDays - 2;
        if (fitsDays) score += 2;
        return { d, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.d);
  }, [type, budget, duration]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Match my trip</Text>
        </View>

        <Text style={styles.label}>Travel type</Text>
        <CategoryChips options={CATEGORIES} selected={type} onSelect={setType} />
        <Text style={styles.label}>Budget</Text>
        <CategoryChips options={Object.keys(BUDGETS)} selected={budget} onSelect={setBudget} />
        <Text style={styles.label}>Trip duration</Text>
        <CategoryChips options={Object.keys(DURATIONS)} selected={duration} onSelect={setDuration} />

        <Text style={[styles.label, { marginBottom: 12 }]}>Top matches for you</Text>
        <View style={{ paddingHorizontal: 20 }}>
          {matches.map((item) => (
            <DestinationCard key={item.id} item={item} onPress={() => navigation.navigate('Details', { id: item.id })} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  label: { fontSize: 16, fontWeight: '700', color: colors.text, marginHorizontal: 20, marginTop: 22, marginBottom: 8 },
});
