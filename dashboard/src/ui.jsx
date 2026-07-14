import React, { useEffect, useRef, useState } from 'react';
import { api } from './api';

/** Poll an admin endpoint every `ms` (default 30s). */
export function useApi(path, ms = 30000) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef();
  const load = async () => {
    try { setData(await api(path)); setErr(null); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    setLoading(true); load();
    timer.current = setInterval(load, ms);
    return () => clearInterval(timer.current);
  }, [path]);
  return { data, err, loading, reload: load };
}

export const Kpi = ({ label, value, tone = '', sub }) => (
  <div className="card kpi">
    <div className={`val ${tone}`}>{value ?? '—'}</div>
    <div className="lbl">{label}</div>
    {sub ? <div className="delta muted">{sub}</div> : null}
  </div>
);

export const Section = ({ title, right, children }) => (
  <div className="card" style={{ marginTop: 14 }}>
    <div className="row spread" style={{ marginBottom: 4 }}>
      <h3>{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

export const Table = ({ cols, rows }) => (
  <div className="wrap">
    <table className="tbl">
      <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={cols.length} className="muted">Nothing here</td></tr>}
        {rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}
      </tbody>
    </table>
  </div>
);

const TONES = { active: 'b-green', completed: 'b-green', queued: 'b-gold', processing: 'b-violet', failed: 'b-red', cancelled: 'b-muted', expired: 'b-muted' };
export const Badge = ({ children, tone }) => (
  <span className={`badge ${tone || TONES[String(children).toLowerCase()] || 'b-muted'}`}>{String(children)}</span>
);

export function Confirm({ title, message, danger, onConfirm, onClose, children }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        {children}
        {error && <p className="red">{error}</p>}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button
            className={`btn ${danger ? 'danger' : ''}`}
            disabled={busy}
            onClick={async () => {
              setBusy(true); setError(null);
              try { await onConfirm(); onClose(true); }
              catch (e) { setError(e.message); setBusy(false); }
            }}
          >{busy ? 'Working…' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}

export const ErrorNote = ({ err }) => (err ? <div className="card" style={{ borderColor: 'rgba(248,113,113,.4)', marginTop: 14 }}><span className="red">⚠ {err}</span></div> : null);
export const Loading = () => <div className="muted" style={{ padding: 30 }}><span className="spin">☾</span>&nbsp; consulting the heavens…</div>;
