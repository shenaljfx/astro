/**
 * Engine client for the studio dashboard — every call is a DETERMINISTIC
 * calculation from the astrology engine (no AI anywhere on this surface).
 * Everything is proxied through /api/astro so the browser never touches the
 * API host directly.
 */

const TZ = 'Asia/Colombo';

export async function astroGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`/api/astro${path}`, { cache: 'no-store' });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `${path} failed (${res.status})`);
  return body;
}

export async function astroPost<T = any>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`/api/astro${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `${path} failed (${res.status})`);
  return body;
}

/** Engine times are ISO/UTC — every display must be Sri Lanka time. */
export function slt(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ });
}

export function sltRange(a?: string | null, b?: string | null): string {
  if (!a || !b) return '—';
  return `${slt(a)} – ${slt(b)}`;
}

export function sltDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
}

export const RASHI_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export const RASHI_SI: Record<string, string> = {
  Aries: 'මේෂ', Taurus: 'වෘෂභ', Gemini: 'මිථුන', Cancer: 'කටක',
  Leo: 'සිංහ', Virgo: 'කන්‍යා', Libra: 'තුලා', Scorpio: 'වෘශ්චික',
  Sagittarius: 'ධනු', Capricorn: 'මකර', Aquarius: 'කුම්භ', Pisces: 'මීන',
};

/** Short planet labels for chart cells. */
export const PLANET_ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mercury: 'Me', Venus: 'Ve', Mars: 'Ma',
  Jupiter: 'Ju', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
  Uranus: 'Ur', Neptune: 'Ne', Pluto: 'Pl', Lagna: 'Asc',
};

export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text).catch(() => {});
}
