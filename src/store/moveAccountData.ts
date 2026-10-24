import { useFavoritesStore } from './favorites';
import { useProgressStore } from './progress';

function moveKey<T>(map: Record<string, Record<string, T>>, from: string, to: string) {
  if (!map[from]) return map;
  const next = { ...map, [to]: { ...map[from], ...map[to] } };
  delete next[from];
  return next;
}

/** Leva favoritos, progresso e último canal para a nova chave da conta (ex.: provedor mudou o endereço). */
export function moveAccountData(from: string, to: string) {
  if (!from || !to || from === to) return;

  useFavoritesStore.setState((s) => ({ byAccount: moveKey(s.byAccount, from, to) }));

  useProgressStore.setState((s) => {
    const lastChannel = { ...s.lastChannel };
    if (lastChannel[from] && !lastChannel[to]) lastChannel[to] = lastChannel[from];
    delete lastChannel[from];
    return { byAccount: moveKey(s.byAccount, from, to), lastChannel };
  });
}
