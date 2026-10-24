import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ContentType } from '../api/types';
import type { PlayableItem } from '../player/types';

export type ZapSource = 'category' | 'favorites';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  EditPlaylist: undefined;
  Items: { type: ContentType; categoryId: string; categoryName: string };
  MovieDetail: { streamId: string; name: string; icon?: string | null; extension?: string; categoryId?: string | null };
  SeriesDetail: { seriesId: string; name: string; cover?: string | null; categoryId?: string | null };
  Player: { item: PlayableItem; startAt?: number; zapSource?: ZapSource };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
