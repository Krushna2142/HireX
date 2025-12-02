export function formatRelativeSafe(iso?: string) {
  if (!iso) return '';
  let d: Date;
  try {
    d = new Date(iso);
    if (isNaN(d.getTime())) return '';
  } catch {
    return '';
  }

  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const wk = Math.floor(day / 7);
  const mo = Math.floor(day / 30);
  const yr = Math.floor(day / 365);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (Math.abs(sec) < 60) return rtf.format(-sec, 'second');
  if (Math.abs(min) < 60) return rtf.format(-min, 'minute');
  if (Math.abs(hr) < 24) return rtf.format(-hr, 'hour');
  if (Math.abs(day) < 7) return rtf.format(-day, 'day');
  if (Math.abs(wk) < 5) return rtf.format(-wk, 'week');
  if (Math.abs(mo) < 12) return rtf.format(-mo, 'month');
  return rtf.format(-yr, 'year');
}