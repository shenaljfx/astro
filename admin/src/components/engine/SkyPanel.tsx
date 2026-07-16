'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Panel, EmptyState } from '@/components/ui';
import { astroGet, slt, sltRange, copyText } from '@/lib/engine';
import { CloudOff, Sun, Moon, ShieldAlert } from 'lucide-react';

/** Every value here is computed by the engine — nothing is written by a model. */

interface Today {
  date?: string;
  panchanga?: any;
  planets?: Record<string, any>;
  yogas?: Array<{ name: string; sinhala?: string; planets?: string[]; strength?: string }>;
  nakath?: any;
}

function Stat({ label, value, sub, mono = true }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-3">{label}</dt>
      <dd className={`mt-0.5 truncate text-[13px] text-ink ${mono ? 'font-mono tabular-nums' : ''}`} title={value}>
        {value}
      </dd>
      {sub && <p className="truncate text-[10.5px] text-ink-3">{sub}</p>}
    </div>
  );
}

const CHOGHADIYA_TONE: Record<string, string> = {
  Amrit: 'text-ok', Shubh: 'text-ok', Labh: 'text-ok', Char: 'text-ink-2',
  Rog: 'text-danger', Kaal: 'text-danger', Udveg: 'text-warn',
};

export default function SkyPanel() {
  const [data, setData] = useState<Today | null>(null);
  const [chog, setChog] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    astroGet<Today>('/api/marketing/today').then(setData).catch((e) => setErr(e.message));
    astroGet('/api/enhanced/choghadiya').then((d) => setChog(d?.data || null)).catch(() => {});
  }, []);

  const p = data?.panchanga;

  const planetRows = useMemo(() => {
    if (!data?.planets) return [];
    const order = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'rahu', 'ketu'];
    return order
      .filter((k) => data.planets![k])
      .map((k) => {
        const pl = data.planets![k];
        return {
          key: k,
          name: pl.name || k,
          sign: pl.rashiEnglish || pl.rashi || '—',
          signSi: pl.rashiSinhala || '',
          deg: typeof pl.degreeInSign === 'number' ? pl.degreeInSign.toFixed(2) : '—',
          retro: !!(pl.isRetrograde ?? pl.retrograde),
        };
      });
  }, [data]);

  const copyBrief = () => {
    if (!p) return;
    const lines = [
      `GRAHACHARA — ${data?.date || ''} (Sri Lanka)`,
      `Nakshatra: ${p.nakshatra?.name || '—'}${p.nakshatra?.lord ? ` (lord ${p.nakshatra.lord})` : ''}`,
      `Tithi: ${p.tithi?.name || '—'} ${p.tithi?.paksha || ''}`,
      `Yoga: ${p.yoga?.name || '—'} · Karana: ${p.karana?.name || '—'}`,
      `Moon: ${p.moonSign?.english || '—'} · Sun: ${p.sunSign?.english || '—'} · Lagna now: ${p.lagna?.rashi?.english || '—'}`,
      `Sunrise ${slt(p.sunrise)} · Sunset ${slt(p.sunset)}`,
      `Rahu Kalam ${sltRange(p.rahuKalam?.start, p.rahuKalam?.end)}`,
      `Gulika ${sltRange(p.gulikaKalam?.start, p.gulikaKalam?.end)} · Yamaganda ${sltRange(p.yamaganda?.start, p.yamaganda?.end)}`,
      data?.yogas?.length ? `Yogas: ${data.yogas.map((y) => y.name).join(', ')}` : '',
    ].filter(Boolean);
    copyText(lines.join('\n'));
  };

  if (err) {
    return (
      <div className="rounded-xl border border-line bg-surface">
        <EmptyState icon={CloudOff} title="Engine offline" hint={err} />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="h-40 animate-pulse rounded-xl border border-line bg-surface" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Panchanga */}
      <Panel
        title="Panchanga — the five limbs"
        aside={
          <button
            onClick={copyBrief}
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-surface-2 px-2.5 text-[11px] font-medium text-ink-3 transition-colors hover:text-ink"
          >
            Copy today&apos;s brief
          </button>
        }
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Nakshatra" value={p?.nakshatra?.name || '—'} sub={p?.nakshatra?.lord ? `lord ${p.nakshatra.lord} · pada ${p.nakshatra.pada ?? '—'}` : undefined} mono={false} />
          <Stat label="Tithi" value={p?.tithi?.name || '—'} sub={p?.tithi?.pakshaName || p?.tithi?.paksha} mono={false} />
          <Stat label="Yoga" value={p?.yoga?.name || '—'} mono={false} />
          <Stat label="Karana" value={p?.karana?.name || '—'} mono={false} />
          <Stat label="Vaara" value={p?.vaara?.name || '—'} sub={p?.vaara?.ruler ? `ruled by ${p.vaara.ruler}` : undefined} mono={false} />
          <Stat label="Moon rashi" value={p?.moonSign?.english || '—'} sub={p?.moonSign?.sinhala} mono={false} />
          <Stat label="Sun rashi" value={p?.sunSign?.english || '—'} sub={p?.sunSign?.sinhala} mono={false} />
          <Stat label="Lagna now" value={p?.lagna?.rashi?.english || '—'} sub={p?.lagna?.rashi?.sinhala} mono={false} />
          <Stat label="Ayanamsha" value={typeof p?.ayanamsha === 'number' ? `${p.ayanamsha.toFixed(4)}°` : '—'} />
          <Stat label="Location" value={p?.location ? `${p.location.lat.toFixed(2)}, ${p.location.lng.toFixed(2)}` : '—'} sub="Colombo" />
        </dl>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sun & Moon */}
        <Panel title="Sun & Moon">
          <dl className="grid grid-cols-2 gap-4">
            <Stat label="Sunrise" value={slt(p?.sunrise)} />
            <Stat label="Sunset" value={slt(p?.sunset)} />
            <Stat label="Moonrise" value={slt(p?.moonrise)} />
            <Stat label="Moonset" value={slt(p?.moonset)} />
          </dl>
          <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-[11px] text-ink-3">
            <span className="flex items-center gap-1.5"><Sun size={12} className="text-gold" /> day {p?.sunrise && p?.sunset ? `${((new Date(p.sunset).getTime() - new Date(p.sunrise).getTime()) / 3600000).toFixed(1)}h` : '—'}</span>
            <span className="flex items-center gap-1.5"><Moon size={12} className="text-accent-ink" /> {p?.tithi?.pakshaName || p?.tithi?.paksha || '—'}</span>
          </div>
        </Panel>

        {/* Inauspicious windows */}
        <Panel title="Windows to avoid">
          <div className="space-y-2.5">
            {[
              ['Rahu Kalam', p?.rahuKalam, 'danger'],
              ['Gulika Kalam', p?.gulikaKalam, 'warn'],
              ['Yamaganda', p?.yamaganda, 'warn'],
            ].map(([label, win, tone]: any) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                <span className="flex items-center gap-2 text-[12.5px] text-ink-2">
                  <ShieldAlert size={13} className={tone === 'danger' ? 'text-danger' : 'text-warn'} />
                  {label}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-ink">{sltRange(win?.start, win?.end)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Planets */}
      <Panel title="Planetary positions" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-line text-left">
                {['Planet', 'Rashi', 'Degree in sign', ''].map((h) => (
                  <th key={h} className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-ink-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planetRows.map((r) => (
                <tr key={r.key} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                  <td className="px-4 py-2 text-[13px] font-medium text-ink">{r.name}</td>
                  <td className="px-4 py-2 text-[13px] text-ink-2">
                    {r.sign}
                    {r.signSi && <span className="ml-1.5 text-[11px] text-ink-3">{r.signSi}</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[12.5px] tabular-nums text-ink-2">{r.deg}°</td>
                  <td className="px-4 py-2 text-right">
                    {r.retro && (
                      <span className="rounded bg-[rgba(224,101,95,0.14)] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-danger">
                        ℞ RETRO
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Yogas today */}
        <Panel title={`Yogas active today${data.yogas?.length ? ` · ${data.yogas.length}` : ''}`}>
          {data.yogas?.length ? (
            <ul className="space-y-2">
              {data.yogas.map((y, k) => (
                <li key={k} className="flex items-start justify-between gap-3 rounded-lg border border-line px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">{y.name}</p>
                    {y.sinhala && <p className="truncate text-[11.5px] leading-relaxed text-ink-3">{y.sinhala}</p>}
                    {y.planets?.length && <p className="mt-0.5 font-mono text-[10px] text-ink-3">{y.planets.join(' + ')}</p>}
                  </div>
                  {y.strength && (
                    <span className="shrink-0 rounded bg-gold-dim px-1.5 py-0.5 text-[10px] font-medium text-gold">{y.strength}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-[12px] text-ink-3">No named yogas active today.</p>
          )}
        </Panel>

        {/* Choghadiya */}
        <Panel title="Choghadiya — day" pad={false}>
          {chog?.daytimeChoghadiyas?.length ? (
            <ul className="max-h-[260px] overflow-y-auto">
              {chog.daytimeChoghadiyas.map((c: any, k: number) => (
                <li key={k} className="flex items-center justify-between border-b border-line px-4 py-1.5 last:border-b-0">
                  <span className={`text-[12.5px] font-medium ${CHOGHADIYA_TONE[c.type] || 'text-ink-2'}`}>{c.type}</span>
                  <span className="font-mono text-[11.5px] tabular-nums text-ink-3">{c.start?.slice(0, 5)} – {c.end?.slice(0, 5)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-[12px] text-ink-3">Choghadiya unavailable.</p>
          )}
        </Panel>
      </div>

      {/* Horas */}
      {Array.isArray(p?.horas) && p.horas.length > 0 && (
        <Panel title="Planetary horas" aside={<span className="font-mono text-[10.5px] text-ink-3">{p.horas.length} hours</span>}>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
            {p.horas.map((h: any, k: number) => (
              <div key={k} className="rounded-lg border border-line px-2 py-1.5">
                <p className="truncate text-[11.5px] font-medium text-ink-2">{h.ruler}</p>
                <p className="font-mono text-[10px] tabular-nums text-ink-3">{slt(h.start)}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
