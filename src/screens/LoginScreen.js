import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Lipsesc date', 'Completează email și parolă.');
      return;
    }
    setLoading(true);
    const action = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });

    const { error } = await action;
    setLoading(false);

    if (error) Alert.alert('Eroare', error.message);
    // Navigarea către Home se face automat prin listener-ul de sesiune din RootNavigator
  }

  async function handleForgotPassword() {
    if (!email) {
      Alert.alert(
        'Introdu email-ul',
        'Scrie-ți adresa de email în câmpul de mai sus, apoi apasă din nou "Am uitat parola".'
      );
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);

    if (error) {
      Alert.alert('Eroare', error.message);
    } else {
      Alert.alert(
        'Verifică email-ul',
        'Ți-am trimis un link de resetare a parolei, dacă adresa e înregistrată.'
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.logo}>LFP</Text>
      <Text style={styles.tagline}>Get me on court.</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Parolă"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.showButton}
            onPress={() => setShowPassword((v) => !v)}
          >
            <Text style={styles.showButtonText}>{showPassword ? 'Ascunde' : 'Arată'}</Text>
          </TouchableOpacity>
        </View>

        {!isSignUp && (
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Am uitat parola</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Se procesează...' : isSignUp ? 'Creează cont' : 'Intră în cont'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.switchText}>
            {isSignUp ? 'Ai deja cont? Intră în cont' : 'Nu ai cont? Creează unul'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logo: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.xl,
    opacity: 0.8,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  showButton: {
    paddingHorizontal: spacing.md,
  },
  showButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  forgotText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  switchText: {
    textAlign: 'center',
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
  },
});
