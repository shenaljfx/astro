import React from 'react';
import { useApi, Section, Table, Badge, ErrorNote, Loading } from '../ui';
import { ago, fmtLKR } from '../api';

export default function Money() {
  const { data, err, loading } = useApi('/purchases?limit=150', 60000);
  if (loading && !data) return <Loading />;
  const events = data?.events || [];
  const credits = data?.recentCredits || [];
  const price = data?.priceMapLKR || {};

  return (
    <>
      <h1 className="page-title">Money</h1>
      <p className="page-sub">
        RevenueCat webhook events + purchase credits. Authoritative totals live in{' '}
        <a href="https://app.revenuecat.com" target="_blank" rel="noreferrer">RevenueCat →</a>
      </p>
      <ErrorNote err={err} />

      <Section title={`Purchase events (${events.length})`}>
        <Table
          cols={['When', 'Type', 'User', 'Status', 'Est. value']}
          rows={events.map((e) => [
            <span title={e.receivedAt}>{ago(e.receivedAt)}</span>,
            <Badge tone={/PURCHASE|RENEWAL/.test(e.eventType || '') ? 'b-green' : /CANCEL|EXPIR|BILLING/.test(e.eventType || '') ? 'b-red' : 'b-muted'}>{e.eventType || '?'}</Badge>,
            <span className="mono">{(e.appUserId || '—').slice(0, 28)}</span>,
            e.status || '—',
            /PURCHASE|RENEWAL/.test(e.eventType || '') ? fmtLKR(price[e.productId] || price.subscription) : '—',
          ])}
        />
      </Section>

      <Section title="Recent purchase credits (one-time products)">
        <Table
          cols={['Created', 'Type', 'User', 'Consumed', 'Source']}
          rows={credits.map((c) => [
            <span title={c.createdAt}>{ago(c.createdAt)}</span>,
            <Badge tone="b-gold">{c.type || '?'}</Badge>,
            <span className="mono">{(c.uid || '—').slice(0, 28)}</span>,
            c.consumedAt ? <Badge tone="b-muted">used {ago(c.consumedAt)}</Badge> : <Badge tone="b-green">available</Badge>,
            c.source || c.productId || '—',
          ])}
        />
      </Section>
    </>
  );
}
