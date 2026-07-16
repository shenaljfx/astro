'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { PageHeader, StatusDot, useEngineStatus } from '@/components/ui';
import SkyHero from '@/components/engine/SkyHero';
import SkyPanel from '@/components/engine/SkyPanel';
import KendraPanel from '@/components/engine/KendraPanel';
import RashiPanel from '@/components/engine/RashiPanel';
import PorondamPanel from '@/components/engine/PorondamPanel';
import { Orbit, Compass, Table2, HeartHandshake, LucideIcon } from 'lucide-react';

/**
 * The engine console — a full mirror of what the astrology engine can compute.
 * Every number on this page is a real calculation; there is no AI on this
 * surface by design (the generators are where models get involved).
 */

/* ── Tabs ───────────────────────────────────────────────────────────────── */

type TabKey = 'sky' | 'kendra' | 'rashi' | 'porondam';

const TABS: Array<{ key: TabKey; label: string; icon: LucideIcon; hint: string }> = [
  { key: 'sky', label: 'Sky today', icon: Orbit, hint: 'panchanga · planets · windows' },
  { key: 'kendra', label: 'Kendra', icon: Compass, hint: 'cast a real birth chart' },
  { key: 'rashi', label: '12-sign board', icon: Table2, hint: 'daily · weekly · monthly' },
  { key: 'porondam', label: 'Porondam', icon: HeartHandshake, hint: 'compatibility matrix' },
];

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const engine = useEngineStatus(45000);
  const [today, setToday] = useState<any | null>(null);
  const [tab, setTab] = useState<TabKey>('sky');

  useEffect(() => {
    fetch('/api/astro/api/marketing/today', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.panchanga && setToday(d))
      .catch(() => {});
  }, []);

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow={todayLabel}
          title="Engine console"
          description="Everything the Grahachara engine computes — live sky, real birth charts, the 12-sign board and the compatibility matrix. Pure calculation, no AI."
          actions={
            <span className="inline-flex h-8 items-center gap-2 rounded-full border border-line px-3 font-mono text-[11px] text-ink-2">
              <StatusDot state={engine === 'online' ? 'ok' : engine === 'checking' ? 'idle' : 'danger'} />
              engine {engine === 'checking' ? '…' : engine}
            </span>
          }
        />

        <SkyHero today={today} engine={engine} />

        {/* Tab bar */}
        <div className="rise mb-5" style={{ ['--i' as any]: 5 }}>
          <div className="flex gap-1 overflow-x-auto border-b border-line pb-px">
            {TABS.map((t) => {
              const Icon = t.icon;
              const on = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative flex shrink-0 items-center gap-2 rounded-t-lg px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                    on ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
                  }`}
                >
                  <Icon size={15} className={on ? 'text-accent-ink' : ''} />
                  {t.label}
                  {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
                </button>
              );
            })}
          </div>
          <p className="mt-2 font-mono text-[10.5px] text-ink-3">{active.hint}</p>
        </div>

        {/* Panels */}
        <div className="rise" style={{ ['--i' as any]: 6 }}>
          {tab === 'sky' && <SkyPanel />}
          {tab === 'kendra' && <KendraPanel />}
          {tab === 'rashi' && <RashiPanel />}
          {tab === 'porondam' && <PorondamPanel />}
        </div>
      </div>
    </AppShell>
  );
}
