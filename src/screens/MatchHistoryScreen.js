import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';

export default function MatchHistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Meciurile la care userul s-a alăturat
    const { data: joined } = await supabase
      .from('match_players')
      .select('match_id, team')
      .eq('user_id', user.id);

    const matchIds = (joined ?? []).map((j) => j.match_id);
    if (matchIds.length === 0) {
      setHistory([]);
      return;
    }

    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .in('id', matchIds)
      .order('match_date', { ascending: false });

    const { data: results } = await supabase
      .from('match_results')
      .select('*')
      .in('match_id', matchIds);

    const merged = (matches ?? []).map((m) => {
      const teamInfo = joined.find((j) => j.match_id === m.id);
      const result = results?.find((r) => r.match_id === m.id);
      return { ...m, myTeam: teamInfo?.team, result };
    });

    setHistory(merged);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadHistory();
      setLoading(false);
    })();
  }, [loadHistory]);

  async function onRefresh() {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={history}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          Nu ai jucat încă niciun meci. Istoricul apare aici după primul meci.
        </Text>
      }
      renderItem={({ item }) => {
        const hasResult = item.result && item.result.team_a_score != null;
        const confirmed =
          item.result?.confirmed_by_team_a && item.result?.confirmed_by_team_b;

        let scoreLabel = 'Fără scor introdus';
        let outcomeLabel = null;
        if (hasResult) {
          scoreLabel = `${item.result.team_a_score} - ${item.result.team_b_score}`;
          if (item.myTeam) {
            const myScore =
              item.myTeam === 'A' ? item.result.team_a_score : item.result.team_b_score;
            const otherScore =
              item.myTeam === 'A' ? item.result.team_b_score : item.result.team_a_score;
            outcomeLabel = myScore > otherScore ? 'Câștig' : myScore < otherScore ? 'Pierdere' : 'Egal';
          }
        }

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.club}>{item.club_name || 'Club nespecificat'}</Text>
              <Text style={styles.date}>
                {item.match_date} · {item.match_time}
              </Text>
            </View>
            <Text style={styles.level}>Nivel {item.level ?? '-'}</Text>

            <View style={styles.scoreRow}>
              <Text style={styles.score}>{scoreLabel}</Text>
              {outcomeLabel && (
                <Text
                  style={[
                    styles.outcome,
                    outcomeLabel === 'Câștig'
                      ? styles.outcomeWin
                      : outcomeLabel === 'Pierdere'
                      ? styles.outcomeLoss
                      : styles.outcomeDraw,
                  ]}
                >
                  {outcomeLabel}
                </Text>
              )}
            </View>

            {hasResult && (
              <Text style={styles.confirmStatus}>
                {confirmed ? '✓ Scor confirmat de ambele echipe' : 'În așteptarea confirmării'}
              </Text>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  club: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  date: {
    color: colors.textMuted,
    fontSize: 12,
  },
  level: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  outcome: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  outcomeWin: {
    backgroundColor: colors.primary,
    color: '#FFFFFF',
  },
  outcomeLoss: {
    backgroundColor: colors.danger,
    color: '#FFFFFF',
  },
  outcomeDraw: {
    backgroundColor: colors.border,
    color: colors.text,
  },
  confirmStatus: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
  },
});
