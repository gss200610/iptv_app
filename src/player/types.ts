export type PlayableKind = 'live' | 'movie' | 'episode';

export interface PlayableItem {
  kind: PlayableKind;
  /** stream_id do canal ou filme, ou id do episódio. */
  id: string;
  name: string;
  icon?: string | null;
  /** Extensão do arquivo (mp4, mkv...) para filmes e episódios. */
  extension?: string;
  categoryId?: string | null;
  seriesId?: string;
  seriesName?: string;
  season?: number;
  episodeNum?: number;
}

export function progressKeyOf(item: Pick<PlayableItem, 'kind' | 'id'>): string {
  return `${item.kind}:${item.id}`;
}

export function episodeLabel(item: Pick<PlayableItem, 'season' | 'episodeNum'>): string {
  if (item.season == null || item.episodeNum == null) return '';
  return `T${item.season} E${item.episodeNum}`;
}
