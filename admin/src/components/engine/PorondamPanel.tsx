'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Panel, EmptyState, SIGN_ART } from '@/components/ui';
import { astroGet, copyText, RASHI_ORDER } from '@/lib/engine';
import { HeartHandshake, Check, Copy } from 'lucide-react';

/**
 * 12×12 compatibility matrix — every cell is the engine's element-harmony
 * calculation (deterministic). Click a cell for the pair's real verdict.
 */

interface Pair {
  sign1: string; sign2: string;
  element1: string; element2: string;
  score: number; chemistry: string; description: string;
}

const SHORT = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];

/** Score → cell tint. Bands match the engine's chemistry thresholds. */
function tint(score: number): string {
  if (score >= 80) return 'bg-[rgba(92,189,138,0.32)] text-ok';
  if (score >= 70) return 'bg-[rgba(92,189,138,0.18)] text-ok';
  if (score >= 50) return 'bg-[rgba(139,124,255,0.18)] text-accent-ink';
  if (score >= 40) return 'bg-[rgba(217,164,65,0.16)] text-warn';
  return 'bg-[rgba(224,101,95,0.16)] text-danger';
}

export default function PorondamPanel() {
  const [grid, setGrid] = useState<Record<string, Pair>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState<Pair | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    // The whole 78-pair matrix in ONE request (batched server-side).
    astroGet<{ pairs: Pair[] }>('/api/marketing/compatibility-matrix')
      .then((d) => {
        if (!alive) return;
        const out: Record<string, Pair> = {};
        for (const p of d.pairs || []) {
          out[`${p.sign1}|${p.sign2}`] = p;
          out[`${p.sign2}|${p.sign1}`] = { ...p, sign1: p.sign2, sign2: p.sign1, element1: p.element2, element2: p.element1 };
        }
        setGrid(out);
        setLoading(false);
      })
      .catch((e) => {
        if (alive) { setErr(e.message); setLoading(false); }
      });
    return () => { alive = false; };
  }, []);

  const best = useMemo(() => {
    const seen = new Set<string>();
    return Object.values(grid)
      .filter((p) => {
        if (p.sign1 === p.sign2) return false;
        const key = [p.sign1, p.sign2].sort().join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [grid]);

  function copyMatrix() {
    const header = ['', ...SHORT].join('\t');
    const lines = RASHI_ORDER.map((r, i) =>
      [SHORT[i], ...RASHI_ORDER.map((c) => grid[`${r}|${c}`]?.score ?? '')].join('\t'),
    );
    copyText([`GRAHACHARA — compatibility matrix (engine-computed)`, header, ...lines].join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (err) {
    return (
      <div className="rounded-xl border border-line bg-surface">
        <EmptyState icon={HeartHandshake} title="Engine offline" hint={err} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Compatibility matrix"
        aside={
          !loading && (
            <button
              onClick={copyMatrix}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors ${
                copied ? 'bg-[rgba(92,189,138,0.14)] text-ok' : 'bg-surface-2 text-ink-3 hover:text-ink'
              }`}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy as TSV'}
            </button>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-0.5">
            <thead>
              <tr>
                <th className="w-9" />
                {SHORT.map((s, i) => (
                  <th key={s} className="pb-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={SIGN_ART[RASHI_ORDER[i]]} alt={s} title={RASHI_ORDER[i]} className="mx-auto h-5 w-5 rounded-full object-cover" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RASHI_ORDER.map((row, i) => (
                <tr key={row}>
                  <th className="pr-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={SIGN_ART[row]} alt={row} title={row} className="h-5 w-5 rounded-full object-cover" />
                  </th>
                  {RASHI_ORDER.map((col) => {
                    const p = grid[`${row}|${col}`];
                    return (
                      <td key={col}>
                        <button
                          onClick={() => p && setSel(p)}
                          disabled={!p}
                          title={p ? `${row} × ${col} — ${p.chemistry} (${p.score})` : undefined}
                          className={`h-7 w-full rounded font-mono text-[10.5px] font-semibold tabular-nums transition-all ${
                            p ? `${tint(p.score)} hover:brightness-125` : 'animate-pulse bg-surface-2'
                          } ${sel && sel.sign1 === row && sel.sign2 === col ? 'ring-1 ring-accent' : ''}`}
                        >
                          {p?.score ?? ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-mono text-[10.5px] text-gold">✦ element-harmony calculation · deterministic · no AI</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Selected pair */}
        <Panel title="Pair reading">
          {sel ? (
            <>
              <div className="mb-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SIGN_ART[sel.sign1]} alt="" className="h-10 w-10 rounded-full border border-line-strong object-cover" />
                <HeartHandshake size={15} className="text-ink-3" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SIGN_ART[sel.sign2]} alt="" className="h-10 w-10 rounded-full border border-line-strong object-cover" />
                <div className="ml-1 min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink">{sel.sign1} × {sel.sign2}</p>
                  <p className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">{sel.element1} + {sel.element2}</p>
                </div>
                <span className={`ml-auto rounded-lg px-2 py-1 font-mono text-[15px] font-semibold tabular-nums ${tint(sel.score)}`}>
                  {sel.score}
                </span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-ink-2">{sel.description}</p>
              <p className="mt-2 font-mono text-[10.5px] text-ink-3">chemistry: {sel.chemistry}</p>
            </>
          ) : (
            <p className="py-8 text-center text-[12px] text-ink-3">Tap any cell in the matrix to read that pair.</p>
          )}
        </Panel>

        {/* Strongest pairs */}
        <Panel title="Strongest pairs">
          {best.length ? (
            <ul className="space-y-1.5">
              {best.map((p) => (
                <li key={`${p.sign1}|${p.sign2}`}>
                  <button
                    onClick={() => setSel(p)}
                    className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={SIGN_ART[p.sign1]} alt="" className="h-6 w-6 rounded-full object-cover" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={SIGN_ART[p.sign2]} alt="" className="-ml-3 h-6 w-6 rounded-full border border-surface object-cover" />
                    <span className="ml-1 min-w-0 flex-1 truncate text-[12.5px] text-ink">{p.sign1} × {p.sign2}</span>
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${tint(p.score)}`}>{p.score}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-[12px] text-ink-3">Computing the matrix…</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
