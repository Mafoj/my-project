/** Display formatting. Ported from the original; de-DE currency retained. */
const EUR = new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR',
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});

export const fmtEur = (v: number): string => EUR.format(Number.isFinite(v) ? v : 0);
export const fmtPct = (v: number): string => `${Math.round(v)}%`;
export const fmtDate = (v: string | null): string => v ?? '—';
