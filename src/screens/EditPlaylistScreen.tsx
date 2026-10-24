import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { queryClient } from '../api/queries';
import type { Credentials } from '../api/types';
import { PlaylistForm } from '../components/PlaylistForm';
import { ScreenHeader } from '../components/ScreenHeader';
import type { ScreenProps } from '../navigation/types';
import { accountKeyOf, useAuth } from '../store/auth';
import { moveAccountData } from '../store/moveAccountData';
import { colors, font, spacing } from '../theme';
import { notify } from '../utils/notify';
import { formStyles } from './LoginScreen';

export function EditPlaylistScreen({ navigation }: ScreenProps<'EditPlaylist'>) {
  const current = useAuth((s) => s.credentials);
  const signIn = useAuth((s) => s.signIn);

  const save = async (next: Credentials) => {
    const previous = useAuth.getState().credentials;
    // signIn só troca a lista depois que o servidor aceita os novos dados; se falhar, a atual continua valendo.
    await signIn(next);
    const updated = useAuth.getState().credentials;
    if (previous && updated && previous.username === updated.username) {
      moveAccountData(accountKeyOf(previous), accountKeyOf(updated));
    }
    queryClient.clear();
    notify('Lista atualizada.');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title="Editar lista" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={formStyles.card}>
            <Text style={styles.hint}>
              Altere o endereço do servidor, o usuário ou a senha. Os dados só são salvos se o servidor aceitar o
              acesso; se o usuário for o mesmo, favoritos e o histórico são mantidos.
            </Text>
            <PlaylistForm initial={current} submitLabel="Salvar" onSubmit={save} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: spacing.lg,
  },
  hint: {
    color: colors.textMuted,
    fontSize: font.small,
  },
});
