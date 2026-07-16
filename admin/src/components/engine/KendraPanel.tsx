'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Panel, Field, Btn, Chip, inputCls, EmptyState } from '@/components/ui';
import KendaraChart, { KendaraCell } from '@/components/engine/KendaraChart';
import { astroGet, astroPost, sltDate, copyText, RASHI_ORDER } from '@/lib/engine';
import { Compass, MapPin, Sparkles, Copy, Check } from 'lucide-react';

/**
 * Kendra builder — a real birth chart from the engine. Deterministic: the same
 * birth data always yields the same chart. No AI anywhere on this panel.
 */

interface Place { name: string; displayName: string; lat: number; lng: number }

const SIGN_INDEX: Record<string, number> = Object.fromEntries(RASHI_ORDER.map((s, i) => [s, i + 1]));

export default function KendraPanel() {
  const [date, setDate] = useState('1996-03-15');
  const [time, setTime] = useState('08:30');
  const [placeQuery, setPlaceQuery] = useState('Colombo');
  const [place, setPlace] = useState<Place>({ name: 'Colombo', displayName: 'Colombo, Sri Lanka', lat: 6.9271, lng: 79.8612 });
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [kundli, setKundli] = useState<any>(null);
  const [kendara, setKendara] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [chartLang, setChartLang] = useState<'si' | 'en'>('si');

  const boxRef = useRef<HTMLDivElement>(null);

  // Close the place dropdown on outside click.
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  async function searchPlace(q?: string) {
    const query = (q ?? placeQuery).trim();
    if (query.length < 2) return;
    setSearching(true);
    try {
      const d = await astroGet(`/api/geocode/search?q=${encodeURIComponent(query)}`);
      setResults((d?.data || []).slice(0, 6));
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  // Auto-search while typing (debounced) — no button press needed.
  useEffect(() => {
    const q = placeQuery.trim();
    if (q.length < 2 || q === place.name) return;
    const t = setTimeout(() => searchPlace(q), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeQuery]);

  async function build() {
    setLoading(true);
    setErr('');
    setKundli(null);
    setKendara(null);
    const birthDate = `${date}T${time}:00`;
    const payload = { birthDate, lat: place.lat, lng: place.lng };
    try {
      const [k, ke] = await Promise.allSettled([
        astroPost('/api/jyotish/kundli', payload),
        astroPost('/api/preview/kendara', payload),
      ]);
      if (k.status === 'fulfilled') setKundli(k.value?.data || null);
      if (ke.status === 'fulfilled') setKendara(ke.value?.data || null);
      if (k.status === 'rejected' && ke.status === 'rejected') {
        throw new Error((k.reason as Error)?.message || 'Chart build failed');
      }
    } catch (e: any) {
      setErr(e.message || 'Chart build failed');
    } finally {
      setLoading(false);
    }
  }

  /* ── Chart cells (mobile-app kendara format) ── */

  const d1LagnaId: number =
    kendara?.lagna?.rashiId || kundli?.ascendant?.rashiId || 1;

  const d1Cells: KendaraCell[] = React.useMemo(() => {
    if (kendara?.rashiChart?.length) {
      return kendara.rashiChart.map((r: any) => ({
        rashiId: r.rashiId,
        planets: (r.planets || []).map((p: any) => ({ name: p.name, degree: p.degree })),
      }));
    }
    if (kundli?.houses?.length) {
      return kundli.houses.map((h: any) => ({
        rashiId: h.rashi,
        planets: (h.planets || []).map((name: string) => ({ name })),
      }));
    }
    return [];
  }, [kendara, kundli]);

  const d9LagnaId: number = SIGN_INDEX[kundli?.navamsha?.ascendant] || 1;

  const d9Cells: KendaraCell[] = React.useMemo(() => {
    const nav = kundli?.navamsha;
    if (!nav?.planets) return [];
    const byRashi = new Map<number, Array<{ name: string }>>();
    for (const [planet, sign] of Object.entries(nav.planets as Record<string, string>)) {
      const id = SIGN_INDEX[sign];
      if (!id) continue;
      byRashi.set(id, [...(byRashi.get(id) || []), { name: planet }]);
    }
    return Array.from({ length: 12 }, (_, i) => ({
      rashiId: i + 1,
      planets: byRashi.get(i + 1) || [],
    }));
  }, [kundli]);

  const maha = kundli?.dasha?.currentMahadasha;
  const timeline: any[] = kundli?.dasha?.timeline || [];

  function copyChart() {
    if (!kundli && !kendara) return;
    const asc = kundli?.ascendant;
    const lines = [
      `KENDRA — ${date} ${time} · ${place.name}`,
      `Lagna: ${asc?.rashi || kendara?.lagna?.english || '—'}${asc ? ` ${asc.degree}°${asc.minute}'` : ''} · nakshatra ${asc?.nakshatra || '—'} (pada ${asc?.pada ?? '—'})`,
      `Moon: ${kendara?.moonSign?.english || '—'} · Sun: ${kendara?.sunSign?.english || '—'} · Birth nakshatra: ${kundli?.dasha?.birthNakshatra || kendara?.nakshatra?.name || '—'}`,
      maha ? `Current mahadasha: ${maha.planet} (${sltDate(maha.startTime)} → ${sltDate(maha.endTime)}, ${maha.progressPercent?.toFixed(1)}% done)` : '',
      kundli?.dasha?.currentPratyantar ? `Pratyantar: ${kundli.dasha.currentPratyantar.planet}` : '',
      kendara?.vaultCounts ? `Yogas: ${kendara.vaultCounts.yogas} (raja ${kendara.vaultCounts.rajaYogas}, rare ${kendara.vaultCounts.rareYogas}) · Doshas: ${kendara.vaultCounts.doshas}` : '',
      kendara?.vaultCounts?.topYoga ? `Top yoga: ${kendara.vaultCounts.topYoga.name}` : '',
      kundli?.mangalDosha ? `Mangal dosha: ${kundli.mangalDosha.hasDosha ? `yes — ${kundli.mangalDosha.description}` : 'no'}` : '',
      kundli?.sadeSati ? `Sade Sati: ${kundli.sadeSati.status ? 'active' : 'no'}` : '',
      '',
      'Planets:',
      ...Object.entries(kundli?.planets || {}).map(
        ([n, p]: any) => `  ${n}: ${p.rashi} ${p.degree}°${p.minute}' · ${p.nakshatra}${p.isRetrograde ? ' ℞' : ''}${p.isCombust ? ' (combust)' : ''}`,
      ),
    ].filter(Boolean);
    copyText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-4">
      {/* Birth data */}
      <Panel title="Birth data">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Time" hint="24h · local">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
          </Field>
          <div className="relative sm:col-span-2" ref={boxRef}>
            <Field label="Birth place" hint={`${place.lat.toFixed(3)}, ${place.lng.toFixed(3)}`}>
              <div className="flex gap-1.5">
                <input
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchPlace()}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                  placeholder="Type a city — Colombo, Kandy, Galle…"
                  className={inputCls}
                />
                <Btn variant="ghost" size="md" onClick={() => searchPlace()} disabled={searching} title="Search place">
                  <MapPin size={13} className={searching ? 'animate-pulse' : ''} />
                </Btn>
              </div>
            </Field>
            {showResults && results.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line-strong bg-surface-2 shadow-[0_18px_40px_rgba(0,0,0,0.5)]">
                {results.map((r, k) => (
                  <li key={k}>
                    <button
                      onClick={() => { setPlace(r); setPlaceQuery(r.name); setShowResults(false); }}
                      className="w-full px-3 py-2 text-left text-[12px] text-ink-2 transition-colors hover:bg-accent-glow hover:text-ink"
                    >
                      <span className="font-medium text-ink">{r.name}</span>
                      <span className="ml-1.5 text-[11px] text-ink-3">{r.displayName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Btn variant="primary" size="md" onClick={build} disabled={loading}>
            <Compass size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Casting chart…' : 'Create kendra'}
          </Btn>
          {(kundli || kendara) && (
            <Btn variant="ghost" size="md" onClick={copyChart}>
              {copied ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy chart as text'}
            </Btn>
          )}
          <span className="font-mono text-[10.5px] text-ink-3">deterministic · same birth data → same chart</span>
        </div>
        {err && <p className="mt-3 rounded-lg border border-[rgba(224,101,95,0.3)] bg-[rgba(224,101,95,0.08)] px-3 py-2 text-[11.5px] text-danger">{err}</p>}
      </Panel>

      {!kundli && !kendara && !loading && (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState
            icon={Compass}
            title="No chart cast yet"
            hint="Enter birth date, time and place, then press Create kendra — the engine computes the real charts, dasha and yogas."
          />
        </div>
      )}

      {(kundli || kendara) && (
        <>
          {/* Identity strip */}
          <Panel title="Chart identity">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {[
                ['Lagna', kundli?.ascendant?.rashi || kendara?.lagna?.english, kundli?.ascendant ? `${kundli.ascendant.degree}°${kundli.ascendant.minute}' · ${kundli.ascendant.lord}` : kendara?.lagna?.sinhala],
                ['Moon rashi', kendara?.moonSign?.english, kendara?.moonSign?.sinhala],
                ['Sun rashi', kendara?.sunSign?.english, kendara?.sunSign?.sinhala],
                ['Birth nakshatra', kundli?.dasha?.birthNakshatra || kendara?.nakshatra?.name, kundli?.dasha?.nakshatraPada ? `pada ${kundli.dasha.nakshatraPada}` : kendara?.nakshatra?.sinhala],
              ].map(([label, value, sub]: any) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-3">{label}</dt>
                  <dd className="mt-0.5 truncate font-display text-[17px] font-semibold text-ink">{value || '—'}</dd>
                  {sub && <p className="truncate text-[10.5px] text-ink-3">{sub}</p>}
                </div>
              ))}
            </dl>
          </Panel>

          {/* Charts — the same Sri Lankan kendara the mobile app renders */}
          {d1Cells.length > 0 && (
            <Panel
              title="Charts"
              pad={false}
              aside={
                <div className="flex gap-1.5">
                  {(['si', 'en'] as const).map((l) => (
                    <Chip key={l} active={chartLang === l} onClick={() => setChartLang(l)}>
                      {l === 'si' ? 'සිංහල' : 'EN'}
                    </Chip>
                  ))}
                </div>
              }
            >
              <div className="grid gap-6 p-4 sm:grid-cols-2">
                <KendaraChart
                  cells={d1Cells}
                  lagnaRashiId={d1LagnaId}
                  language={chartLang}
                  title="D1 · Rashi kendara"
                  centerLabel={chartLang === 'si' ? 'රාශි කේන්ද්‍රය' : 'Birth Chart'}
                />
                {d9Cells.length > 0 && (
                  <KendaraChart
                    cells={d9Cells}
                    lagnaRashiId={d9LagnaId}
                    language={chartLang}
                    title="D9 · Navamsha"
                    centerLabel={chartLang === 'si' ? 'නවාංශකය' : 'Navamsha'}
                    showDegrees={false}
                  />
                )}
              </div>
            </Panel>
          )}

          {/* Dasha */}
          {maha && (
            <Panel title="Vimshottari dasha">
              <div className="mb-4 rounded-lg border border-accent/30 bg-accent-glow p-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-[13px] font-semibold text-accent-ink">
                    {maha.planet} mahadasha
                    {kundli?.dasha?.currentPratyantar && (
                      <span className="ml-1.5 font-normal text-ink-2">· {kundli.dasha.currentPratyantar.planet} pratyantar</span>
                    )}
                  </p>
                  <span className="font-mono text-[11px] tabular-nums text-ink-2">{maha.progressPercent?.toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, maha.progressPercent || 0)}%` }} />
                </div>
                <p className="mt-1.5 font-mono text-[10.5px] tabular-nums text-ink-3">
                  {sltDate(maha.startTime)} → {sltDate(maha.endTime)} · {maha.durationYears?.toFixed(1)} years
                </p>
              </div>
              {timeline.length > 0 && (
                <ul className="max-h-[220px] space-y-1 overflow-y-auto pr-1">
                  {timeline.map((t, k) => {
                    const active = t.planet === maha.planet;
                    return (
                      <li
                        key={k}
                        className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-[12px] ${
                          active ? 'bg-surface-2 text-ink' : 'text-ink-3'
                        }`}
                      >
                        <span className={active ? 'font-semibold text-accent-ink' : ''}>{t.planet}</span>
                        <span className="font-mono text-[10.5px] tabular-nums">
                          {new Date(t.start).getFullYear()} – {new Date(t.end).getFullYear()}
                          <span className="ml-2 text-ink-3">{t.years?.toFixed(1)}y</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Planets */}
            {kundli?.planets && (
              <Panel title="Planets" pad={false}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px]">
                    <thead>
                      <tr className="border-b border-line text-left">
                        {['Planet', 'Rashi', 'Deg', 'Nakshatra', ''].map((h) => (
                          <th key={h} className="px-3 py-2 text-[10.5px] font-medium uppercase tracking-wider text-ink-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(kundli.planets).map(([name, p]: any) => (
                        <tr key={name} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                          <td className="px-3 py-1.5 text-[12.5px] font-medium text-ink">{name}</td>
                          <td className="px-3 py-1.5 text-[12.5px] text-ink-2">{p.rashi}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-[11.5px] tabular-nums text-ink-2">{p.degree}°{String(p.minute).padStart(2, '0')}&apos;</td>
                          <td className="px-3 py-1.5 text-[11.5px] text-ink-2">{p.nakshatra}</td>
                          <td className="px-3 py-1.5">
                            <span className="flex gap-1">
                              {p.isRetrograde && <span className="rounded bg-[rgba(224,101,95,0.14)] px-1 font-mono text-[9px] font-semibold text-danger">℞</span>}
                              {p.isCombust && <span className="rounded bg-gold-dim px-1 font-mono text-[9px] font-semibold text-gold">☌</span>}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            {/* Yogas / doshas */}
            <Panel title="Yogas & doshas">
              {kendara?.vaultCounts ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ['Yogas', kendara.vaultCounts.yogas, 'text-accent-ink'],
                      ['Raja yogas', kendara.vaultCounts.rajaYogas, 'text-gold'],
                      ['Rare yogas', kendara.vaultCounts.rareYogas, 'text-gold'],
                      ['Doshas', kendara.vaultCounts.doshas, 'text-danger'],
                    ].map(([label, n, tone]: any) => (
                      <div key={label} className="rounded-lg border border-line px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-ink-3">{label}</p>
                        <p className={`font-mono text-[20px] font-semibold tabular-nums ${tone}`}>{n ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                  {kendara.vaultCounts.topYoga && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-gold/25 bg-gold-dim px-3 py-2">
                      <Sparkles size={13} className="shrink-0 text-gold" />
                      <p className="min-w-0 truncate text-[12.5px] text-ink">
                        <span className="font-medium">{kendara.vaultCounts.topYoga.name}</span>
                        {kendara.vaultCounts.topYoga.category && (
                          <span className="ml-1.5 text-ink-3">{kendara.vaultCounts.topYoga.category}</span>
                        )}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="py-2 text-[12px] text-ink-3">Yoga scan unavailable for this chart.</p>
              )}

              <div className="mt-3 space-y-2">
                {kundli?.mangalDosha && (
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-line px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-ink">Mangal dosha</p>
                      {kundli.mangalDosha.description && (
                        <p className="truncate text-[11px] text-ink-3">{kundli.mangalDosha.description}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      kundli.mangalDosha.hasDosha ? 'bg-[rgba(224,101,95,0.14)] text-danger' : 'bg-[rgba(92,189,138,0.14)] text-ok'
                    }`}>
                      {kundli.mangalDosha.hasDosha ? (kundli.mangalDosha.isHigh ? 'HIGH' : 'PRESENT') : 'CLEAR'}
                    </span>
                  </div>
                )}
                {kundli?.sadeSati && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                    <p className="text-[12.5px] font-medium text-ink">Sade Sati</p>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      kundli.sadeSati.status ? 'bg-[rgba(217,164,65,0.16)] text-warn' : 'bg-[rgba(92,189,138,0.14)] text-ok'
                    }`}>
                      {kundli.sadeSati.status ? 'ACTIVE' : 'CLEAR'}
                    </span>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
