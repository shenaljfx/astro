import React from 'react';
import { useApi, Section, Table, Badge, ErrorNote, Loading } from '../ui';
import { ago } from '../api';

export default function Audit() {
  const { data, err, loading } = useApi('/audit?limit=200', 30000);
  if (loading && !data) return <Loading />;

  return (
    <>
      <h1 className="page-title">Audit Trail</h1>
      <p className="page-sub">Every god-mode mutation, forever on the record</p>
      <ErrorNote err={err} />
      <Section title={`Entries (${data?.entries?.length ?? 0})`}>
        <Table
          cols={['When', 'Action', 'Target', 'Details', 'By', 'IP']}
          rows={(data?.entries || []).map((e) => [
            <span title={e.at}>{ago(e.at)}</span>,
            <Badge tone={/kill|revoke|cancel|broadcast/i.test(e.action) ? 'b-red' : 'b-violet'}>{e.action}</Badge>,
            <span className="mono">{String(e.target || '—').slice(0, 30)}</span>,
            <span className="mono" style={{ fontSize: 10.5 }}>{JSON.stringify(e.details || {}).slice(0, 80)}</span>,
            e.by || '—',
            <span className="mono">{e.ip || '—'}</span>,
          ])}
        />
      </Section>
    </>
  );
}
