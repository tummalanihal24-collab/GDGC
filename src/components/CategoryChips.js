import React from 'react';
import { ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { colors } from '../theme';

/** Horizontal, single-select chip row. `options` should include 'All' if you want an unfiltered state. */
export default function CategoryChips({ options, selected, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((opt) => {
        const active = opt === selected;
        return (
          <Pressable key={opt} onPress={() => onSelect(opt)} style={[styles.chip, active && styles.active]}>
            <Text style={[styles.text, active && styles.activeText]}>{opt}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, paddingVertical: 4, gap: 10 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { color: colors.text, fontWeight: '600' },
  activeText: { color: '#fff' },
});
