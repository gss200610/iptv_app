export type ContentType = 'live' | 'movie' | 'series';

export interface Credentials {
  url: string;
  username: string;
  password: string;
}

export interface UserInfo {
  username: string;
  password: string;
  message?: string;
  auth: number;
  status: string;
  exp_date: string | null;
  is_trial: string;
  active_cons: string | number;
  created_at?: string;
  max_connections: string | number;
  allowed_output_formats?: string[];
}

export interface ServerInfo {
  url: string;
  port: string;
  https_port?: string;
  server_protocol: string;
  timezone?: string;
  timestamp_now?: number;
  time_now?: string;
}

export interface AuthResponse {
  user_info: UserInfo;
  server_info?: ServerInfo;
}

export interface Category {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface LiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number | string;
  stream_icon: string | null;
  epg_channel_id: string | null;
  category_id: string | null;
  tv_archive?: number;
}

export interface VodStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number | string;
  stream_icon: string | null;
  rating?: string | number | null;
  category_id: string | null;
  container_extension: string;
  added?: string;
}

export interface SeriesItem {
  num: number;
  name: string;
  series_id: number | string;
  cover: string | null;
  plot?: string | null;
  cast?: string | null;
  director?: string | null;
  genre?: string | null;
  releaseDate?: string | null;
  rating?: string | number | null;
  category_id: string | null;
  backdrop_path?: string[] | null;
}

export type StreamOf<T extends ContentType> = T extends 'live'
  ? LiveStream
  : T extends 'movie'
    ? VodStream
    : SeriesItem;

export interface VodInfo {
  info: {
    name?: string;
    movie_image?: string;
    cover_big?: string;
    backdrop_path?: string[];
    plot?: string;
    description?: string;
    genre?: string;
    director?: string;
    cast?: string;
    actors?: string;
    releasedate?: string;
    duration?: string;
    duration_secs?: number;
    rating?: string | number;
  } | [];
  movie_data: {
    stream_id: number | string;
    name: string;
    container_extension: string;
    category_id?: string;
  };
}

export interface Episode {
  id: string;
  episode_num: number | string;
  title: string;
  container_extension: string;
  season: number | string;
  info?: {
    movie_image?: string;
    plot?: string;
    duration_secs?: number;
    duration?: string;
    releasedate?: string;
    rating?: string | number;
  } | [];
}

export interface Season {
  season_number: number | string;
  name?: string;
  cover?: string;
  episode_count?: number | string;
}

export interface SeriesInfo {
  seasons: Season[];
  info: {
    name?: string;
    cover?: string;
    plot?: string;
    genre?: string;
    cast?: string;
    director?: string;
    releaseDate?: string;
    rating?: string | number;
    backdrop_path?: string[];
  };
  episodes: Record<string, Episode[]> | Episode[][];
}

export interface EpgListing {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  start_timestamp?: string | number;
  stop_timestamp?: string | number;
}

export interface ShortEpgResponse {
  epg_listings: EpgListing[];
}
