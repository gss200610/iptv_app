import { useMemo, useState } from 'react';
import { StyleSheet, TVFocusGuideView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage, useStreams } from '../api/queries';
import type { LiveStream, SeriesItem, VodStream } from '../api/types';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchBox } from '../components/SearchBox';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { ChannelList, VodGrid } from '../components/StreamLists';
import type { ScreenProps } from '../navigation/types';
import { colors } from '../theme';
import { filterByName } from '../utils/format';

export function ItemsScreen({ route }: ScreenProps<'Items'>) {
  const { type, categoryId, categoryName } = route.params;
  const [query, setQuery] = useState('');
  const { data, isLoading, error, refetch } = useStreams(type, categoryId);
  const filtered = useMemo(() => filterByName((data ?? []) as { name: string }[], query), [data, query]);

  let body: React.ReactNode;
  if (isLoading) body = <LoadingState />;
  else if (error) body = <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  else if (type === 'live')
    body = (
      <ChannelList
        channels={filtered as LiveStream[]}
        emptyMessage={query ? 'Nenhum canal encontrado.' : 'Nenhum canal nesta categoria.'}
      />
    );
  else
    body = (
      <VodGrid
        type={type}
        items={filtered as (VodStream | SeriesItem)[]}
        emptyMessage={query ? 'Nenhum título encontrado.' : 'Nenhum título nesta categoria.'}
      />
    );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title={categoryName} subtitle={data ? `${data.length} itens` : undefined} />
      <TVFocusGuideView autoFocus style={styles.flex}>
        <SearchBox value={query} onChangeText={setQuery} placeholder={`Buscar em ${categoryName}`} />
        {body}
      </TVFocusGuideView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
});
