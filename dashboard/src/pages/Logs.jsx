import React, { useState } from 'react';
import { useApi, ErrorNote, Loading } from '../ui';

export default function Logs() {
  const [source, setSource] = useState('server');
  const [level, setLevel] = useState('');
  const [q, setQ] = useState('');
  const [qLive, setQLive] = useState('');
  const { data, err, loading, reload } = useApi(
    `/logs?source=${source}&lines=400${level ? `&level=${level}` : ''}${qLive ? `&q=${encodeURIComponent(qLive)}` : ''}`,
    15000
  );

  const cls = (l) => (l.includes('[ERROR]') ? 'err' : l.includes('[WARN]') ? 'warn' : 'ok');

  return (
    <>
      <h1 className="page-title">Server Logs</h1>
      <p className="page-sub">Tail of the {source} container log · refreshes every 15s</p>
      <div className="row" style={{ marginBottom: 12 }}>
        <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="server">API server</option>
          <option value="worker">Job worker</option>
        </select>
        <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">All levels</option>
          <option value="error">Errors</option>
          <option value="warn">Warnings</option>
        </select>
        <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="filter… (enter)"
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setQLive(q)} />
        <button className="btn ghost sm" onClick={reload}>↻ Refresh</button>
      </div>
      <ErrorNote err={err} />
      {loading && !data ? <Loading /> : (
        <div className="console">
          {(data?.lines || []).length === 0 && <span className="muted">No log lines (log file appears after the next deploy with the shared log volume).</span>}
          {(data?.lines || []).map((l, i) => <div key={i} className={cls(l)}>{l}</div>)}
        </div>
      )}
    </>
  );
}
