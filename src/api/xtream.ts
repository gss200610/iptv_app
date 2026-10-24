import type {
  AuthResponse,
  Category,
  ContentType,
  Credentials,
  Episode,
  SeriesInfo,
  ShortEpgResponse,
  StreamOf,
  VodInfo,
} from './types';

const REQUEST_TIMEOUT_MS = 20000;

export type LiveFormat = 'm3u8' | 'ts';

export class XtreamError extends Error {
  constructor(
    message: string,
    readonly kind: 'network' | 'timeout' | 'auth' | 'expired' | 'server' | 'parse',
  ) {
    super(message);
    this.name = 'XtreamError';
  }
}

const CATEGORY_ACTION: Record<ContentType, string> = {
  live: 'get_live_categories',
  movie: 'get_vod_categories',
  series: 'get_series_categories',
};

const STREAMS_ACTION: Record<ContentType, string> = {
  live: 'get_live_streams',
  movie: 'get_vod_streams',
  series: 'get_series',
};

export interface ParsedServerInput {
  url: string;
  username?: string;
  password?: string;
}

/**
 * Aceita o endereço do servidor em vários formatos ("host:porta", "http://host/",
 * "http://host/player_api.php" ou um link M3U "get.php?username=...&password=...")
 * e devolve a URL base sem barra no final, além das credenciais quando presentes.
 */
export function parseServerInput(raw: string): ParsedServerInput {
  let value = raw.trim();
  if (!value) return { url: '' };
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`;

  const queryIndex = value.indexOf('?');
  const path = queryIndex >= 0 ? value.slice(0, queryIndex) : value;
  const query = queryIndex >= 0 ? value.slice(queryIndex + 1) : '';

  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [k, v = ''] = pair.split('=');
    try {
      params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    } catch {
      params[k] = v;
    }
  }

  const base = path
    .replace(/\/(player_api|get|xmltv|panel_api)\.php$/i, '')
    .replace(/\/+$/, '');

  return { url: base, username: params.username, password: params.password };
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export class XtreamClient {
  readonly credentials: Credentials;

  constructor(credentials: Credentials) {
    this.credentials = { ...credentials, url: parseServerInput(credentials.url).url };
  }

  private async request<T>(params: Record<string, string | number | undefined>): Promise<T> {
    const { url, username, password } = this.credentials;
    const query = buildQuery({ username, password, ...params });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${url}/player_api.php?${query}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    } catch {
      if (controller.signal.aborted) {
        throw new XtreamError('O servidor demorou demais para responder.', 'timeout');
      }
      throw new XtreamError('Não foi possível conectar ao servidor. Verifique a URL e a internet.', 'network');
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401 || response.status === 403) {
      throw new XtreamError('Usuário ou senha inválidos.', 'auth');
    }
    if (!response.ok) {
      throw new XtreamError(`O servidor respondeu com erro ${response.status}.`, 'server');
    }

    const text = await response.text();
    if (!text.trim()) {
      throw new XtreamError('O servidor retornou uma resposta vazia.', 'parse');
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new XtreamError('Resposta inválida do servidor. Confirme se a URL é de um painel Xtream.', 'parse');
    }
  }

  async authenticate(): Promise<AuthResponse> {
    const data = await this.request<AuthResponse | Record<string, unknown>>({});
    const auth = data as AuthResponse;
    if (!auth?.user_info || Number(auth.user_info.auth) !== 1) {
      throw new XtreamError('Usuário ou senha inválidos.', 'auth');
    }
    const status = String(auth.user_info.status ?? '').toLowerCase();
    if (status && status !== 'active') {
      const expired = status === 'expired';
      throw new XtreamError(
        expired ? 'A assinatura desta conta expirou.' : `Conta indisponível (status: ${auth.user_info.status}).`,
        expired ? 'expired' : 'auth',
      );
    }
    return auth;
  }

  async getCategories(type: ContentType): Promise<Category[]> {
    const data = await this.request<unknown>({ action: CATEGORY_ACTION[type] });
    return asArray<Category>(data).map((c) => ({ ...c, category_id: String(c.category_id) }));
  }

  async getStreams<T extends ContentType>(type: T, categoryId?: string): Promise<StreamOf<T>[]> {
    const data = await this.request<unknown>({ action: STREAMS_ACTION[type], category_id: categoryId });
    return asArray<StreamOf<T>>(data);
  }

  getVodInfo(vodId: string | number): Promise<VodInfo> {
    return this.request<VodInfo>({ action: 'get_vod_info', vod_id: vodId });
  }

  async getSeriesInfo(seriesId: string | number): Promise<SeriesInfo> {
    const data = await this.request<SeriesInfo>({ action: 'get_series_info', series_id: seriesId });
    return {
      seasons: asArray(data?.seasons),
      info: data?.info && !Array.isArray(data.info) ? data.info : {},
      episodes: data?.episodes ?? {},
    };
  }

  getShortEpg(streamId: string | number, limit = 2): Promise<ShortEpgResponse> {
    return this.request<ShortEpgResponse>({ action: 'get_short_epg', stream_id: streamId, limit });
  }

  private pathCredentials(): string {
    const { username, password } = this.credentials;
    return `${encodeURIComponent(username)}/${encodeURIComponent(password)}`;
  }

  liveUrl(streamId: string | number, format: LiveFormat): string {
    return `${this.credentials.url}/live/${this.pathCredentials()}/${streamId}.${format}`;
  }

  movieUrl(streamId: string | number, extension: string): string {
    return `${this.credentials.url}/movie/${this.pathCredentials()}/${streamId}.${extension || 'mp4'}`;
  }

  episodeUrl(episodeId: string | number, extension: string): string {
    return `${this.credentials.url}/series/${this.pathCredentials()}/${episodeId}.${extension || 'mp4'}`;
  }
}

/** Episódios de todas as temporadas em ordem (temporada e número do episódio). */
export function flattenEpisodes(info: SeriesInfo): Episode[] {
  const groups = Array.isArray(info.episodes) ? info.episodes : Object.values(info.episodes);
  return groups
    .flat()
    .filter(Boolean)
    .sort((a, b) => Number(a.season) - Number(b.season) || Number(a.episode_num) - Number(b.episode_num));
}

/** Converte o texto base64 (UTF-8) usado pelo EPG do Xtream em string legível. */
export function decodeBase64Utf8(value: string | null | undefined): string {
  if (!value) return '';
  try {
    const binary = globalThis.atob(value);
    let out = '';
    for (let i = 0; i < binary.length; ) {
      const c = binary.charCodeAt(i++);
      if (c < 0x80) {
        out += String.fromCharCode(c);
      } else if (c < 0xe0) {
        out += String.fromCharCode(((c & 0x1f) << 6) | (binary.charCodeAt(i++) & 0x3f));
      } else if (c < 0xf0) {
        out += String.fromCharCode(
          ((c & 0x0f) << 12) | ((binary.charCodeAt(i++) & 0x3f) << 6) | (binary.charCodeAt(i++) & 0x3f),
        );
      } else {
        const cp =
          ((c & 0x07) << 18) |
          ((binary.charCodeAt(i++) & 0x3f) << 12) |
          ((binary.charCodeAt(i++) & 0x3f) << 6) |
          (binary.charCodeAt(i++) & 0x3f);
        out += String.fromCodePoint(cp);
      }
    }
    return out;
  } catch {
    return value;
  }
}
