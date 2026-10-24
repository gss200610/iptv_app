import { useVodInfo } from '../api/queries';
import type { VodInfo } from '../api/types';
import { AppButton } from '../components/AppButton';
import { DetailLayout } from '../components/DetailLayout';
import { LoadingState } from '../components/ScreenState';
import type { ScreenProps } from '../navigation/types';
import { progressKeyOf, type PlayableItem } from '../player/types';
import { useIsFavorite, useToggleFavorite } from '../store/favorites';
import { resumePositionOf, useProgressEntry } from '../store/progress';
import { formatTime, hasValue } from '../utils/format';

type VodDetails = Exclude<VodInfo['info'], unknown[]>;

export function MovieDetailScreen({ route, navigation }: ScreenProps<'MovieDetail'>) {
  const { streamId, name, icon, extension, categoryId } = route.params;
  const { data, isLoading } = useVodInfo(streamId);
  const progress = useProgressEntry(progressKeyOf({ kind: 'movie', id: streamId }));
  const resumeAt = resumePositionOf(progress);
  const favorite = useIsFavorite('movie', streamId);
  const toggleFavorite = useToggleFavorite();

  const info: VodDetails = data?.info && !Array.isArray(data.info) ? data.info : {};
  const ext = data?.movie_data?.container_extension || extension || 'mp4';
  const poster = info.movie_image || info.cover_big || icon;

  const item: PlayableItem = { kind: 'movie', id: streamId, name, icon: poster, extension: ext, categoryId };
  const play = (startAt: number) => navigation.navigate('Player', { item, startAt });

  if (isLoading && !data) return <LoadingState />;

  const year = info.releasedate?.slice(0, 4);
  const meta = [
    hasValue(year) ? year : undefined,
    hasValue(info.genre) ? info.genre : undefined,
    hasValue(info.duration) ? info.duration : undefined,
    hasValue(info.rating) ? `★ ${info.rating}` : undefined,
  ].filter((v): v is string => !!v);

  return (
    <DetailLayout
      title={name}
      poster={poster}
      backdrop={info.backdrop_path?.[0]}
      meta={meta}
      plot={info.plot || info.description}
      actions={
        <>
          {resumeAt != null ? (
            <>
              <AppButton label={`Continuar de ${formatTime(resumeAt)}`} icon="▶" onPress={() => play(resumeAt)} hasTVPreferredFocus />
              <AppButton label="Começar do início" variant="secondary" onPress={() => play(0)} />
            </>
          ) : (
            <AppButton label="Assistir" icon="▶" onPress={() => play(0)} hasTVPreferredFocus />
          )}
          <AppButton
            label={favorite ? 'Favorito' : 'Favoritar'}
            icon={favorite ? '★' : '☆'}
            variant="secondary"
            onPress={() => toggleFavorite({ type: 'movie', id: streamId, name, icon: poster, categoryId, extension: ext })}
          />
        </>
      }
    />
  );
}
