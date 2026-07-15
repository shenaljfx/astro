import React, { useEffect, useState } from 'react';
import { Section, Table, Badge, Confirm, ErrorNote, Loading, Kpi } from '../ui';
import { api, ago, fmtNum } from '../api';

const shortDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');

function Avatar({ url, name }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (url) return <img src={url} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />;
  return <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(139,92,246,.22)', color: 'var(--brand-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{initial}</span>;
}

/* ── Full detail panel + god actions (loads by uid) ──────────────── */
function UserDetail({ uid, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [action, setAction] = useState(null);

  const load = async () => {
    try { const r = await api(`/users/lookup?q=${encodeURIComponent(uid)}`); setData(r.users && r.users[0] ? r.users[0] : null); setErr(null); }
    catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, [uid]);

  const u = data;
  const p = (u && u.profile) || {};
  const sub = p.subscription || {};

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ width: 'min(680px, 94vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="row spread">
          <div className="row" style={{ gap: 10 }}>
            <Avatar url={p.photoURL} name={p.displayName || p.email} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{p.displayName || p.name || 'Unknown'}</div>
              <div className="muted mono" style={{ fontSize: 11 }}>{p.email || '—'}</div>
            </div>
          </div>
          <button className="btn ghost sm" onClick={onClose}>✕ Close</button>
        </div>
        <ErrorNote err={err} />
        {!u && !err && <Loading />}

        {u && (
          <>
            <div className="grid cols-4" style={{ marginTop: 14 }}>
              <div><div className="muted" style={{ fontSize: 10.5 }}>Pro</div>{p.isSubscribed ? <Badge tone="b-green">active</Badge> : <Badge tone="b-muted">free</Badge>}</div>
              <div><div className="muted" style={{ fontSize: 10.5 }}>Plan</div><span className="mono" style={{ fontSize: 11 }}>{sub.plan || '—'}</span></div>
              <div><div className="muted" style={{ fontSize: 10.5 }}>Reports</div>{fmtNum(u.reportCount)}</div>
              <div><div className="muted" style={{ fontSize: 10.5 }}>Joined</div>{shortDate(p.createdAt)}</div>
            </div>

            <div className="wrap" style={{ marginTop: 14 }}>
              <table className="tbl">
                <tbody>
                  <tr><td className="muted">UID</td><td className="mono">{u.uid}</td></tr>
                  <tr><td className="muted">Phone</td><td>{p.phone || '—'}</td></tr>
                  <tr><td className="muted">Language</td><td>{(p.preferences && p.preferences.language) || '—'}</td></tr>
                  <tr><td className="muted">Location</td><td>{(p.location && p.location.name) || '—'}</td></tr>
                  <tr><td className="muted">Birth data</td><td className="mono" style={{ fontSize: 10.5 }}>{p.birthData ? JSON.stringify(p.birthData).slice(0, 90) : '— not set'}</td></tr>
                  <tr><td className="muted">Onboarded</td><td>{p.onboardingComplete ? 'yes' : 'no'}</td></tr>
                  <tr><td className="muted">Subscription</td><td className="mono" style={{ fontSize: 10.5 }}>status={sub.status || '—'} · store={sub.store || '—'} · expires={sub.expiresAt ? shortDate(sub.expiresAt) : '—'}{sub.reconciledFrom ? ` · reconciled(${sub.reconciledFrom})` : ''}</td></tr>
                  <tr><td className="muted">Last active</td><td>{ago(p.updatedAt)}</td></tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ marginTop: 14 }}>Credits</h3>
            <Table cols={['Type', 'Created', 'Status', 'Source']} rows={(u.credits || []).map((c) => [
              <Badge tone="b-gold">{c.type}</Badge>, <span title={c.createdAt}>{ago(c.createdAt)}</span>,
              c.consumedAt ? `used ${ago(c.consumedAt)}` : <Badge tone="b-green">available</Badge>, c.source || '—',
            ])} />

            {Object.keys(u.fairUse || {}).length > 0 && (
              <div className="row" style={{ marginTop: 10 }}>
                {Object.entries(u.fairUse).map(([f, v]) => <span key={f} className="badge b-violet">{f}: {v.count}</span>)}
              </div>
            )}

            <h3 style={{ marginTop: 16 }}>God actions</h3>
            <div className="row">
              <button className="btn sm" onClick={() => setAction({ label: 'Grant FULL REPORT credit', path: `/users/${u.uid}/credits`, body: { productId: 'full_report', reason: 'admin grant' } })}>+ Report</button>
              <button className="btn sm" onClick={() => setAction({ label: 'Grant BABY credit', path: `/users/${u.uid}/credits`, body: { productId: 'baby_kendara', reason: 'admin grant' } })}>+ Baby</button>
              <button className="btn sm" onClick={() => setAction({ label: 'Grant PORONDAM credit', path: `/users/${u.uid}/credits`, body: { productId: 'porondam_check', reason: 'admin grant' } })}>+ Porondam</button>
              {p.isSubscribed
                ? <button className="btn sm danger" onClick={() => setAction({ label: 'REVOKE Pro', danger: true, path: `/users/${u.uid}/pro`, body: { action: 'revoke' } })}>Revoke Pro</button>
                : <button className="btn sm" onClick={() => setAction({ label: 'Grant Pro (30 days)', path: `/users/${u.uid}/pro`, body: { action: 'grant', days: 30 } })}>Grant Pro 30d</button>}
              <button className="btn sm" onClick={() => setAction({ label: 'Sync LIVE from RevenueCat', path: `/users/${u.uid}/reconcile-revenuecat`, body: {} })}>⚡ Sync live</button>
              <button className="btn sm ghost" onClick={() => setAction({ label: 'Replay stored webhook history', path: `/users/${u.uid}/reconcile-subscription`, body: {} })}>↻ Replay</button>
              <button className="btn sm ghost" onClick={() => setAction({ label: 'Reset fair-use counters', path: `/users/${u.uid}/fairuse/reset`, body: {} })}>Reset fair-use</button>
            </div>
          </>
        )}

        {action && (
          <Confirm
            title={action.label} message={`Target: ${uid}. Audited.`} danger={action.danger}
            onConfirm={async () => {
              const r = await api(action.path, { method: 'POST', body: action.body });
              if (r && r.applied === false) alert('No change: ' + (r.reason || 'nothing to do'));
              else if (r && r.applied === true) alert(`Done → isSubscribed=${r.after ? r.after.isSubscribed : '?'}`);
              load();
            }}
            onClose={() => setAction(null)}
          />
        )}
      </div>
    </div>
  );
}

/* ── Directory ───────────────────────────────────────────────────── */
export default function Users() {
  const [list, setList] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState(null); // uid open in detail
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('all'); // all | pro | free

  const loadPage = async (cur) => {
    setLoading(true);
    try {
      const r = await api(`/users?limit=50${cur ? `&cursor=${encodeURIComponent(cur)}` : ''}`);
      setList((prev) => (cur ? [...prev, ...r.users] : r.users));
      setCursor(r.nextCursor);
      if (r.counts) setCounts(r.counts);
      setErr(null);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadPage(null); }, []);

  const search = async () => {
    if (!q.trim()) return;
    try { const r = await api(`/users/lookup?q=${encodeURIComponent(q.trim())}`); if (r.users && r.users[0]) setSelected(r.users[0].uid); else alert('No user found'); }
    catch (e) { setErr(e.message); }
  };

  const visible = list.filter((u) => {
    if (chip === 'pro' && !u.isSubscribed) return false;
    if (chip === 'free' && u.isSubscribed) return false;
    if (q.trim() && !`${u.email || ''} ${u.displayName || ''}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <h1 className="page-title">Users</h1>
      <p className="page-sub">Full directory · newest first · click any row for full detail + god actions</p>

      {counts && (
        <div className="grid cols-4">
          <Kpi label="Total users" value={fmtNum(counts.total)} tone="cyan" />
          <Kpi label="Active subscribers" value={fmtNum(counts.subscribers)} tone="green" />
          <Kpi label="Onboarded" value={fmtNum(counts.onboarded)} />
          <Kpi label="Loaded rows" value={fmtNum(list.length)} sub={cursor ? 'more available' : 'all loaded'} />
        </div>
      )}

      <div className="row spread" style={{ margin: '16px 0 10px' }}>
        <div className="row">
          {['all', 'pro', 'free'].map((c) => (
            <button key={c} className={`btn sm ${chip === c ? '' : 'ghost'}`} onClick={() => setChip(c)}>{c === 'all' ? 'All' : c === 'pro' ? 'Pro' : 'Free'}</button>
          ))}
        </div>
        <div className="row">
          <input className="input" style={{ width: 260 }} placeholder="search email / uid…" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
          <button className="btn sm" onClick={search}>Search</button>
        </div>
      </div>
      <ErrorNote err={err} />

      <div className="card" style={{ padding: 0 }}>
        <div className="wrap" style={{ maxHeight: '64vh' }}>
          <table className="tbl">
            <thead><tr><th>User</th><th>Pro</th><th>Plan</th><th>Reports</th><th>Lang</th><th>Joined</th><th>Active</th></tr></thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.uid} style={{ cursor: 'pointer' }} onClick={() => setSelected(u.uid)}>
                  <td>
                    <span className="row" style={{ gap: 9 }}>
                      <Avatar url={u.photoURL} name={u.displayName || u.email} />
                      <span style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{u.displayName || 'Unknown'}</div>
                        <div className="muted mono" style={{ fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{u.email || u.uid}</div>
                      </span>
                    </span>
                  </td>
                  <td>{u.isSubscribed ? <Badge tone="b-green">pro</Badge> : <Badge tone="b-muted">free</Badge>}</td>
                  <td className="mono" style={{ fontSize: 10.5 }}>{(u.subscription && u.subscription.plan) || '—'}</td>
                  <td>{fmtNum(u.reportCount)}</td>
                  <td>{(u.preferences && u.preferences.language) || '—'}</td>
                  <td>{shortDate(u.createdAt)}</td>
                  <td className="muted">{ago(u.updatedAt)}</td>
                </tr>
              ))}
              {visible.length === 0 && !loading && <tr><td colSpan={7} className="muted">No users on this page match the filter</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="row" style={{ marginTop: 12, justifyContent: 'center' }}>
        {loading ? <span className="muted"><span className="spin">☾</span> loading…</span>
          : cursor ? <button className="btn ghost" onClick={() => loadPage(cursor)}>Load 50 more</button>
            : <span className="muted" style={{ fontSize: 11.5 }}>— end of list —</span>}
      </div>

      {selected && <UserDetail uid={selected} onClose={() => { setSelected(null); loadPage(null); }} />}
    </>
  );
}
