'use client';

import React, { useEffect, useState } from 'react';
import { Panel, Chip, EmptyState, SIGN_ART } from '@/components/ui';
import { astroGet, copyText } from '@/lib/engine';
import { Table2, Check, Copy } from 'lucide-react';

/**
 * The 12-sign board — every line is computed (Chandra gochara + Saturn/Jupiter
 * transits). This is the raw marketing content: copy any row, or the lot.
 */

type Period = 'daily' | 'weekly' | 'monthly';

interface SignRow {
  english: string; sinhala: string; symbol: string;
  quote: string; quoteSi: string; rating: string; score: number;
  chandrashtama?: boolean; sadeSati?: boolean; jupiterFavorable?: boolean;
  lucky: { number: number; color: string };
  goodDays?: number; totalDays?: number;
  bestDay?: { weekday: string; dayOfMonth: number };
  cautionDates?: string[];
}

const RATING_TONE: Record<string, string> = {
  Favorable: 'bg-[rgba(92,189,138,0.14)] text-ok',
  Balanced: 'bg-[rgba(139,124,255,0.16)] text-accent-ink',
  'Take care': 'bg-[rgba(217,164,65,0.16)] text-warn',
};

export default function RashiPanel() {
  const [period, setPeriod] = useState<Period>('daily');
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const [rows, setRows] = useState<SignRow[]>([]);
  const [label, setLabel] = useState('');
  const [err, setErr] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedRow, setCopiedRow] = useState<string | null>(null);

  useEffect(() => {
    setErr('');
    setRows([]);
    const url = period === 'daily' ? '/api/marketing/rashi-daily' : `/api/marketing/rashi-period?mode=${period}`;
    astroGet(url)
      .then((d) => {
        setRows(d.signs || []);
        setLabel(period === 'daily' ? new Date(d.date).toDateString() : d.label || '');
      })
      .catch((e) => setErr(e.message));
  }, [period]);

  const line = (r: SignRow) => (lang === 'si' ? r.quoteSi : r.quote);

  function copyAll() {
    const text = rows
      .map((r) => `${lang === 'si' ? r.sinhala : r.english} — ${r.rating} (${r.score})\n${line(r)}`)
      .join('\n\n');
    copyText(`GRAHACHARA · ${label}\n\n${text}`);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1800);
  }

  function copyRow(r: SignRow) {
    copyText(`${lang === 'si' ? r.sinhala : r.english} — ${line(r)}`);
    setCopiedRow(r.english);
    setTimeout(() => setCopiedRow(null), 1500);
  }

  return (
    <div className="space-y-4">
      <Panel
        title={`12-sign board${label ? ` · ${label}` : ''}`}
        aside={
          rows.length > 0 && (
            <button
              onClick={copyAll}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors ${
                copiedAll ? 'bg-[rgba(92,189,138,0.14)] text-ok' : 'bg-surface-2 text-ink-3 hover:text-ink'
              }`}
            >
              {copiedAll ? <Check size={11} /> : <Copy size={11} />}
              {copiedAll ? 'Copied' : 'Copy all 12'}
            </button>
          )
        }
      >
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1.5">
            {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
              <Chip key={p} active={period === p} onClick={() => setPeriod(p)} className="capitalize">
                {p}
              </Chip>
            ))}
          </div>
          <span className="w-px bg-line" />
          <div className="flex gap-1.5">
            {(['en', 'si'] as const).map((l) => (
              <Chip key={l} active={lang === l} onClick={() => setLang(l)}>
                {l === 'en' ? 'English' : 'සිංහල'}
              </Chip>
            ))}
          </div>
        </div>
        <p className="mt-2 font-mono text-[10.5px] text-gold">
          ✦ computed from the ephemeris — Chandra gochara + Saturn/Jupiter transits · no AI
        </p>
      </Panel>

      {err ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState icon={Table2} title="Engine offline" hint={err} />
        </div>
      ) : rows.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, k) => (
            <div key={k} className="h-16 animate-pulse rounded-xl border border-line bg-surface" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {rows.map((r) => (
            <div
              key={r.english}
              className="group flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-surface-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SIGN_ART[r.english]} alt="" className="mt-0.5 h-8 w-8 shrink-0 rounded-full border border-line-strong object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-ink">{lang === 'si' ? r.sinhala : r.english}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${RATING_TONE[r.rating] || 'bg-surface-2 text-ink-3'}`}>
                    {r.rating} {r.score}
                  </span>
                  {r.chandrashtama && <span className="rounded bg-[rgba(224,101,95,0.14)] px-1.5 py-0.5 text-[9.5px] font-semibold text-danger">CHANDRASHTAMA</span>}
                  {r.sadeSati && <span className="rounded bg-[rgba(217,164,65,0.16)] px-1.5 py-0.5 text-[9.5px] font-semibold text-warn">SADE SATI</span>}
                  {r.jupiterFavorable && <span className="rounded bg-[rgba(92,189,138,0.14)] px-1.5 py-0.5 text-[9.5px] font-semibold text-ok">JUPITER +</span>}
                  {typeof r.goodDays === 'number' && (
                    <span className="font-mono text-[10px] text-ink-3">{r.goodDays}/{r.totalDays} bright{r.bestDay?.weekday ? ` · best ${r.bestDay.weekday}` : ''}</span>
                  )}
                </div>
                <p className={`mt-1 text-[12.5px] text-ink-2 ${lang === 'si' ? 'leading-[1.8]' : 'leading-relaxed'}`}>{line(r)}</p>
                <p className="mt-1 font-mono text-[10px] text-ink-3">lucky {r.lucky.number} · {r.lucky.color}</p>
              </div>
              <button
                onClick={() => copyRow(r)}
                title="Copy this line"
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all ${
                  copiedRow === r.english ? 'bg-[rgba(92,189,138,0.14)] text-ok' : 'bg-surface-2 text-ink-3 opacity-0 group-hover:opacity-100 hover:text-ink'
                }`}
              >
                {copiedRow === r.english ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
