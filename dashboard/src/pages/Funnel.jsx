import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useApi, Section, Table, ErrorNote, Loading } from '../ui';

const tt = { contentStyle: { background: '#0d0b2e', border: '1px solid rgba(139,122,216,.3)', borderRadius: 10, fontSize: 12 } };
const COLORS = ['#8b5cf6', '#22d3ee', '#fbbf24', '#34d399', '#f87171', '#a78bfa'];

export default function Funnel() {
  const [days, setDays] = useState(14);
  const { data, err, loading } = useApi(`/funnel?days=${days}`, 60000);
  if (loading && !data) return <Loading />;
  const byEvent = data?.byEvent || {};
  const eventNames = Object.keys(byEvent);
  const chart = Object.entries(data?.byDay || {}).sort(([a], [b]) => a.localeCompare(b))
    .map(([day, ev]) => ({ day: day.slice(5), ...ev }));

  return (
    <>
      <h1 className="page-title">Funnel</h1>
      <p className="page-sub">Paywall analytics events — views → conversions</p>
      <div className="row" style={{ marginBottom: 12 }}>
        {[7, 14, 30].map((d) => (
          <button key={d} className={`btn sm ${days === d ? '' : 'ghost'}`} onClick={() => setDays(d)}>{d}d</button>
        ))}
      </div>
      <ErrorNote err={err} />

      <Section title={`Events by day (${data?.total ?? 0} total)`}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chart}>
            <XAxis dataKey="day" stroke="#8b84b8" fontSize={10.5} tickLine={false} axisLine={false} />
            <YAxis stroke="#8b84b8" fontSize={10.5} tickLine={false} axisLine={false} width={36} />
            <Tooltip {...tt} cursor={{ fill: 'rgba(139,92,246,.08)' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {eventNames.map((e, i) => <Bar key={e} dataKey={e} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === eventNames.length - 1 ? [3, 3, 0, 0] : 0} />)}
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <div className="grid cols-2">
        <Section title="Totals by event">
          <Table cols={['Event', 'Count']} rows={Object.entries(byEvent).sort(([, a], [, b]) => b - a).map(([k, v]) => [k, v])} />
        </Section>
        <Section title="By event · source">
          <Table cols={['Event :: Source', 'Count']} rows={Object.entries(data?.bySource || {}).sort(([, a], [, b]) => b - a).slice(0, 25).map(([k, v]) => [k, v])} />
        </Section>
      </div>
    </>
  );
}
