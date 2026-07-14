import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useApi, Section, Table, ErrorNote, Loading, Kpi } from '../ui';
import { fmtLKR, fmtUSD, ago } from '../api';

const tt = { contentStyle: { background: '#0d0b2e', border: '1px solid rgba(139,122,216,.3)', borderRadius: 10, fontSize: 12 } };

export default function Costs() {
  const { data, err, loading } = useApi('/costs?days=45', 60000);
  if (loading && !data) return <Loading />;
  const live = data?.live || {};
  const totals = live.totals || live.summary || {};
  const days = data?.days || [];
  const chart = days.map((d) => ({ date: String(d.date).slice(5), cost: Math.round(d.totals?.costLKR ?? d.costLKR ?? 0) }));
  const ue = data?.unitEconomics;

  return (
    <>
      <h1 className="page-title">AI Costs</h1>
      <p className="page-sub">Gemini spend from the cost tracker · today is live in-memory, history from dailyCosts</p>
      <ErrorNote err={err} />

      <div className="grid cols-4">
        <Kpi label="Today (LKR)" value={fmtLKR(totals.costLKR ?? totals.totalCostLKR)} tone="violet" />
        <Kpi label="Today (USD)" value={totals.costUSD != null ? fmtUSD(totals.costUSD) : '—'} />
        <Kpi label="Calls today" value={totals.calls ?? totals.count ?? '—'} />
        <Kpi label="Sub unit economics" value={ue?.marginPct != null ? `${Math.round(ue.marginPct)}%` : '—'} sub={ue ? 'margin per subscriber' : ''} tone="gold" />
      </div>

      <Section title="Daily spend (LKR)">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chart}>
            <XAxis dataKey="date" stroke="#8b84b8" fontSize={10.5} tickLine={false} axisLine={false} />
            <YAxis stroke="#8b84b8" fontSize={10.5} tickLine={false} axisLine={false} width={44} />
            <Tooltip {...tt} cursor={{ fill: 'rgba(139,92,246,.08)' }} />
            <Bar dataKey="cost" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Feature breakdown — today">
        <Table
          cols={['Feature', 'Calls', 'Cost LKR', 'In tokens', 'Out tokens']}
          rows={Object.entries(live)
            .filter(([k, v]) => v && typeof v === 'object' && (v.calls != null || v.count != null || v.costLKR != null))
            .map(([k, v]) => [k, v.calls ?? v.count ?? 0, fmtLKR(v.costLKR ?? 0), v.inputTokens ?? '—', v.outputTokens ?? '—'])}
        />
      </Section>

      <Section title="Recent expensive AI calls">
        <Table
          cols={['When', 'Feature', 'User', 'Cost']}
          rows={(data?.recentEvents || []).map((e) => [
            <span title={e.at}>{ago(e.at)}</span>,
            e.feature || '—',
            <span className="mono">{String(e.uid || '—').slice(0, 22)}</span>,
            fmtLKR(e.costLKR ?? e.estimateLKR),
          ])}
        />
      </Section>
    </>
  );
}
