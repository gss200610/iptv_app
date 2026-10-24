import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { queryClient } from '../api/queries';
import { AppButton } from '../components/AppButton';
import type { RootStackParamList } from '../navigation/types';
import { useAccountKey, useAuth } from '../store/auth';
import { useProgressStore } from '../store/progress';
import { PLAYER_IDENTITIES, useSettings } from '../store/settings';
import { colors, font, radius, spacing } from '../theme';
import { formatExpiry } from '../utils/format';
import { notify } from '../utils/notify';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const credentials = useAuth((s) => s.credentials);
  const userInfo = useAuth((s) => s.userInfo);
  const signOut = useAuth((s) => s.signOut);
  const account = useAccountKey();
  const clearProgress = useProgressStore((s) => s.clear);
  const liveFormat = useSettings((s) => s.liveFormat);
  const setLiveFormat = useSettings((s) => s.setLiveFormat);
  const playerIdentity = useSettings((s) => s.playerIdentity);
  const setPlayerIdentity = useSettings((s) => s.setPlayerIdentity);

  const confirm = (title: string, message: string, onConfirm: () => void) =>
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: onConfirm },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Conta</Text>
        <Row label="Servidor" value={credentials?.url ?? '-'} />
        <Row label="Usuário" value={credentials?.username ?? '-'} />
        {userInfo ? (
          <>
            <Row label="Status" value={userInfo.status} />
            <Row label="Vencimento" value={formatExpiry(userInfo.exp_date)} />
            <Row label="Conexões" value={`${userInfo.active_cons ?? 0} de ${userInfo.max_connections ?? '-'}`} />
          </>
        ) : (
          <Text style={styles.muted}>Não foi possível consultar os dados da conta (sem conexão).</Text>
        )}
        <View style={styles.row}>
          <AppButton label="Editar lista" compact onPress={() => navigation.navigate('EditPlaylist')} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reprodução de canais ao vivo</Text>
        <Text style={styles.muted}>
          Formato tentado primeiro. Se o canal falhar, o app tenta o outro sozinho.
        </Text>
        <View style={styles.row}>
          <AppButton
            label="HLS (.m3u8)"
            compact
            variant={liveFormat === 'm3u8' ? 'primary' : 'secondary'}
            onPress={() => setLiveFormat('m3u8')}
          />
          <AppButton
            label="MPEG-TS (.ts)"
            compact
            variant={liveFormat === 'ts' ? 'primary' : 'secondary'}
            onPress={() => setLiveFormat('ts')}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Identificação do player</Text>
        <Text style={styles.muted}>
          Como o app se apresenta ao servidor. Se canais ou filmes que abrem em outros apps derem erro aqui, troque esta
          opção e tente de novo.
        </Text>
        <View style={styles.row}>
          {PLAYER_IDENTITIES.map((identity) => (
            <AppButton
              key={identity.id}
              label={identity.label}
              compact
              variant={playerIdentity === identity.id ? 'primary' : 'secondary'}
              onPress={() => setPlayerIdentity(identity.id)}
            />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dados</Text>
        <View style={styles.row}>
          <AppButton
            label="Atualizar listas"
            compact
            variant="secondary"
            onPress={() => {
              queryClient.invalidateQueries();
              notify('As listas serão recarregadas do servidor.');
            }}
          />
          <AppButton
            label="Limpar histórico"
            compact
            variant="secondary"
            onPress={() =>
              confirm('Limpar histórico', 'Apagar o progresso de todos os filmes e episódios desta conta?', () => {
                clearProgress(account);
                notify('Histórico apagado.');
              })
            }
          />
          <AppButton
            label="Sair da conta"
            compact
            variant="danger"
            onPress={() =>
              confirm('Sair', 'Deseja sair desta conta? Favoritos e progresso continuam salvos no aparelho.', () => {
                queryClient.clear();
                signOut();
              })
            }
          />
        </View>
      </View>

      <Text style={styles.version}>Versão {Constants.expoConfig?.version ?? '-'}</Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: font.medium,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: font.body,
  },
  value: {
    color: colors.text,
    fontSize: font.body,
    flexShrink: 1,
    textAlign: 'right',
  },
  muted: {
    color: colors.textMuted,
    fontSize: font.small,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  version: {
    color: colors.textMuted,
    fontSize: font.small,
    textAlign: 'center',
  },
});
