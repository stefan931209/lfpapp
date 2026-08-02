import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';

const DURATIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 oră', minutes: 60 },
  { label: '2 ore', minutes: 120 },
];

// Distanța dintre două puncte GPS (formula Haversine), în km
function distanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function HomeScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [myCoords, setMyCoords] = useState(null);
  const [readyActiveUntil, setReadyActiveUntil] = useState(null);
  const [matches, setMatches] = useState([]);
  const [joinedMatchIds, setJoinedMatchIds] = useState([]);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Meciuri deschise
    const { data: matchData } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'open')
      .order('match_date', { ascending: true })
      .limit(20);
    setMatches(matchData ?? []);

    // Meciurile la care userul s-a alăturat deja
    const { data: joined } = await supabase
      .from('match_players')
      .select('match_id')
      .eq('user_id', user.id);
    setJoinedMatchIds((joined ?? []).map((j) => j.match_id));

    // Starea proprie de Ready to Play (+ coordonate proprii, dacă există)
    const { data: myAvailability } = await supabase
      .from('ready_to_play')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (myAvailability?.active_until && new Date(myAvailability.active_until) > new Date()) {
      setReadyActiveUntil(myAvailability.active_until);
    } else {
      setReadyActiveUntil(null);
    }
    if (myAvailability?.latitude != null) {
      setMyCoords({ latitude: myAvailability.latitude, longitude: myAvailability.longitude });
    }

    // Radar — jucători online acum
    const { data: activePlayers } = await supabase
      .from('ready_to_play')
      .select('user_id, active_until, latitude, longitude')
      .gt('active_until', new Date().toISOString())
      .neq('user_id', user.id);

    if (activePlayers && activePlayers.length > 0) {
      const ids = activePlayers.map((p) => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, rating, favorite_club')
        .in('id', ids);

      let merged = activePlayers.map((p) => ({
        ...p,
        profile: profiles?.find((pr) => pr.id === p.user_id),
      }));

      // Sortare după distanță, dacă avem coordonatele proprii
      if (myAvailability?.latitude != null) {
        merged = merged
          .map((p) => ({
            ...p,
            distance: distanceKm(
              myAvailability.latitude,
              myAvailability.longitude,
              p.latitude,
              p.longitude
            ),
          }))
          .sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
      }

      setOnlinePlayers(merged);
    } else {
      setOnlinePlayers([]);
    }

    // Invitații primite, în așteptare
    const { data: invData } = await supabase
      .from('invitations')
      .select('*, matches(club_name, match_date, match_time)')
      .eq('to_user', user.id)
      .eq('status', 'pending');

    if (invData && invData.length > 0) {
      const fromIds = invData.map((i) => i.from_user);
      const { data: fromProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', fromIds);
      setInvitations(
        invData.map((i) => ({
          ...i,
          fromProfile: fromProfiles?.find((p) => p.id === i.from_user),
        }))
      );
    } else {
      setInvitations([]);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function activateReadyToPlay(minutes) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const activeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    // Cerem permisiunea de locație
    let latitude = null;
    let longitude = null;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      try {
        const position = await Location.getCurrentPositionAsync({});
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (e) {
        // continuăm fără locație dacă eșuează
      }
    } else {
      Alert.alert(
        'Locație indisponibilă',
        'Fără acces la locație, radarul nu poate arăta distanța până la ceilalți jucători, dar poți fi activ oricum.'
      );
    }

    await supabase.from('ready_to_play').upsert({
      user_id: user.id,
      active_until: activeUntil,
      latitude,
      longitude,
    });

    setReadyActiveUntil(activeUntil);
    if (latitude != null) setMyCoords({ latitude, longitude });
    loadAll();
  }

  async function handleJoin(matchId) {
    if (!userId) return;
    const { error } = await supabase
      .from('match_players')
      .insert({ match_id: matchId, user_id: userId });

    if (!error) {
      const match = matches.find((m) => m.id === matchId);
      if (match) {
        await supabase
          .from('matches')
          .update({ players_joined: (match.players_joined ?? 1) + 1 })
          .eq('id', matchId);
      }
      loadAll();
    }
  }

  async function respondInvitation(invitationId, matchId, accept) {
    await supabase
      .from('invitations')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', invitationId);

    if (accept && userId) {
      await supabase
        .from('match_players')
        .insert({ match_id: matchId, user_id: userId });
    }
    loadAll();
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Invitații primite */}
      {invitations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✉️ Invitații la meci</Text>
          {invitations.map((inv) => (
            <View key={inv.id} style={styles.inviteCard}>
              <Text style={styles.inviteText}>
                <Text style={{ fontWeight: '700' }}>{inv.fromProfile?.full_name ?? 'Un jucător'}</Text>{' '}
                te-a invitat la {inv.matches?.club_name} · {inv.matches?.match_date}{' '}
                {inv.matches?.match_time}
              </Text>
              <View style={styles.inviteActionsRow}>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => respondInvitation(inv.id, inv.match_id, false)}
                >
                  <Text style={styles.declineText}>Refuz</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => respondInvitation(inv.id, inv.match_id, true)}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

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
        {readyActiveUntil && (
          <Text style={styles.activeBadge}>
            Ești activ în radar până la{' '}
            {new Date(readyActiveUntil).toLocaleTimeString('ro-RO', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            .
          </Text>
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
            renderItem={({ item }) => {
              const alreadyJoined = joinedMatchIds.includes(item.id);
              const full = (item.players_joined ?? 1) >= (item.players_needed ?? 4);
              return (
                <View style={styles.matchCard}>
                  <View style={styles.matchCardHeader}>
                    <Text style={styles.matchClub}>{item.club_name}</Text>
                    <Text style={styles.matchTime}>
                      {item.match_date} · {item.match_time}
                    </Text>
                  </View>
                  <Text style={styles.matchDetails}>
                    {item.players_joined ?? 1}/{item.players_needed ?? 4} jucători · Nivel{' '}
                    {item.level}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.joinButton,
                      (alreadyJoined || full) && styles.joinButtonDisabled,
                    ]}
                    onPress={() => handleJoin(item.id)}
                    disabled={alreadyJoined || full}
                  >
                    <Text style={styles.joinButtonText}>
                      {alreadyJoined ? 'DEJA ÎNSCRIS' : full ? 'COMPLET' : 'JOIN'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Radar jucători online, pe locație */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Jucători online acum</Text>
        {!myCoords && (
          <Text style={styles.emptyText}>
            Activează-te în "Ready to Play" ca să vezi distanța până la ceilalți jucători.
          </Text>
        )}
        {onlinePlayers.length === 0 ? (
          <Text style={styles.emptyText}>Niciun jucător activ în radar momentan.</Text>
        ) : (
          <FlatList
            data={onlinePlayers}
            keyExtractor={(item) => item.user_id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.playerRow}
                onPress={() =>
                  navigation.navigate('PlayerProfile', { userId: item.user_id })
                }
              >
                <View style={styles.playerAvatar}>
                  <Text style={styles.playerAvatarText}>
                    {item.profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>
                    {item.profile?.full_name ?? 'Jucător LFP'}
                  </Text>
                  <Text style={styles.playerMeta}>
                    Nivel {Number(item.profile?.rating ?? 3).toFixed(1)}
                    {item.profile?.favorite_club ? ` · ${item.profile.favorite_club}` : ''}
                    {item.distance != null ? ` · ${item.distance.toFixed(1)} km` : ''}
                  </Text>
                </View>
                <View style={styles.liveDot} />
              </TouchableOpacity>
            )}
          />
        )}
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
  joinButtonDisabled: {
    backgroundColor: colors.border,
  },
  joinButtonText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  playerAvatarText: {
    color: colors.accent,
    fontWeight: '700',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontWeight: '600',
    color: colors.text,
    fontSize: 14,
  },
  playerMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  inviteCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inviteText: {
    color: colors.text,
    fontSize: 13,
  },
  inviteActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  declineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  declineText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  acceptText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
