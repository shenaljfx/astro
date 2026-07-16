'use client';

import React, { useMemo } from 'react';
import { slt } from '@/lib/engine';

/**
 * Tonight's Sky — the console's signature hero. Everything drawn here is a
 * real computation: the moon is shaded from the actual tithi + paksha, the
 * hora chip finds the planetary hour running right now, and the data columns
 * are the live panchanga. No AI, no decoration that lies.
 */

/* ── Deterministic star field (same on server & client) ── */

function starField(count: number, seed: number) {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: +(rnd() * 100).toFixed(2),
    y: +(rnd() * 100).toFixed(2),
    r: +(0.4 + rnd() * 1.3).toFixed(2),
    o: +(0.2 + rnd() * 0.75).toFixed(2),
    d: +(rnd() * 4).toFixed(2),
    gold: rnd() < 0.12,
  }));
}
const STARS = starField(88, 20260716);
// One drawn constellation — a scorpion-ish hook across the upper sky.
const CONSTELLATION = [[6, 14], [14, 23], [23, 31], [31, 44], [44, 52], [31, 39]] as Array<[number, number]>;

/* ── Moon phase from the real tithi ── */

function MoonDisc({ tithiNumber, paksha, size = 108 }: { tithiNumber?: number; paksha?: string; size?: number }) {
  const { path, f, waning } = useMemo(() => {
    const n = Math.max(1, Math.min(15, tithiNumber || 8));
    const waning = /krishna|waning|අව/i.test(paksha || '');
    // Illuminated fraction: shukla waxes 0→1, krishna wanes 1→0.
    const f = Math.max(0.04, Math.min(0.98, waning ? 1 - n / 15 : n / 15));
    const r = 50, c = 60;
    const rx = r * Math.abs(Math.cos(Math.PI * f));
    // Lit limb on the right (waxing); mirrored for waning via transform.
    const sweep = f < 0.5 ? 0 : 1;
    const path = `M ${c} ${c - r} A ${r} ${r} 0 0 1 ${c} ${c + r} A ${rx} ${r} 0 0 ${sweep} ${c} ${c - r} Z`;
    return { path, f, waning };
  }, [tithiNumber, paksha]);

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden className="drop-shadow-[0_0_28px_rgba(231,226,255,0.18)]">
      <defs>
        <radialGradient id="moonlit" cx="38%" cy="34%" r="75%">
          <stop offset="0%" stopColor="#fdfbf3" />
          <stop offset="55%" stopColor="#ece7dc" />
          <stop offset="100%" stopColor="#c9c2b2" />
        </radialGradient>
        <radialGradient id="moondark" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#181628" />
          <stop offset="100%" stopColor="#0d0b1a" />
        </radialGradient>
      </defs>
      {/* dark body */}
      <circle cx="60" cy="60" r="50" fill="url(#moondark)" stroke="rgba(233,231,244,0.14)" strokeWidth="1" />
      {/* lit portion — mirrored when waning so light sits on the left */}
      <g transform={waning ? 'translate(120,0) scale(-1,1)' : undefined}>
        <path d={path} fill="url(#moonlit)" />
      </g>
      {/* maria — quiet craters, only over the lit side's field */}
      <g opacity={0.16 * Math.min(1, f * 2)}>
        <circle cx="72" cy="46" r="7" fill="#8f8a7c" />
        <circle cx="60" cy="70" r="10" fill="#8f8a7c" />
        <circle cx="79" cy="72" r="4.5" fill="#8f8a7c" />
        <circle cx="50" cy="42" r="5" fill="#8f8a7c" />
      </g>
    </svg>
  );
}

/* ── Hero ── */

export default function SkyHero({
  today,
  engine,
}: {
  today: any | null;
  engine: 'checking' | 'online' | 'offline';
}) {
  const p = today?.panchanga;

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Colombo' }),
    [],
  );

  // The planetary hour running right now (real horas from the engine).
  const horaNow = useMemo(() => {
    const horas: any[] = p?.horas || [];
    const now = Date.now();
    return horas.find((h) => now >= new Date(h.start).getTime() && now < new Date(h.end).getTime()) || null;
  }, [p]);

  // Compact range: "1:49–3:22 PM" (meridiem once, no leading zeros).
  const short = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Colombo' })
      : '';
  const shortRange = (a?: string, b?: string) => {
    if (!a || !b) return undefined;
    const s = short(a), e = short(b);
    const [sm, em] = [s.slice(-2), e.slice(-2)];
    return sm === em ? `${s.slice(0, -3)}–${e}` : `${s}–${e}`;
  };

  const cols: Array<[string, string | undefined, string | undefined]> = [
    ['Tithi', p?.tithi?.name, p?.tithi?.pakshaName || p?.tithi?.paksha],
    ['Yoga', p?.yoga?.name, p?.karana?.name ? `karana ${p.karana.name}` : undefined],
    ['Moon rashi', p?.moonSign?.english, p?.moonSign?.sinhala],
    ['Sunrise', slt(p?.sunrise), undefined],
    ['Sunset', slt(p?.sunset), undefined],
    ['Rahu kalam', shortRange(p?.rahuKalam?.start, p?.rahuKalam?.end), 'avoid new starts'],
  ];

  const online = engine === 'online' && !!p;

  return (
    <section className="rise relative mb-6 overflow-hidden rounded-2xl border border-line" style={{ ['--i' as any]: 4 }}>
      {/* ── Sky layers ── */}
      <div className="absolute inset-0 bg-[#05040d]" />
      {/* aurora */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(900px 340px at 12% -10%, rgba(139,124,255,0.22), transparent 65%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(700px 300px at 78% 118%, rgba(227,184,79,0.10), transparent 60%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(420px 240px at 55% -20%, rgba(90,140,255,0.10), transparent 70%)' }} />

      {/* stars + constellation */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
        {CONSTELLATION.map(([a, b], i) => (
          <line
            key={i}
            x1={STARS[a].x} y1={STARS[a].y} x2={STARS[b].x} y2={STARS[b].y}
            stroke="rgba(227,184,79,0.20)" strokeWidth="0.1"
          />
        ))}
        {Array.from(new Set(CONSTELLATION.flat())).map((i) => (
          <circle key={`n${i}`} cx={STARS[i].x} cy={STARS[i].y} r="0.28" fill="rgba(227,184,79,0.75)" />
        ))}
        {STARS.map((st, i) => (
          <circle
            key={i}
            cx={st.x} cy={st.y} r={st.r * 0.14}
            fill={st.gold ? 'var(--gold)' : '#d6d1ef'}
            opacity={st.o}
            className="animate-twinkle"
            style={{ animationDelay: `${st.d}s` }}
          />
        ))}
        {/* horizon arc */}
        <ellipse cx="50" cy="132" rx="72" ry="34" fill="none" stroke="rgba(139,124,255,0.22)" strokeWidth="0.16" />
        <ellipse cx="50" cy="134" rx="72" ry="34" fill="rgba(10,8,22,0.55)" />
      </svg>

      {/* ── Content ── */}
      <div className="relative grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:gap-10 md:p-8 lg:grid-cols-[1.1fr_auto_1.2fr]">
        {/* Nakshatra */}
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-gold">✦ Tonight&apos;s sky — {dateLabel}</p>
          {online ? (
            <>
              <h2 className="mt-2.5 font-display text-[42px] font-semibold leading-[0.95] tracking-[-0.02em] text-ink md:text-[52px]">
                {p.nakshatra?.name || '—'}
              </h2>
              <p className="mt-2 text-[13px] text-ink-2">
                {p.nakshatra?.sinhala && <span className="mr-2 text-ink">{p.nakshatra.sinhala}</span>}
                nakshatra · ruled by <span className="text-gold">{p.nakshatra?.lord || '—'}</span>
                {p.nakshatra?.pada ? <span className="text-ink-3"> · pada {p.nakshatra.pada}</span> : null}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {horaNow && (
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-gold/30 bg-gold-dim px-3 font-mono text-[11px] text-gold">
                    ● hora now — {horaNow.ruler} · till {slt(horaNow.end)}
                  </span>
                )}
                {p.vaara?.name && (
                  <span className="inline-flex h-7 items-center rounded-full border border-line px-3 font-mono text-[11px] text-ink-2">
                    {p.vaara.name}{p.vaara.ruler ? ` · ${p.vaara.ruler}` : ''}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-2.5 font-display text-[42px] font-semibold leading-[0.95] tracking-[-0.02em] text-ink-3 md:text-[52px]">
                {engine === 'offline' ? 'Engine offline' : 'Reading the sky…'}
              </h2>
              <p className="mt-2 text-[13px] text-ink-3">
                {engine === 'offline' ? 'Start the server to mirror the engine.' : 'Fetching live ephemeris'}
              </p>
            </>
          )}
        </div>

        {/* Moon — shaded from the real tithi */}
        <div className="hidden flex-col items-center gap-2 md:flex">
          <MoonDisc tithiNumber={online ? p.tithi?.number : undefined} paksha={online ? (p.tithi?.pakshaName || p.tithi?.paksha) : undefined} />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
            {online && p.tithi?.name ? `${p.tithi.name} · ${p.tithi.paksha || ''}` : 'moon'}
          </p>
        </div>

        {/* Data columns */}
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:border-l lg:border-line lg:pl-8">
          {cols.map(([label, value, sub]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-3">{label}</dt>
              <dd className="mt-1 truncate font-mono text-[13.5px] tabular-nums text-ink" title={value}>
                {online && value ? value : '—'}
              </dd>
              {sub && online && <p className="mt-0.5 truncate text-[10px] text-ink-3">{sub}</p>}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
