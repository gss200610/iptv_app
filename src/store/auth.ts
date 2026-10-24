import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { Credentials, UserInfo } from '../api/types';
import { XtreamClient, XtreamError, parseServerInput } from '../api/xtream';

const CREDENTIALS_KEY = 'iptv.credentials';

type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  credentials: Credentials | null;
  client: XtreamClient | null;
  userInfo: UserInfo | null;
  /** Mensagem exibida no login quando a sessão salva não pôde ser restaurada. */
  restoreError: string | null;
  restore: () => Promise<void>;
  signIn: (credentials: Credentials) => Promise<void>;
  signOut: () => Promise<void>;
}

/** Chave usada para separar favoritos e progresso de cada conta. */
export function accountKeyOf(credentials: Credentials | null): string {
  if (!credentials) return '';
  return `${credentials.url.toLowerCase()}|${credentials.username}`;
}

export const useAuth = create<AuthState>((set) => ({
  status: 'restoring',
  credentials: null,
  client: null,
  userInfo: null,
  restoreError: null,

  restore: async () => {
    const saved = await SecureStore.getItemAsync(CREDENTIALS_KEY).catch(() => null);
    if (!saved) {
      set({ status: 'signedOut' });
      return;
    }
    let credentials: Credentials;
    try {
      credentials = JSON.parse(saved) as Credentials;
    } catch {
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY).catch(() => undefined);
      set({ status: 'signedOut' });
      return;
    }

    const client = new XtreamClient(credentials);
    try {
      const auth = await client.authenticate();
      set({ status: 'signedIn', credentials: client.credentials, client, userInfo: auth.user_info, restoreError: null });
    } catch (error) {
      const offline = error instanceof XtreamError && (error.kind === 'network' || error.kind === 'timeout');
      if (offline) {
        // Sem rede no momento: entra com os dados salvos e as telas mostram o erro de conexão.
        set({ status: 'signedIn', credentials: client.credentials, client, userInfo: null, restoreError: null });
        return;
      }
      set({
        status: 'signedOut',
        credentials: client.credentials,
        restoreError: error instanceof Error ? error.message : 'Não foi possível entrar.',
      });
    }
  },

  signIn: async (input) => {
    const parsed = parseServerInput(input.url);
    const credentials: Credentials = {
      url: parsed.url,
      username: input.username.trim(),
      password: input.password,
    };
    const client = new XtreamClient(credentials);
    const auth = await client.authenticate();
    await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(client.credentials));
    set({ status: 'signedIn', credentials: client.credentials, client, userInfo: auth.user_info, restoreError: null });
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY).catch(() => undefined);
    set({ status: 'signedOut', credentials: null, client: null, userInfo: null, restoreError: null });
  },
}));

export function useAccountKey(): string {
  return useAuth((s) => accountKeyOf(s.credentials));
}

export function requireClient(): XtreamClient {
  const client = useAuth.getState().client;
  if (!client) throw new XtreamError('Sessão encerrada. Entre novamente.', 'auth');
  return client;
}
