import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';

export default function PlayerProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [myMatches, setMyMatches] = useState([]);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
    setLoading(false);
  }

  async function openInviteModal() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('created_by', user.id)
      .eq('status', 'open')
      .order('match_date', { ascending: true });

    setMyMatches(data ?? []);
    setInviteModalVisible(true);
  }

  async function sendInvite(matchId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('invitations').insert({
      match_id: matchId,
      from_user: user.id,
      to_user: userId,
    });

    setInviteModalVisible(false);
    if (error) {
      Alert.alert('Eroare', error.message);
    } else {
      Alert.alert('Invitație trimisă', 'Jucătorul va vedea invitația la următoarea vizită în aplicație.');
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <Text style={styles.name}>{profile?.full_name ?? 'Jucător LFP'}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{Number(profile?.rating ?? 3).toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{profile?.matches_played ?? 0}</Text>
          <Text style={styles.statLabel}>Meciuri jucate</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Parte preferată</Text>
        <Text style={styles.sectionValue}>
          {profile?.preferred_side === 'left'
            ? 'Stânga'
            : profile?.preferred_side === 'right'
            ? 'Dreapta'
            : 'Nesetat'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Club favorit</Text>
        <Text style={styles.sectionValue}>{profile?.favorite_club || 'Nesetat'}</Text>
      </View>

      <TouchableOpacity
        style={styles.messageButton}
        onPress={() => navigation.navigate('Chat', { userId, userName: profile?.full_name })}
      >
        <Text style={styles.messageButtonText}>💬 Trimite mesaj</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.inviteButton} onPress={openInviteModal}>
        <Text style={styles.inviteButtonText}>🎾 Invită la meci</Text>
      </TouchableOpacity>

      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Alege un meci</Text>
            {myMatches.length === 0 ? (
              <Text style={styles.emptyText}>
                Nu ai niciun meci deschis. Creează unul întâi din Home.
              </Text>
            ) : (
              <FlatList
                data={myMatches}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.matchOption}
                    onPress={() => sendInvite(item.id)}
                  >
                    <Text style={styles.matchOptionText}>
                      {item.club_name} · {item.match_date} {item.match_time}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setInviteModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Închide</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 110,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 18,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  section: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  sectionValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  messageButton: {
    width: '100%',
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  messageButtonText: {
    color: colors.accent,
    fontWeight: '700',
  },
  inviteButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  matchOption: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  matchOptionText: {
    color: colors.text,
    fontSize: 14,
  },
  modalCancel: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
});
