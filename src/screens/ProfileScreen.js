import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [preferredSide, setPreferredSide] = useState(null);
  const [favoriteClub, setFavoriteClub] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Dacă profilul nu există încă (primul login), îl creăm
    if (!data) {
      const { data: created } = await supabase
        .from('profiles')
        .insert({ id: user.id, full_name: user.email?.split('@')[0] ?? 'Jucător' })
        .select()
        .single();
      data = created;
    }

    setProfile(data);
    setFullName(data?.full_name ?? '');
    setPreferredSide(data?.preferred_side ?? null);
    setFavoriteClub(data?.favorite_club ?? '');
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        preferred_side: preferredSide,
        favorite_club: favoriteClub.trim(),
      })
      .eq('id', user.id);

    setSaving(false);
    if (!error) {
      setEditing(false);
      loadProfile();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
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
      <View style={styles.avatarWrapper}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
      </View>

      {editing ? (
        <TextInput
          style={styles.nameInput}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Numele tău"
          placeholderTextColor={colors.textMuted}
        />
      ) : (
        <Text style={styles.name}>{profile?.full_name || 'Jucător LFP'}</Text>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{Number(profile?.rating ?? 3).toFixed(1)}</Text>
          <Text style={styles.statLabel}>
            Rating{profile?.is_provisional ? ' (provizoriu)' : ''}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{profile?.matches_played ?? 0}</Text>
          <Text style={styles.statLabel}>Meciuri jucate</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Parte preferată</Text>
        {editing ? (
          <View style={styles.sideRow}>
            {['left', 'right'].map((side) => (
              <TouchableOpacity
                key={side}
                style={[
                  styles.sideChip,
                  preferredSide === side && styles.sideChipActive,
                ]}
                onPress={() => setPreferredSide(side)}
              >
                <Text
                  style={[
                    styles.sideChipText,
                    preferredSide === side && styles.sideChipTextActive,
                  ]}
                >
                  {side === 'left' ? 'Stânga' : 'Dreapta'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.sectionValue}>
            {profile?.preferred_side === 'left'
              ? 'Stânga'
              : profile?.preferred_side === 'right'
              ? 'Dreapta'
              : 'Nesetat'}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Club favorit</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={favoriteClub}
            onChangeText={setFavoriteClub}
            placeholder="ex. Tenis Life Berceni"
            placeholderTextColor={colors.textMuted}
          />
        ) : (
          <Text style={styles.sectionValue}>{profile?.favorite_club || 'Nesetat'}</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.historyLink}
        onPress={() => navigation.navigate('MatchHistory')}
      >
        <Text style={styles.historyLinkText}>📋 Istoric meciuri</Text>
      </TouchableOpacity>

      {editing ? (
        <View style={styles.editActionsRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setEditing(false);
              setFullName(profile?.full_name ?? '');
              setPreferredSide(profile?.preferred_side ?? null);
              setFavoriteClub(profile?.favorite_club ?? '');
            }}
          >
            <Text style={styles.cancelText}>Renunță</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveText}>{saving ? 'Se salvează...' : 'Salvează'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
          <Text style={styles.editButtonText}>Editează profilul</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Ieși din cont</Text>
      </TouchableOpacity>
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
  avatarWrapper: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
  },
  avatarPlaceholder: {
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
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
  nameInput: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minWidth: 180,
    textAlign: 'center',
    paddingVertical: spacing.xs,
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
    textAlign: 'center',
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
  input: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
  },
  sideRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sideChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sideChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sideChipText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  sideChipTextActive: {
    color: '#FFFFFF',
  },
  historyLink: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.md,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  logoutText: {
    color: colors.danger,
    fontWeight: '600',
  },
});
