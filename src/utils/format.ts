export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00';
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** exp_date do Xtream vem como timestamp Unix em segundos (string) ou null para contas sem vencimento. */
export function formatExpiry(expDate: string | null | undefined): string {
  if (!expDate || expDate === '0') return 'Sem vencimento';
  const date = new Date(Number(expDate) * 1000);
  if (Number.isNaN(date.getTime())) return 'Desconhecido';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Descarta metadados vazios ou zerados que muitos painéis enviam ("0", "00:00:00", "0.0"). */
export function hasValue(value: string | number | null | undefined): value is string | number {
  if (value == null) return false;
  const text = String(value).trim();
  return text !== '' && !/^[0:.,\s]+$/.test(text);
}

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterByName<T extends { name?: string; category_name?: string }>(items: T[], query: string): T[] {
  const q = normalizeSearch(query);
  if (!q) return items;
  return items.filter((item) => normalizeSearch(item.name ?? item.category_name ?? '').includes(q));
}
