// Teste de fumaça do cliente Xtream contra um servidor falso local.
// Uso: node --experimental-transform-types scripts/smoke-xtream.ts
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { XtreamClient, XtreamError, decodeBase64Utf8, flattenEpisodes, parseServerInput } from '../src/api/xtream.ts';

const USER = 'joão';
const PASS = 's3nh@';

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const send = (body: unknown) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (url.pathname !== '/player_api.php') {
    res.writeHead(404).end();
    return;
  }
  const ok = url.searchParams.get('username') === USER && url.searchParams.get('password') === PASS;
  const action = url.searchParams.get('action');
  if (!action) {
    send({ user_info: { auth: ok ? 1 : 0, status: 'Active', exp_date: '1893456000', username: USER } });
    return;
  }
  if (!ok) return send({ user_info: { auth: 0 } });
  switch (action) {
    case 'get_live_categories':
      return send([{ category_id: 1, category_name: 'Notícias' }]);
    case 'get_live_streams':
      return send(
        url.searchParams.get('category_id') === '1'
          ? [{ num: 1, name: 'Canal 1', stream_id: 10, stream_icon: '', category_id: '1' }]
          : [],
      );
    case 'get_series_info':
      return send({
        seasons: [],
        info: { name: 'Série' },
        episodes: {
          '2': [{ id: '22', episode_num: 1, season: 2, title: 'S2E1', container_extension: 'mkv' }],
          '1': [
            { id: '12', episode_num: 2, season: 1, title: 'S1E2', container_extension: 'mp4' },
            { id: '11', episode_num: 1, season: 1, title: 'S1E1', container_extension: 'mp4' },
          ],
        },
      });
    case 'get_vod_categories':
      res.writeHead(200).end('<html>not json</html>');
      return;
    default:
      return send([]);
  }
});

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = (server.address() as AddressInfo).port;
const base = `http://127.0.0.1:${port}`;

try {
  assert.deepEqual(parseServerInput('servidor.com:8080/'), { url: 'http://servidor.com:8080', username: undefined, password: undefined });
  assert.deepEqual(parseServerInput(`${base}/get.php?username=a%20b&password=c&type=m3u_plus`), {
    url: base,
    username: 'a b',
    password: 'c',
  });
  assert.equal(parseServerInput(`${base}/player_api.php`).url, base);

  const client = new XtreamClient({ url: `${base}/`, username: USER, password: PASS });
  const auth = await client.authenticate();
  assert.equal(auth.user_info.username, USER);

  const categories = await client.getCategories('live');
  assert.equal(categories[0]?.category_id, '1');
  const streams = await client.getStreams('live', '1');
  assert.equal(streams.length, 1);

  const info = await client.getSeriesInfo('5');
  assert.deepEqual(
    flattenEpisodes(info).map((e) => e.id),
    ['11', '12', '22'],
  );

  assert.equal(client.liveUrl(10, 'm3u8'), `${base}/live/jo%C3%A3o/s3nh%40/10.m3u8`);
  assert.equal(client.movieUrl(7, 'mkv'), `${base}/movie/jo%C3%A3o/s3nh%40/7.mkv`);
  assert.equal(client.episodeUrl('22', ''), `${base}/series/jo%C3%A3o/s3nh%40/22.mp4`);

  await assert.rejects(client.getCategories('movie'), (e) => e instanceof XtreamError && e.kind === 'parse');
  await assert.rejects(
    new XtreamClient({ url: base, username: USER, password: 'errada' }).authenticate(),
    (e) => e instanceof XtreamError && e.kind === 'auth',
  );
  await assert.rejects(
    new XtreamClient({ url: 'http://127.0.0.1:1', username: 'a', password: 'b' }).authenticate(),
    (e) => e instanceof XtreamError && e.kind === 'network',
  );

  assert.equal(decodeBase64Utf8(Buffer.from('Jornal da Manhã – ação', 'utf8').toString('base64')), 'Jornal da Manhã – ação');

  console.log('smoke-xtream: todos os testes passaram');
} finally {
  server.close();
}
