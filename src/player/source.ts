import type { VideoSource } from 'expo-video';

import type { LiveFormat, XtreamClient } from '../api/xtream';
import type { PlayableItem } from './types';

export function buildVideoSource(
  client: XtreamClient,
  item: PlayableItem,
  liveFormat: LiveFormat,
  userAgent?: string,
): VideoSource {
  const headers = userAgent ? { 'User-Agent': userAgent } : undefined;
  switch (item.kind) {
    case 'live':
      return {
        uri: client.liveUrl(item.id, liveFormat),
        contentType: liveFormat === 'm3u8' ? 'hls' : 'progressive',
        headers,
      };
    case 'movie':
      return {
        uri: client.movieUrl(item.id, item.extension ?? 'mp4'),
        contentType: item.extension === 'm3u8' ? 'hls' : 'auto',
        headers,
      };
    case 'episode':
      return {
        uri: client.episodeUrl(item.id, item.extension ?? 'mp4'),
        contentType: item.extension === 'm3u8' ? 'hls' : 'auto',
        headers,
      };
  }
}
