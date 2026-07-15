import React, { useState } from 'react';
import { Section, Table, Badge, Confirm, ErrorNote } from '../ui';
import { api, ago, fmtNum } from '../api';

export default function Users() {
  const [q, setQ] = useState('');
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState(null); // {kind, uid, label, body?, path, method}

  const search = async () => {
    if (!q.trim()) return;
    setBusy(true); setErr(null);
    try { setResult(await api(`/users/lookup?q=${encodeURIComponent(q.trim())}`)); }
    catch (e) { setErr(e.message); setResult(null); }
    finally { setBusy(false); }
  };

  const refresh = () => search();

  return (
    <>
      <h1 className="page-title">Users</h1>
      <p className="page-sub">Look up any user by email or UID — entitlements, credits, fair-use, god actions</p>
      <div className="row">
        <input className="input" style={{ flex: 1, maxWidth: 420 }} placeholder="email@example.com or uid…"
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button className="btn" onClick={search} disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
      </div>
      <ErrorNote err={err} />

      {result && result.users.length === 0 && <Section title="Result"><span className="muted">No user found.</span></Section>}

      {(result?.users || []).map((u) => {
        const p = u.profile || {};
        const sub = p.subscription || {};
        return (
          <Section key={u.uid} title={<span className="mono">{u.uid}</span>}>
            <div className="grid cols-4" style={{ marginBottom: 12 }}>
              <div><div className="muted" style={{ fontSize: 11 }}>Email</div>{p.email || '—'}</div>
              <div><div className="muted" style={{ fontSize: 11 }}>Name</div>{p.name || p.displayName || '—'}</div>
              <div><div className="muted" style={{ fontSize: 11 }}>Pro</div>{p.isSubscribed ? <Badge tone="b-green">active · {sub.plan || sub.store || ''}</Badge> : <Badge tone="b-muted">free</Badge>}</div>
              <div><div className="muted" style={{ fontSize: 11 }}>Reports</div>{fmtNum(u.reportCount)}</div>
            </div>

            <h3 style={{ marginTop: 8 }}>Credits</h3>
            <Table
              cols={['Type', 'Created', 'Status', 'Source']}
              rows={(u.credits || []).map((c) => [
                <Badge tone="b-gold">{c.type}</Badge>,
                <span title={c.createdAt}>{ago(c.createdAt)}</span>,
                c.consumedAt ? `used ${ago(c.consumedAt)}` : <Badge tone="b-green">available</Badge>,
                c.source || '—',
              ])}
            />

            {Object.keys(u.fairUse || {}).length > 0 && (
              <>
                <h3 style={{ marginTop: 14 }}>Fair-use this month</h3>
                <div className="row">
                  {Object.entries(u.fairUse).map(([f, v]) => <span key={f} className="badge b-violet">{f}: {v.count}</span>)}
                </div>
              </>
            )}

            <h3 style={{ marginTop: 16 }}>God actions</h3>
            <div className="row">
              <button className="btn sm" onClick={() => setAction({ uid: u.uid, label: 'Grant FULL REPORT credit', path: `/users/${u.uid}/credits`, body: { productId: 'full_report', reason: 'admin grant' } })}>+ Report credit</button>
              <button className="btn sm" onClick={() => setAction({ uid: u.uid, label: 'Grant BABY KENDARA credit', path: `/users/${u.uid}/credits`, body: { productId: 'baby_kendara', reason: 'admin grant' } })}>+ Baby credit</button>
              <button className="btn sm" onClick={() => setAction({ uid: u.uid, label: 'Grant PORONDAM credit', path: `/users/${u.uid}/credits`, body: { productId: 'porondam_check', reason: 'admin grant' } })}>+ Porondam credit</button>
              {p.isSubscribed
                ? <button className="btn sm danger" onClick={() => setAction({ uid: u.uid, label: 'REVOKE Pro', danger: true, path: `/users/${u.uid}/pro`, body: { action: 'revoke' } })}>Revoke Pro</button>
                : <button className="btn sm" onClick={() => setAction({ uid: u.uid, label: 'Grant Pro (30 days)', path: `/users/${u.uid}/pro`, body: { action: 'grant', days: 30 } })}>Grant Pro 30d</button>}
              <button className="btn sm" onClick={() => setAction({ uid: u.uid, label: 'Sync LIVE from RevenueCat (authoritative)', path: `/users/${u.uid}/reconcile-revenuecat`, body: {} })}>⚡ Sync live (RevenueCat)</button>
              <button className="btn sm ghost" onClick={() => setAction({ uid: u.uid, label: 'Reconcile from stored webhook history', path: `/users/${u.uid}/reconcile-subscription`, body: {} })}>↻ Replay history</button>
              <button className="btn sm ghost" onClick={() => setAction({ uid: u.uid, label: 'Reset fair-use counters', path: `/users/${u.uid}/fairuse/reset`, body: {} })}>Reset fair-use</button>
            </div>
          </Section>
        );
      })}

      {action && (
        <Confirm
          title={action.label}
          message={`Target: ${action.uid}. This action is audited.`}
          danger={action.danger}
          onConfirm={async () => {
            const r = await api(action.path, { method: 'POST', body: action.body });
            if (r && r.applied === false) alert('No change: ' + (r.reason || 'nothing to reconcile'));
            else if (r && r.applied === true) alert(`Reconciled from ${r.eventsFound} event(s) → isSubscribed=${r.after.isSubscribed} (${r.after.status})`);
            refresh();
          }}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}
