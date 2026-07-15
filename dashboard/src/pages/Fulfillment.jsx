import React, { useState } from 'react';
import { useApi, Section, Table, Badge, Confirm, ErrorNote, Loading } from '../ui';
import { api, ago } from '../api';

export default function Fulfillment() {
  const { data, err, loading, reload } = useApi('/failed-reports', 30000);
  const [payload, setPayload] = useState(null); // job being inspected
  const [retry, setRetry] = useState(null);
  if (loading && !data) return <Loading />;
  const failed = data?.failed || [];

  return (
    <>
      <h1 className="page-title">Fulfillment</h1>
      <p className="page-sub">Failed generations with customer contact — retry in-app, or generate manually and email the customer</p>
      <ErrorNote err={err} />

      <Section title={`Failed generations (${failed.length})`}>
        <Table
          cols={['Failed', 'Customer', 'Email', 'Type', 'Error', 'Attempts', '']}
          rows={failed.map((f) => [
            <span title={f.failedAt}>{ago(f.failedAt)}</span>,
            f.name || <span className="muted">unknown</span>,
            f.email
              ? <a href={`mailto:${f.email}?subject=${encodeURIComponent('Your Grahachara report')}`} className="mono">{f.email}</a>
              : <span className="muted">—</span>,
            <Badge tone="b-violet">{f.type}</Badge>,
            <span className="red" title={f.error || ''}>{String(f.error || '—').slice(0, 48)}</span>,
            `${f.attempts}/${f.maxAttempts}`,
            <span className="row" style={{ gap: 6 }}>
              <button className="btn sm" onClick={() => setRetry(f)}>Retry</button>
              <button className="btn sm ghost" onClick={() => setPayload(f)}>Birth data</button>
            </span>,
          ])}
        />
      </Section>

      {payload && (
        <div className="overlay" onClick={() => setPayload(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Input payload — {payload.id.slice(0, 30)}…</h3>
            <p>{payload.name || 'unknown'} · {payload.email || 'no email'} · everything needed to generate manually:</p>
            <pre>{JSON.stringify(payload.payload, null, 2)}</pre>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn ghost sm" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(payload.payload, null, 2)); }}>Copy JSON</button>
              <button className="btn sm" onClick={() => setPayload(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {retry && (
        <Confirm
          title="Retry this generation?"
          message={`${retry.type} for ${retry.name || retry.email || retry.uid || 'unknown'} — re-runs the job through the worker (costs one AI generation). Audited.`}
          onConfirm={async () => { await api(`/jobs/${retry.id}/retry`, { method: 'POST' }); reload(); }}
          onClose={() => setRetry(null)}
        />
      )}
    </>
  );
}
