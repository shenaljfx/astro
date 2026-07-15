import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useApi, Kpi, Section, ErrorNote, Loading, Badge } from '../ui';
import { fmtLKR, fmtNum, fmtUSD } from '../api';

const tt = { contentStyle: { background: '#0d0b2e', border: '1px solid rgba(139,122,216,.3)', borderRadius: 10, fontSize: 12 } };

export default function Overview() {
  const { data, err, loading } = useApi('/overview', 30000);
  if (loading && !data) return <Loading />;

  const d = data || {};
  const ai = d.aiToday || {};
  const totals = ai.totals || ai.summary || {};
  const todayCost = totals.costLKR ?? totals.totalCostLKR ?? null;
  const chart = (d.costHistory || []).map((c) => ({
    date: String(c.date).slice(5),
    cost: Math.round(c.totals?.costLKR ?? c.costLKR ?? 0),
  }));
  const rev = d.purchases30d || {};

  const healthy = d.aiHealth?.healthy !== false && !d.circuit?.open;
  return (
    <>
      <h1 className="page-title">Overview</h1>
      <p className="page-sub">The whole operation on one screen · refreshes every 30s</p>
      <div className="statusrail">
        <span className={`beacon ${healthy ? '' : 'down'}`}><span className="dot" />{healthy ? 'ALL SYSTEMS NOMINAL' : 'ATTENTION REQUIRED'}</span>
        <span>SLT {new Date(Date.now() + (5.5 * 3600 + new Date().getTimezoneOffset() * 60) * 1000).toLocaleTimeString('en-GB')}</span>
        <span className="money">{fmtLKR(rev.estRevenueLKR)} <span className="muted">/30d est.</span></span>
        <span>{fmtNum(d.users?.total)} souls charted</span>
        <span className={d.jobs?.failed > 0 ? 'red' : ''}>{fmtNum(d.jobs?.failed ?? 0)} failed jobs</span>
      </div>
      <ErrorNote err={err} />

      <div className="grid cols-4">
        <Kpi label="Total users" value={fmtNum(d.users?.total)} tone="cyan" />
        <Kpi label="Active subscribers" value={fmtNum(d.users?.subscribers)} tone="green" />
        <Kpi label="Est. revenue (30d)" value={fmtLKR(rev.estRevenueLKR)} tone="gold" sub="from purchase events" />
        <Kpi label="AI cost today" value={todayCost != null ? fmtLKR(todayCost) : '—'} tone="violet" />
      </div>

      <div className="grid cols-4" style={{ marginTop: 14 }}>
        <Kpi label="Jobs queued" value={fmtNum(d.jobs?.queued)} tone={d.jobs?.queued > 5 ? 'gold' : ''} />
        <Kpi label="Running" value={fmtNum(d.jobs?.running)} />
        <Kpi label="Failed" value={fmtNum(d.jobs?.failed)} tone={d.jobs?.failed > 0 ? 'red' : 'green'} />
        <Kpi
          label="AI health"
          value={d.aiHealth ? (d.aiHealth.healthy === false ? 'DEGRADED' : 'OK') : '—'}
          tone={d.aiHealth?.healthy === false ? 'red' : 'green'}
          sub={d.circuit?.open ? '⚠ Firestore circuit OPEN' : 'Firestore circuit closed'}
        />
      </div>

      <Section title="AI spend — last 30 days (LKR)">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chart}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" stroke="#8b84b8" fontSize={10.5} tickLine={false} axisLine={false} />
            <YAxis stroke="#8b84b8" fontSize={10.5} tickLine={false} axisLine={false} width={44} />
            <Tooltip {...tt} />
            <Area type="monotone" dataKey="cost" stroke="#a78bfa" strokeWidth={2} fill="url(#g1)" />
          </AreaChart>
        </ResponsiveContainer>
      </Section>

      <div className="grid cols-2">
        <Section title="Purchase events — 30 days">
          {Object.keys(rev.events || {}).length === 0 && <span className="muted">No events yet</span>}
          <div className="row" style={{ gap: 8 }}>
            {Object.entries(rev.events || {}).map(([k, v]) => (
              <span key={k} className="badge b-violet">{k}: {v}</span>
            ))}
          </div>
        </Section>
        <Section title="Recent server errors">
          {(d.recentErrors || []).length === 0
            ? <Badge tone="b-green">clean — no recent errors</Badge>
            : <div className="console" style={{ maxHeight: 180 }}>{(d.recentErrors || []).map((l, i) => <div key={i} className="err">{l}</div>)}</div>}
        </Section>
      </div>
    </>
  );
}
