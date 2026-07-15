import React from 'react';
import { useApi, Kpi, Section, ErrorNote, Loading, Badge } from '../ui';
import { ago, fmtLKR } from '../api';

const mb = (b) => (b == null ? '—' : `${Math.round(b / 1048576)} MB`);
const upt = (s) => (s == null ? '—' : s > 86400 ? `${(s / 86400).toFixed(1)}d` : s > 3600 ? `${(s / 3600).toFixed(1)}h` : `${Math.round(s / 60)}m`);

export default function Health() {
  const { data, err, loading } = useApi('/health', 20000);
  if (loading && !data) return <Loading />;
  const d = data || {};
  const w = d.worker;
  const workerFresh = w && Date.now() - new Date(w.at).getTime() < 3 * 60 * 1000;

  return (
    <>
      <h1 className="page-title">Health</h1>
      <p className="page-sub">API server + worker container vitals · refreshes every 20s</p>
      <ErrorNote err={err} />

      <div className="grid cols-4">
        <Kpi label="API uptime" value={upt(d.server?.uptimeSec)} tone="green" sub={`node ${d.server?.node || ''}`} />
        <Kpi label="API memory (RSS)" value={mb(d.server?.memory?.rss)} tone={d.server?.memory?.rss > 400 * 1048576 ? 'red' : ''} sub="container limit 512 MB" />
        <Kpi label="Worker" value={w ? (workerFresh ? 'ALIVE' : 'STALE') : 'NO HEARTBEAT'} tone={workerFresh ? 'green' : 'red'} sub={w ? `beat ${ago(w.at)} · ${w.memoryRssMb} MB` : 'heartbeat appears after next deploy'} />
        <Kpi label="Firestore circuit" value={d.circuit?.open ? 'OPEN' : 'CLOSED'} tone={d.circuit?.open ? 'red' : 'green'} sub={d.circuit?.reason || ''} />
      </div>

      <div className="grid cols-4" style={{ marginTop: 14 }}>
        <Kpi label="Push devices (active tokens)" value={d.pushTokensActive ?? '—'} tone={d.pushTokensActive === 0 ? 'gold' : 'green'} sub={d.pushTokensActive === 0 ? 'broadcasts reach 0 until users enable push' : 'reachable by broadcast'} />
      </div>

      <div className="grid cols-2" style={{ marginTop: 14 }}>
        <Section title="AI health">
          <pre className="mono" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(d.aiHealth || {}, null, 2)}</pre>
        </Section>
        <Section title="AI budget spend today">
          {d.aiSpendToday
            ? <pre className="mono" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(d.aiSpendToday, null, 2)}</pre>
            : <span className="muted">No spend recorded today</span>}
        </Section>
      </div>
    </>
  );
}
