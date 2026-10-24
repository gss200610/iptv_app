import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaylistForm } from '../components/PlaylistForm';
import { useAuth } from '../store/auth';
import { colors, font, radius, spacing } from '../theme';

export function LoginScreen() {
  const saved = useAuth((s) => s.credentials);
  const restoreError = useAuth((s) => s.restoreError);
  const signIn = useAuth((s) => s.signIn);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>IPTV Player</Text>
            <Text style={styles.subtitle}>Entre com os dados de acesso fornecidos pelo seu provedor.</Text>

            <PlaylistForm initial={saved} initialError={restoreError} submitLabel="Entrar" onSubmit={signIn} />

            <Text style={styles.note}>
              Este aplicativo é apenas um reprodutor e não fornece nenhum conteúdo. Use somente listas às quais você
              tem direito de acesso.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const formStyles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: formStyles.card,
  title: {
    color: colors.text,
    fontSize: font.title,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: font.body,
  },
  note: {
    color: colors.textMuted,
    fontSize: font.small,
    textAlign: 'center',
  },
});
