import React, { useState } from 'react';
import { useApi, Section, Table, Badge, Confirm, ErrorNote, Loading, Kpi } from '../ui';
import { api, ago, fmtNum } from '../api';

export default function Jobs() {
  const [status, setStatus] = useState('');
  const { data, err, loading, reload } = useApi(`/jobs?limit=60${status ? `&status=${status}` : ''}`, 20000);
  const [action, setAction] = useState(null); // {type:'retry'|'cancel', job}
  if (loading && !data) return <Loading />;
  const counts = data?.counts || {};

  return (
    <>
      <h1 className="page-title">Jobs & Workers</h1>
      <p className="page-sub">Durable report queue · refreshes every 20s</p>
      <ErrorNote err={err} />

      <div className="grid cols-4">
        <Kpi label="Queued" value={fmtNum(counts.queued)} tone="gold" />
        <Kpi label="Running" value={fmtNum(counts.running)} tone="violet" />
        <Kpi label="Complete" value={fmtNum(counts.complete)} tone="green" />
        <Kpi label="Failed" value={fmtNum(counts.failed)} tone={counts.failed > 0 ? 'red' : ''} />
      </div>

      <Section
        title="Jobs"
        right={
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All (recent)</option>
            {['queued', 'running', 'complete', 'failed', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        }
      >
        <Table
          cols={['Job', 'Type', 'Status', 'Attempts', 'Updated', 'Error', '']}
          rows={(data?.jobs || []).map((j) => {
            const errText = j.error ? (typeof j.error === 'object' ? (j.error.message || JSON.stringify(j.error)) : String(j.error)) : '';
            return [
              <span className="mono" title={j.id}>{j.id.slice(0, 26)}…</span>,
              j.type,
              <span className="row" style={{ gap: 4 }}>
                <Badge>{j.status}</Badge>
                {j.stale && <Badge tone="b-red">stuck — worker died</Badge>}
              </span>,
              `${j.attempts}/${j.maxAttempts}`,
              <span title={j.updatedAt}>{ago(j.updatedAt)}</span>,
              errText ? <span className="red" title={errText}>{errText.slice(0, 60)}</span> : '—',
              <span className="row" style={{ gap: 6 }}>
                {(['failed', 'cancelled'].includes(j.status) || j.stale) && <button className="btn sm" onClick={() => setAction({ type: 'retry', job: j })}>Retry</button>}
                {(j.status === 'queued' || (j.status === 'running' && !j.stale)) && <button className="btn sm danger" onClick={() => setAction({ type: 'cancel', job: j })}>Cancel</button>}
              </span>,
            ];
          })}
        />
      </Section>

      {action && (
        <Confirm
          title={`${action.type === 'retry' ? 'Retry' : 'Cancel'} job?`}
          message={`${action.job.id} (${action.job.type}) — this is audited.`}
          danger={action.type === 'cancel'}
          onConfirm={async () => { await api(`/jobs/${action.job.id}/${action.type}`, { method: 'POST' }); reload(); }}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}
