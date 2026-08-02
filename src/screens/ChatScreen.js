import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';

export default function ChatScreen({ route }) {
  const { userId: otherUserId, userName } = route.params;
  const [myId, setMyId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const listRef = useRef(null);

  // Ascultăm direct evenimentele de tastatură — mai sigur decât
  // KeyboardAvoidingView, care nu se comportă consistent pe Android în Expo Go.
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const loadMessages = useCallback(
    async (currentUserId) => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(from_user.eq.${currentUserId},to_user.eq.${otherUserId}),and(from_user.eq.${otherUserId},to_user.eq.${currentUserId})`
        )
        .order('created_at', { ascending: true });
      setMessages(data ?? []);

      // Marcăm ca citite mesajele primite din partea acestui interlocutor
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('from_user', otherUserId)
        .eq('to_user', currentUserId)
        .eq('read', false);
    },
    [otherUserId]
  );

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);
      await loadMessages(user.id);

      const channel = supabase
        .channel(`chat-${user.id}-${otherUserId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const m = payload.new;
            const relevant =
              (m.from_user === user.id && m.to_user === otherUserId) ||
              (m.from_user === otherUserId && m.to_user === user.id);
            if (relevant) {
              setMessages((prev) => [...prev, m]);
              if (m.to_user === user.id) {
                supabase.from('messages').update({ read: true }).eq('id', m.id);
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    })();
  }, [otherUserId, loadMessages]);

  async function sendMessage() {
    if (!text.trim() || !myId) return;
    const content = text.trim();
    setText('');

    const { error, data } = await supabase
      .from('messages')
      .insert({ from_user: myId, to_user: otherUserId, content })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data]);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMine = item.from_user === myId;
          return (
            <View
              style={[
                styles.bubble,
                isMine ? styles.bubbleMine : styles.bubbleTheirs,
              ]}
            >
              <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
                {item.content}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Nicio conversație încă cu {userName ?? 'acest jucător'}. Trimite primul mesaj!
          </Text>
        }
      />

      <View style={[styles.inputRow, { marginBottom: keyboardHeight }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Scrie un mesaj..."
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Trimite</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messagesList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  bubbleTheirs: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  bubbleTextTheirs: {
    color: colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
