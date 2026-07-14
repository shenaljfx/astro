import { getToken } from './firebase';

// Same-origin: nginx maps admin.grahachara.com/api/* → server /admin/*
const BASE = '/api';

export async function api(path, { method = 'GET', body } = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const fmtLKR = (n) => (n == null ? '—' : `LKR ${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
export const fmtUSD = (n) => (n == null ? '—' : `$${Number(n).toFixed(2)}`);
export const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'));
export const ago = (iso) => {
  if (!iso) return '—';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};
