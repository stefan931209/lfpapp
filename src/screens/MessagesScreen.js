import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';

export default function MessagesScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!msgs || msgs.length === 0) {
      setConversations([]);
      return;
    }

    // Grupăm după interlocutor, păstrăm doar ultimul mesaj din fiecare conversație
    const byPartner = {};
    for (const m of msgs) {
      const partnerId = m.from_user === user.id ? m.to_user : m.from_user;
      if (!byPartner[partnerId]) {
        byPartner[partnerId] = m;
      }
    }

    const partnerIds = Object.keys(byPartner);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', partnerIds);

    const list = partnerIds
      .map((id) => ({
        partnerId: id,
        profile: profiles?.find((p) => p.id === id),
        lastMessage: byPartner[id],
      }))
      .sort(
        (a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
      );

    setConversations(list);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadConversations();
      setLoading(false);
    })();
  }, [loadConversations]);

  // Reîncarcă lista de fiecare dată când revii pe acest tab (ex. după un mesaj nou trimis)
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadConversations();
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
      data={conversations}
      keyExtractor={(item) => item.partnerId}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          Nicio conversație încă. Trimite un mesaj unui jucător din radar, de pe Home.
        </Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            navigation.navigate('Chat', {
              userId: item.partnerId,
              userName: item.profile?.full_name,
            })
          }
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.name}>{item.profile?.full_name ?? 'Jucător LFP'}</Text>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage.content}
            </Text>
          </View>
          <Text style={styles.time}>
            {new Date(item.lastMessage.created_at).toLocaleTimeString('ro-RO', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </TouchableOpacity>
      )}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    color: colors.accent,
    fontWeight: '700',
  },
  rowInfo: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    color: colors.text,
    fontSize: 14,
  },
  lastMessage: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
    marginLeft: spacing.sm,
  },
});
