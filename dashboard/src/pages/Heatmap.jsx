import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useApi, Section, Table, Badge, ErrorNote, Loading, Kpi } from '../ui';
import { fmtNum } from '../api';

const tt = { contentStyle: { background: '#0d0b2e', border: '1px solid rgba(139,122,216,.3)', borderRadius: 10, fontSize: 12 } };
const secs = (ms) => (ms == null ? '—' : ms >= 60000 ? `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s` : `${(ms / 1000).toFixed(1)}s`);
// exit rate 0 → green (sticky), 1 → red (they bail here)
const heat = (rate) => `hsl(${Math.round(150 * (1 - rate))}, 62%, 42%)`;

export default function Heatmap() {
  const [days, setDays] = useState(14);
  const { data, err, loading } = useApi(`/heatmap?days=${days}`, 60000);
  if (loading && !data) return <Loading />;

  const screens = data?.screens || [];
  const maxViews = data?.maxViews || 1;
  const dropoff = [...screens].filter((s) => s.views >= 5).sort((a, b) => b.exitRate - a.exitRate);
  const timeChart = [...screens].sort((a, b) => b.avgMs - a.avgMs).slice(0, 12).map((s) => ({ screen: s.screen, sec: +(s.avgMs / 1000).toFixed(1) }));

  return (
    <>
      <h1 className="page-title">Behavior Heatmap</h1>
      <p className="page-sub">Where users spend time and where they lose interest · screen engagement + drop-off</p>
      <div className="row" style={{ marginBottom: 12 }}>
        {[7, 14, 30].map((d) => <button key={d} className={`btn sm ${days === d ? '' : 'ghost'}`} onClick={() => setDays(d)}>{d}d</button>)}
        <span className="muted" style={{ fontSize: 11.5 }}>{data?.daysWithData || 0} day(s) with data · {fmtNum(data?.totalViews)} screen views</span>
      </div>
      <ErrorNote err={err} />

      {screens.length === 0 ? (
        <Section title="No screen data yet">
          <p className="muted" style={{ fontSize: 12.5 }}>
            The app isn't sending screen events yet. Once the mobile build that calls
            <span className="mono"> POST /api/analytics/screens</span> ships, tiles appear here automatically —
            colored <span className="green">green where users stay</span> and <span className="red">red where they drop off</span>.
          </p>
        </Section>
      ) : (
        <>
          <Section title="Screen heatmap — tile size = traffic, color = drop-off (red = they leave)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {screens.map((s) => {
                const w = 96 + Math.round(150 * (s.views / maxViews));
                return (
                  <div key={s.screen} title={`${s.screen}\n${s.views} views · avg ${secs(s.avgMs)} · ${Math.round(s.exitRate * 100)}% exit`}
                    style={{ width: w, minHeight: 66, borderRadius: 10, padding: '9px 11px', background: heat(s.exitRate), color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.screen}</div>
                    <div style={{ fontSize: 10.5, opacity: 0.92, fontFamily: 'var(--mono)' }}>{fmtNum(s.views)} · {secs(s.avgMs)} · {Math.round(s.exitRate * 100)}% exit</div>
                  </div>
                );
              })}
            </div>
            <div className="row" style={{ marginTop: 12, gap: 14, fontSize: 11 }}>
              <span className="muted">drop-off:</span>
              <span className="row" style={{ gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: heat(0.05), display: 'inline-block' }} /> sticky</span>
              <span className="row" style={{ gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: heat(0.5), display: 'inline-block' }} /> mixed</span>
              <span className="row" style={{ gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: heat(0.95), display: 'inline-block' }} /> they leave</span>
            </div>
          </Section>

          <div className="grid cols-2">
            <Section title="⚠ Where they lose interest (highest exit rate, ≥5 views)">
              <Table cols={['Screen', 'Views', 'Avg time', 'Exit rate']} rows={dropoff.slice(0, 12).map((s) => [
                <span className="mono">{s.screen}</span>, fmtNum(s.views), secs(s.avgMs),
                <Badge tone={s.exitRate > 0.6 ? 'b-red' : s.exitRate > 0.35 ? 'b-gold' : 'b-green'}>{Math.round(s.exitRate * 100)}%</Badge>,
              ])} />
            </Section>
            <Section title="Most engaging (avg time on screen)">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={timeChart} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" stroke="#8b84b8" fontSize={10} tickLine={false} axisLine={false} unit="s" />
                  <YAxis type="category" dataKey="screen" stroke="#8b84b8" fontSize={10} width={90} tickLine={false} axisLine={false} />
                  <Tooltip {...tt} cursor={{ fill: 'rgba(139,92,246,.08)' }} />
                  <Bar dataKey="sec" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </div>
        </>
      )}
    </>
  );
}
