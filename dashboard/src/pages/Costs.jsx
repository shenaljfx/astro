import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useApi, Section, Table, ErrorNote, Loading, Kpi, Badge } from '../ui';
import { fmtLKR, fmtUSD, ago } from '../api';

const tt = { contentStyle: { background: '#0d0b2e', border: '1px solid rgba(139,122,216,.3)', borderRadius: 10, fontSize: 12 } };

function GeminiPanel() {
  const { data: g } = useApi('/gemini', 60000);
  if (!g) return null;
  const cap = g.capacity || {}; const u = g.usageToday || {};
  return (
    <>
      <div className="grid cols-4" style={{ marginTop: 14 }}>
        <Kpi label="Free-tier reports left today (est.)" value={cap.freeReportsLeftToday ?? '—'} tone={cap.freeReportsLeftToday === 0 ? 'red' : 'green'} sub={`assumes ${g.assumptions?.proCallsPerReport} pro + ${g.assumptions?.flashCallsPerReport} flash calls/report`} />
        <Kpi label="Reports generated today" value={u.reportsGenerated ?? 0} />
        <Kpi label="Est. pro requests used" value={`${u.estProRequests ?? 0} / ${g.freeTierRPD?.pro}`} sub="free-tier RPD" />
        <Kpi label="Est. flash requests used" value={`${u.estFlashRequests ?? 0} / ${g.freeTierRPD?.flash}`} sub="free-tier RPD" />
      </div>
      <Section title={`Gemini key ${g.keyMasked || ''} — models & pricing`}>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 0 }}>
          ⚠ {g.billing?.note} <a href={g.billing?.links?.aiStudioUsage} target="_blank" rel="noreferrer">AI Studio usage</a> · <a href={g.billing?.links?.cloudBilling} target="_blank" rel="noreferrer">Cloud billing</a> · <a href={g.billing?.links?.rateLimits} target="_blank" rel="noreferrer">rate limits</a>
        </p>
        <Table
          cols={['Model', 'Role', 'Input $/1M', 'Output $/1M']}
          rows={Object.entries(g.pricingUSDper1M || {}).map(([id, p]) => [
            <span className="mono">{id}</span>,
            id === g.modelsInUse?.pro ? <Badge tone="b-gold">hero/pro</Badge> : id === g.modelsInUse?.flash ? <Badge tone="b-violet">workhorse</Badge> : <span className="muted">available</span>,
            `$${p.inputPer1M}`, `$${p.outputPer1M}`,
          ])}
        />
      </Section>
    </>
  );
}

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

      <GeminiPanel />

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
