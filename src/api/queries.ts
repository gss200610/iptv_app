import { QueryClient, useQuery } from '@tanstack/react-query';

import { requireClient, useAccountKey } from '../store/auth';
import type { ContentType, StreamOf } from './types';
import { XtreamError } from './xtream';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: (failureCount, error) =>
        failureCount < 2 && !(error instanceof XtreamError && (error.kind === 'auth' || error.kind === 'expired')),
    },
  },
});

export const queryKeys = {
  categories: (account: string, type: ContentType) => ['categories', account, type] as const,
  streams: (account: string, type: ContentType, categoryId: string) => ['streams', account, type, categoryId] as const,
  allStreams: (account: string, type: ContentType) => ['allStreams', account, type] as const,
  vodInfo: (account: string, id: string) => ['vodInfo', account, id] as const,
  seriesInfo: (account: string, id: string) => ['seriesInfo', account, id] as const,
  shortEpg: (account: string, id: string) => ['shortEpg', account, id] as const,
};

export function useCategories(type: ContentType) {
  const account = useAccountKey();
  return useQuery({
    queryKey: queryKeys.categories(account, type),
    queryFn: () => requireClient().getCategories(type),
    enabled: !!account,
  });
}

export function useStreams<T extends ContentType>(type: T, categoryId: string | null | undefined, enabled = true) {
  const account = useAccountKey();
  return useQuery({
    queryKey: queryKeys.streams(account, type, categoryId ?? ''),
    queryFn: () => requireClient().getStreams(type, categoryId!) as Promise<StreamOf<T>[]>,
    // Sem categoria o servidor devolveria a lista inteira; para isso existe useAllStreams.
    enabled: enabled && !!account && !!categoryId,
  });
}

/** Catálogo completo do tipo (pode ter dezenas de milhares de itens): só carregar sob demanda, para a busca. */
export function useAllStreams<T extends ContentType>(type: T, enabled: boolean) {
  const account = useAccountKey();
  return useQuery({
    queryKey: queryKeys.allStreams(account, type),
    queryFn: () => requireClient().getStreams(type) as Promise<StreamOf<T>[]>,
    enabled: enabled && !!account,
    staleTime: 30 * 60 * 1000,
  });
}

export function useVodInfo(vodId: string) {
  const account = useAccountKey();
  return useQuery({
    queryKey: queryKeys.vodInfo(account, vodId),
    queryFn: () => requireClient().getVodInfo(vodId),
    enabled: !!account && !!vodId,
  });
}

export function useSeriesInfo(seriesId: string | undefined) {
  const account = useAccountKey();
  return useQuery({
    queryKey: queryKeys.seriesInfo(account, seriesId ?? ''),
    queryFn: () => requireClient().getSeriesInfo(seriesId!),
    enabled: !!account && !!seriesId,
  });
}

export function useShortEpg(streamId: string | undefined, enabled: boolean) {
  const account = useAccountKey();
  return useQuery({
    queryKey: queryKeys.shortEpg(account, streamId ?? ''),
    queryFn: () => requireClient().getShortEpg(streamId!, 2),
    enabled: enabled && !!account && !!streamId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Ocorreu um erro inesperado.';
}
