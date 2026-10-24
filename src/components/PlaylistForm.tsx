import { useRef, useState } from 'react';
import { StyleSheet, Text, type TextInput } from 'react-native';

import { errorMessage } from '../api/queries';
import type { Credentials } from '../api/types';
import { parseServerInput } from '../api/xtream';
import { colors, font, isTV } from '../theme';
import { AppButton } from './AppButton';
import { TextField } from './TextField';

interface PlaylistFormProps {
  initial?: Credentials | null;
  initialError?: string | null;
  submitLabel: string;
  onSubmit: (credentials: Credentials) => Promise<void>;
}

export function PlaylistForm({ initial, initialError = null, submitLabel, onSubmit }: PlaylistFormProps) {
  const [url, setUrl] = useState(initial?.url ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const userRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  // Quem cola um link M3U (get.php?username=...&password=...) já tem os três campos preenchidos.
  const handleUrlBlur = () => {
    const parsed = parseServerInput(url);
    if (parsed.username && !username) setUsername(parsed.username);
    if (parsed.password && !password) setPassword(parsed.password);
    if (parsed.url && parsed.url !== url) setUrl(parsed.url);
  };

  const handleSubmit = async () => {
    const parsed = parseServerInput(url);
    const user = username.trim() || parsed.username || '';
    const pass = password || parsed.password || '';
    if (!parsed.url || !user || !pass) {
      setError('Preencha a URL do servidor, o usuário e a senha.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({ url: parsed.url, username: user, password: pass });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TextField
        label="URL do servidor"
        placeholder="http://servidor.com:8080"
        value={url}
        onChangeText={setUrl}
        onBlur={handleUrlBlur}
        keyboardType="url"
        returnKeyType="next"
        onSubmitEditing={() => {
          handleUrlBlur();
          userRef.current?.focus();
        }}
        hasTVPreferredFocus={isTV && !url}
      />
      <TextField
        ref={userRef}
        label="Usuário"
        placeholder="usuário"
        value={username}
        onChangeText={setUsername}
        returnKeyType="next"
        onSubmitEditing={() => passRef.current?.focus()}
      />
      <TextField
        ref={passRef}
        label="Senha"
        placeholder="senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />
      <AppButton
        label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        variant="ghost"
        compact
        style={styles.toggle}
        onPress={() => setShowPassword((v) => !v)}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AppButton label={submitLabel} onPress={handleSubmit} loading={loading} hasTVPreferredFocus={isTV && !!url} />
    </>
  );
}

const styles = StyleSheet.create({
  toggle: {
    alignSelf: 'flex-start',
    marginTop: -8,
  },
  error: {
    color: colors.danger,
    fontSize: font.body,
  },
});
