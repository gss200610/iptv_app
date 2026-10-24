import type { Episode } from '../api/types';
import type { PlayableItem } from './types';

interface SeriesRef {
  seriesId: string;
  seriesName: string;
  cover?: string | null;
  categoryId?: string | null;
}

export function episodeThumb(episode: Episode): string | undefined {
  return episode.info && !Array.isArray(episode.info) ? episode.info.movie_image : undefined;
}

export function episodeToPlayable(episode: Episode, series: SeriesRef): PlayableItem {
  return {
    kind: 'episode',
    id: String(episode.id),
    name: episode.title || `Episódio ${episode.episode_num}`,
    icon: series.cover || episodeThumb(episode),
    extension: episode.container_extension,
    seriesId: series.seriesId,
    seriesName: series.seriesName,
    season: Number(episode.season),
    episodeNum: Number(episode.episode_num),
    categoryId: series.categoryId,
  };
}

export function nextEpisodeOf(episodes: Episode[], currentId: string): Episode | undefined {
  const index = episodes.findIndex((e) => String(e.id) === currentId);
  return index >= 0 ? episodes[index + 1] : undefined;
}
