import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';

export default function CreateMatchScreen({ navigation }) {
  const [club, setClub] = useState('');
  const [date, setDate] = useState(''); // format simplu: YYYY-MM-DD
  const [time, setTime] = useState(''); // format simplu: HH:MM
  const [level, setLevel] = useState('');
  const [playersNeeded, setPlayersNeeded] = useState('4');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!club || !date || !time || !level) {
      Alert.alert('Lipsesc date', 'Completează club, dată, oră și nivel.');
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('matches').insert({
      club,
      match_date: date,
      match_time: time,
      level: parseFloat(level),
      players_needed: parseInt(playersNeeded, 10),
      players_joined: 1,
      created_by: user?.id,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Eroare', error.message);
    } else {
      navigation.goBack();
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Match</Text>

      <TextInput style={styles.input} placeholder="Club" value={club} onChangeText={setClub} />
      <TextInput
        style={styles.input}
        placeholder="Dată (2026-08-15)"
        value={date}
        onChangeText={setDate}
      />
      <TextInput
        style={styles.input}
        placeholder="Oră (19:00)"
        value={time}
        onChangeText={setTime}
      />
      <TextInput
        style={styles.input}
        placeholder="Nivel (ex: 3.5)"
        keyboardType="decimal-pad"
        value={level}
        onChangeText={setLevel}
      />
      <TextInput
        style={styles.input}
        placeholder="Jucători necesari (4)"
        keyboardType="number-pad"
        value={playersNeeded}
        onChangeText={setPlayersNeeded}
      />

      <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Se salvează...' : 'Confirm'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
