import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';

const DURATIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 oră', minutes: 60 },
  { label: '2 ore', minutes: 120 },
];

export default function HomeScreen({ navigation }) {
  const [readyActive, setReadyActive] = useState(false);
  const [matches, setMatches] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadMatches = useCallback(async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true })
      .limit(20);
    if (!error && data) setMatches(data);
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  async function activateReadyToPlay(minutes) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const activeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    await supabase
      .from('ready_to_play')
      .upsert({ user_id: user.id, active_until: activeUntil });

    setReadyActive(true);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Ready To Play */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🟢 Ready To Play</Text>
        <Text style={styles.sectionSubtitle}>
          Activează-te pentru a apărea în radar și a primi prioritate.
        </Text>
        <View style={styles.durationRow}>
          {DURATIONS.map((d) => (
            <TouchableOpacity
              key={d.label}
              style={styles.durationChip}
              onPress={() => activateReadyToPlay(d.minutes)}
            >
              <Text style={styles.durationChipText}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {readyActive && (
          <Text style={styles.activeBadge}>Ești activ în radar acum.</Text>
        )}
      </View>

      {/* Open Matches */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>🔥 Open Matches</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateMatch')}>
            <Text style={styles.createLink}>+ Creează</Text>
          </TouchableOpacity>
        </View>

        {matches.length === 0 ? (
          <Text style={styles.emptyText}>Niciun meci deschis momentan.</Text>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.matchCard}>
                <View style={styles.matchCardHeader}>
                  <Text style={styles.matchClub}>{item.club}</Text>
                  <Text style={styles.matchTime}>
                    {item.match_date} · {item.match_time}
                  </Text>
                </View>
                <Text style={styles.matchDetails}>
                  {item.players_joined}/{item.players_needed} jucători · Nivel{' '}
                  {item.level}
                </Text>
                <TouchableOpacity style={styles.joinButton}>
                  <Text style={styles.joinButtonText}>JOIN</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      {/* Available Players / Clubs / Events - placeholder pentru extindere */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Available Players</Text>
        <Text style={styles.emptyText}>În curs de implementare.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  durationChip: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  durationChipText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  activeBadge: {
    marginTop: spacing.sm,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  createLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  matchCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  matchClub: {
    fontWeight: '700',
    color: colors.text,
  },
  matchTime: {
    color: colors.textMuted,
    fontSize: 12,
  },
  matchDetails: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
  },
  joinButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  joinButtonText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
});
