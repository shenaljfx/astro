'use client';

import React from 'react';
import { SIGN_ART } from '@/components/ui';

/**
 * Sri Lankan traditional rashi kendara — a faithful web port of the mobile
 * app's SriLankanChart component (3×3 grid, diagonal corner splits, HOUSE
 * numbers in fixed positions, house 1 = lagna):
 *
 *   +---------+---------+---------+
 *   | 2  / 3  |    1    | 12 \ 11 |
 *   +---------+---------+---------+
 *   |    4    | CENTER  |   10    |
 *   +---------+---------+---------+
 *   | 5  \ 6  |    7    | 9  / 8  |
 *   +---------+---------+---------+
 */

const RASHI_SI: Record<number, string> = {
  1: 'මේෂ', 2: 'වෘෂභ', 3: 'මිථුන', 4: 'කටක',
  5: 'සිංහ', 6: 'කන්‍යා', 7: 'තුලා', 8: 'වෘශ්චික',
  9: 'ධනු', 10: 'මකර', 11: 'කුම්භ', 12: 'මීන',
};
const RASHI_EN: Record<number, string> = {
  1: 'Aries', 2: 'Taurus', 3: 'Gemini', 4: 'Cancer',
  5: 'Leo', 6: 'Virgo', 7: 'Libra', 8: 'Scorpio',
  9: 'Sagittarius', 10: 'Capricorn', 11: 'Aquarius', 12: 'Pisces',
};

// Same names + colours as the mobile app's PLANET_INFO.
const PLANET_INFO: Record<string, { si: string; en: string; color: string }> = {
  Sun: { si: 'රවි', en: 'Su', color: '#fbbf24' },
  Moon: { si: 'චන්ද්‍ර', en: 'Mo', color: '#c7d2fe' },
  Mars: { si: 'කුජ', en: 'Ma', color: '#f87171' },
  Mercury: { si: 'බුධ', en: 'Me', color: '#6ee7b7' },
  Jupiter: { si: 'ගුරු', en: 'Ju', color: '#fbbf24' },
  Venus: { si: 'සිකුරු', en: 'Ve', color: '#f9a8d4' },
  Saturn: { si: 'ශනි', en: 'Sa', color: '#a5b4fc' },
  Rahu: { si: 'රාහු', en: 'Ra', color: '#94a3b8' },
  Ketu: { si: 'කේතු', en: 'Ke', color: '#c4b5fd' },
  Uranus: { si: 'යුරේනස්', en: 'Ur', color: '#7dd3fc' },
  Neptune: { si: 'නෙප්චූන්', en: 'Ne', color: '#67e8f9' },
  Pluto: { si: 'ප්ලූටෝ', en: 'Pl', color: '#d8b4fe' },
};

const BORDER = 'rgba(251,191,36,0.7)';
const LINE = 'rgba(251,191,36,0.5)';

export interface KendaraPlanet { name: string; degree?: number | null }
export interface KendaraCell { rashiId: number; planets: KendaraPlanet[] }

// Dot-style degree like the handwritten chart: 26·26
function degDot(deg?: number | null): string {
  if (deg == null || isNaN(deg)) return '';
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return `${String(d).padStart(2, '0')}·${String(m).padStart(2, '0')}`;
}

function PlanetStack({
  planets, language, showDeg, className = '', compact = false,
}: {
  planets: KendaraPlanet[]; language: 'si' | 'en'; showDeg: boolean; className?: string; compact?: boolean;
}) {
  if (!planets.length) return null;
  const size = compact ? (language === 'si' ? 8.5 : 9) : language === 'si' ? 10 : 10.5;
  return (
    <div className={`flex flex-col gap-px ${className}`}>
      {planets.map((p, i) => {
        const info = PLANET_INFO[p.name];
        const label = info ? (language === 'si' ? info.si : info.en) : p.name.slice(0, 2);
        const deg = showDeg ? degDot(p.degree) : '';
        return (
          <span
            key={i}
            className="truncate text-left font-semibold leading-[1.2]"
            style={{ color: info?.color || '#fff', fontSize: size }}
            title={`${p.name}${p.degree != null ? ` ${degDot(p.degree)}` : ''}`}
          >
            {label}{deg ? <span className="ml-1 font-mono text-[8.5px] opacity-80">{deg}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

function HouseNum({ n, className }: { n: number; className: string }) {
  return (
    <span className={`absolute z-10 font-mono text-[9px] font-bold ${className}`} style={{ color: 'rgba(251,191,36,0.6)' }}>
      {n}
    </span>
  );
}

export default function KendaraChart({
  cells,
  lagnaRashiId,
  language = 'si',
  title,
  centerLabel,
  showDegrees = true,
}: {
  cells: KendaraCell[];
  lagnaRashiId: number;
  language?: 'si' | 'en';
  title: string;         // panel caption above the chart
  centerLabel: string;   // centre plate small title, e.g. රාශි කේන්ද්‍රය / නවාංශකය
  showDegrees?: boolean;
}) {
  const byRashi = new Map<number, KendaraPlanet[]>();
  for (const c of cells) {
    byRashi.set(
      c.rashiId,
      (c.planets || []).filter((p) => p.name !== 'Lagna' && p.name !== 'Ascendant'),
    );
  }
  const rashiForHouse = (n: number) => ((lagnaRashiId - 1 + (n - 1)) % 12) + 1;
  const planetsFor = (house: number) => byRashi.get(rashiForHouse(house)) || [];

  const lagnaName = language === 'si' ? RASHI_SI[lagnaRashiId] : RASHI_EN[lagnaRashiId];
  const art = SIGN_ART[RASHI_EN[lagnaRashiId]];

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-2">{title}</h4>
        <span className="font-mono text-[10px] text-ink-3">{language === 'si' ? 'ලග්නයෙන්' : 'from lagna'} · {lagnaName}</span>
      </div>

      <div className="relative aspect-square w-full select-none bg-[rgba(10,3,25,0.95)]">
        {/* frame + grid + corner diagonals — same strokes as the mobile chart */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden>
          <rect x="1" y="1" width="298" height="298" fill="none" stroke={BORDER} strokeWidth="2" />
          <line x1="100" y1="0" x2="100" y2="300" stroke={BORDER} strokeWidth="1" />
          <line x1="200" y1="0" x2="200" y2="300" stroke={BORDER} strokeWidth="1" />
          <line x1="0" y1="100" x2="300" y2="100" stroke={BORDER} strokeWidth="1" />
          <line x1="0" y1="200" x2="300" y2="200" stroke={BORDER} strokeWidth="1" />
          {/* TL "/", TR "\", BL "\", BR "/" */}
          <line x1="0" y1="100" x2="100" y2="0" stroke={LINE} strokeWidth="1" />
          <line x1="200" y1="0" x2="300" y2="100" stroke={LINE} strokeWidth="1" />
          <line x1="0" y1="200" x2="100" y2="300" stroke={LINE} strokeWidth="1" />
          <line x1="200" y1="300" x2="300" y2="200" stroke={LINE} strokeWidth="1" />
        </svg>

        {/* ── corner triangles — each stack hugs its cell corner, clear of the
               diagonal (TL cell splits "/", TR "\", BL "\", BR "/") ── */}
        {/* TL: house 2 = upper-left corner, house 3 = lower-right corner */}
        <HouseNum n={2} className="left-[1%] top-[1%]" />
        <HouseNum n={3} className="left-[30.5%] top-[29.5%]" />
        <div className="absolute left-[1.5%] top-[4.5%] flex h-[12%] w-[14%] items-start overflow-hidden">
          <PlanetStack planets={planetsFor(2)} language={language} showDeg={false} compact />
        </div>
        <div className="absolute left-[17%] top-[17%] flex h-[12.5%] w-[13%] items-end justify-end overflow-hidden">
          <PlanetStack planets={planetsFor(3)} language={language} showDeg={false} compact className="items-end" />
        </div>

        {/* TR: house 12 = upper-right corner, house 11 = lower-left corner */}
        <HouseNum n={12} className="right-[1%] top-[1%]" />
        <HouseNum n={11} className="right-[30.5%] top-[29.5%]" />
        <div className="absolute right-[1.5%] top-[4.5%] flex h-[12%] w-[14%] items-start justify-end overflow-hidden">
          <PlanetStack planets={planetsFor(12)} language={language} showDeg={false} compact className="items-end" />
        </div>
        <div className="absolute right-[17%] top-[17%] flex h-[12.5%] w-[13%] items-end overflow-hidden">
          <PlanetStack planets={planetsFor(11)} language={language} showDeg={false} compact />
        </div>

        {/* BL: house 6 = upper-right corner, house 5 = lower-left corner */}
        <HouseNum n={6} className="bottom-[29.5%] left-[30.5%]" />
        <HouseNum n={5} className="bottom-[1%] left-[1%]" />
        <div className="absolute bottom-[17%] left-[17%] flex h-[12.5%] w-[13%] items-start justify-end overflow-hidden">
          <PlanetStack planets={planetsFor(6)} language={language} showDeg={false} compact className="items-end" />
        </div>
        <div className="absolute bottom-[4.5%] left-[1.5%] flex h-[12%] w-[14%] items-end overflow-hidden">
          <PlanetStack planets={planetsFor(5)} language={language} showDeg={false} compact />
        </div>

        {/* BR: house 9 = upper-left corner, house 8 = lower-right corner */}
        <HouseNum n={9} className="bottom-[29.5%] right-[30.5%]" />
        <HouseNum n={8} className="bottom-[1%] right-[1%]" />
        <div className="absolute bottom-[17%] right-[17%] flex h-[12.5%] w-[13%] items-start overflow-hidden">
          <PlanetStack planets={planetsFor(9)} language={language} showDeg={false} compact />
        </div>
        <div className="absolute bottom-[4.5%] right-[1.5%] flex h-[12%] w-[14%] items-end justify-end overflow-hidden">
          <PlanetStack planets={planetsFor(8)} language={language} showDeg={false} compact className="items-end" />
        </div>

        {/* ── edge houses ── */}
        {/* house 1 — top middle (the lagna house) */}
        <HouseNum n={1} className="bottom-[67.5%] left-1/2 -translate-x-1/2" />
        <div className="absolute left-[34.5%] top-[3%] flex h-[27%] w-[31%] items-center pl-1">
          <PlanetStack planets={planetsFor(1)} language={language} showDeg={showDegrees} />
        </div>
        {/* house 4 — middle left */}
        <HouseNum n={4} className="right-[67.5%] top-1/2 -translate-y-1/2" />
        <div className="absolute left-[2%] top-[34.5%] flex h-[31%] w-[27%] items-center pl-1">
          <PlanetStack planets={planetsFor(4)} language={language} showDeg={showDegrees} />
        </div>
        {/* house 10 — middle right */}
        <HouseNum n={10} className="left-[67.5%] top-1/2 -translate-y-1/2" />
        <div className="absolute right-[2%] top-[34.5%] flex h-[31%] w-[27%] items-center justify-end pr-1">
          <PlanetStack planets={planetsFor(10)} language={language} showDeg={showDegrees} className="items-end" />
        </div>
        {/* house 7 — bottom middle */}
        <HouseNum n={7} className="left-1/2 top-[67.5%] -translate-x-1/2" />
        <div className="absolute bottom-[3%] left-[34.5%] flex h-[27%] w-[31%] items-center pl-1">
          <PlanetStack planets={planetsFor(7)} language={language} showDeg={showDegrees} />
        </div>

        {/* ── centre plate — zodiac art + lagna, like the app ── */}
        <div className="absolute left-1/3 top-1/3 flex h-1/3 w-1/3 flex-col items-center justify-center overflow-hidden">
          {art && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art} alt="" className="pointer-events-none absolute h-[64%] w-[64%] object-contain opacity-[0.16]" />
          )}
          <p className="relative text-[9px] font-bold" style={{ color: 'rgba(251,191,36,0.7)' }}>{centerLabel}</p>
          {art && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art} alt="" className="relative my-0.5 h-9 w-9 rounded-full object-cover" />
          )}
          <p className="relative text-[14px] font-bold" style={{ color: '#fbbf24' }}>{lagnaName}</p>
          <p className="relative text-[8.5px] font-semibold text-white/50">{language === 'si' ? 'ලග්නය' : 'Rising Sign'}</p>
        </div>
      </div>
    </div>
  );
}
