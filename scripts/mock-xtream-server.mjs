// Servidor Xtream falso para testar o app sem um provedor real.
// Uso: node scripts/mock-xtream-server.mjs   (porta 8080, usuário "teste", senha "1234")
// No emulador: adb reverse tcp:8080 tcp:8080 e entre com a URL http://127.0.0.1:8080
import { Buffer } from 'node:buffer';
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 8080);
const USER = 'teste';
const PASS = '1234';

const poster = (seed) => `https://picsum.photos/seed/${seed}/300/450`;
const logo = (seed) => `https://picsum.photos/seed/${seed}/200/120`;

const UPSTREAM = {
  liveAkamai: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
  bbbHls: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  tosMulti: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  tosMux: 'https://test-streams.mux.dev/tos_ismc/main.m3u8',
  bbb10: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
  jelly10: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
  sintel10: 'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4',
};

const liveCategories = [
  { category_id: '1', category_name: 'Notícias', parent_id: 0 },
  { category_id: '2', category_name: 'Esportes', parent_id: 0 },
];
const live = [
  { num: 1, name: 'Canal Ao Vivo (Akamai)', stream_type: 'live', stream_id: 101, stream_icon: logo('c101'), epg_channel_id: 'c101', category_id: '1' },
  { num: 2, name: 'Canal Big Buck Bunny', stream_type: 'live', stream_id: 102, stream_icon: logo('c102'), epg_channel_id: 'c102', category_id: '1' },
  { num: 3, name: 'Canal Fora do Ar', stream_type: 'live', stream_id: 103, stream_icon: '', epg_channel_id: null, category_id: '1' },
  { num: 4, name: 'Esporte Teste', stream_type: 'live', stream_id: 201, stream_icon: logo('c201'), epg_channel_id: 'c201', category_id: '2' },
];
const liveUrl = { 101: UPSTREAM.liveAkamai, 102: UPSTREAM.bbbHls, 201: UPSTREAM.liveAkamai };

const vodCategories = [{ category_id: '10', category_name: 'Filmes de Teste', parent_id: 0 }];
const vod = [
  { num: 1, name: 'Big Buck Bunny', stream_type: 'movie', stream_id: 301, stream_icon: poster('bbb'), rating: '7.5', category_id: '10', container_extension: 'm3u8' },
  { num: 2, name: 'Tears of Steel (multiáudio)', stream_type: 'movie', stream_id: 302, stream_icon: poster('tos'), rating: '6.8', category_id: '10', container_extension: 'm3u8' },
  { num: 3, name: 'Tears of Steel (legendas)', stream_type: 'movie', stream_id: 303, stream_icon: poster('tos2'), rating: '6.8', category_id: '10', container_extension: 'm3u8' },
  { num: 4, name: 'Água-viva (MP4 curto)', stream_type: 'movie', stream_id: 304, stream_icon: poster('jelly'), rating: '5.0', category_id: '10', container_extension: 'mp4' },
];
const vodUrl = { 301: UPSTREAM.bbbHls, 302: UPSTREAM.tosMulti, 303: UPSTREAM.tosMux, 304: UPSTREAM.jelly10 };

const seriesCategories = [{ category_id: '20', category_name: 'Séries de Teste', parent_id: 0 }];
const series = [
  { num: 1, name: 'Série Curta', series_id: 401, cover: poster('serie'), plot: 'Episódios de 10 segundos para testar o próximo episódio automático.', genre: 'Teste', releaseDate: '2024-01-01', rating: '8', category_id: '20' },
];
const episodes = {
  1: [
    { id: '501', episode_num: 1, title: 'Coelho', container_extension: 'mp4', season: 1, info: { duration: '00:00:10' } },
    { id: '502', episode_num: 2, title: 'Água-viva', container_extension: 'mp4', season: 1, info: { duration: '00:00:10' } },
    { id: '503', episode_num: 3, title: 'Sintel', container_extension: 'mp4', season: 1, info: { duration: '00:00:10' } },
  ],
  2: [{ id: '601', episode_num: 1, title: 'Longo (HLS)', container_extension: 'm3u8', season: 2, info: { duration: '00:10:34' } }],
};
const episodeUrl = { 501: UPSTREAM.bbb10, 502: UPSTREAM.jelly10, 503: UPSTREAM.sintel10, 601: UPSTREAM.bbbHls };

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const fmt = (d) => d.toISOString().replace('T', ' ').slice(0, 19);
function shortEpg(streamId) {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const next = new Date(now.getTime() + 3600_000);
  const end = new Date(next.getTime() + 3600_000);
  return {
    epg_listings: [
      { id: '1', title: b64(`Jornal da Manhã – edição ${streamId}`), description: b64('Notícias'), start: fmt(now), end: fmt(next) },
      { id: '2', title: b64('Programa de Variedades'), description: b64('Variedades'), start: fmt(next), end: fmt(end) },
    ],
  };
}

function apiResponse(params) {
  const action = params.get('action');
  const category = params.get('category_id');
  const byCat = (list) => (category ? list.filter((i) => i.category_id === category) : list);
  switch (action) {
    case null:
      return {
        user_info: {
          username: USER, password: PASS, auth: 1, status: 'Active', exp_date: String(Math.floor(Date.now() / 1000) + 90 * 86400),
          is_trial: '0', active_cons: '0', max_connections: '2',
        },
        server_info: { url: '127.0.0.1', port: String(PORT), server_protocol: 'http' },
      };
    case 'get_live_categories': return liveCategories;
    case 'get_vod_categories': return vodCategories;
    case 'get_series_categories': return seriesCategories;
    case 'get_live_streams': return byCat(live);
    case 'get_vod_streams': return byCat(vod);
    case 'get_series': return byCat(series);
    case 'get_vod_info': {
      const v = vod.find((i) => String(i.stream_id) === params.get('vod_id'));
      if (!v) return { info: [], movie_data: {} };
      return {
        info: { name: v.name, movie_image: v.stream_icon, plot: `Sinopse de teste de ${v.name}.`, genre: 'Animação', releasedate: '2008-05-20', duration: '00:10:34', rating: v.rating },
        movie_data: { stream_id: v.stream_id, name: v.name, container_extension: v.container_extension, category_id: v.category_id },
      };
    }
    case 'get_series_info': {
      const s = series.find((i) => String(i.series_id) === params.get('series_id'));
      if (!s) return { seasons: [], info: [], episodes: [] };
      return { seasons: [], info: { name: s.name, cover: s.cover, plot: s.plot, genre: s.genre, releaseDate: s.releaseDate, rating: s.rating }, episodes };
    }
    case 'get_short_epg': return shortEpg(params.get('stream_id'));
    default: return [];
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  console.log(new Date().toISOString().slice(11, 19), req.method, url.pathname, url.searchParams.get('action') ?? '');

  if (url.pathname === '/player_api.php') {
    const ok = url.searchParams.get('username') === USER && url.searchParams.get('password') === PASS;
    const body = ok ? apiResponse(url.searchParams) : { user_info: { auth: 0 } };
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
    return;
  }

  const m = url.pathname.match(/^\/(live|movie|series)\/([^/]+)\/([^/]+)\/(\d+)\.(\w+)$/);
  if (m) {
    const [, kind, user, pass, id, ext] = m;
    if (decodeURIComponent(user) !== USER || decodeURIComponent(pass) !== PASS) {
      res.writeHead(403).end();
      return;
    }
    const table = kind === 'live' ? liveUrl : kind === 'movie' ? vodUrl : episodeUrl;
    let target = table[id];
    // Canais de teste só existem em HLS; o pedido .ts devolve 404 para exercitar a troca automática de formato.
    if (kind === 'live' && ext !== 'm3u8') target = undefined;
    if (!target) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(302, { Location: target });
    res.end();
    return;
  }

  res.writeHead(404).end();
});

server.listen(PORT, '0.0.0.0', () => console.log(`Mock Xtream em http://127.0.0.1:${PORT} (usuário ${USER}, senha ${PASS})`));
