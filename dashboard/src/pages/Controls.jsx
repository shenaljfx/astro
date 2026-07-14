import React, { useState } from 'react';
import { useApi, Section, Confirm, ErrorNote, Loading, Badge } from '../ui';
import { api } from '../api';

export default function Controls() {
  const { data, err, loading, reload } = useApi('/flags', 30000);
  const [confirm, setConfirm] = useState(null); // {title,message,danger,run,children?}
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [flagKey, setFlagKey] = useState('');
  const [flagVal, setFlagVal] = useState('');
  if (loading && !data) return <Loading />;
  const flags = data?.flags || {};
  const kill = flags.aiKillSwitch === true;

  return (
    <>
      <h1 className="page-title">God Controls</h1>
      <p className="page-sub">Every action here is confirmed and written to the audit trail</p>
      <ErrorNote err={err} />

      <Section title="AI kill switch">
        <div className="row spread">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{kill ? <span className="red">⛔ AI generation PAUSED</span> : <span className="green">✅ AI generation running</span>}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Instantly {kill ? 'resume' : 'pause'} all Gemini spend (reports, chat, readings). Takes effect within 60s.</div>
          </div>
          <button
            className={`btn ${kill ? '' : 'danger'}`}
            onClick={() => setConfirm({
              title: kill ? 'Resume AI generation?' : 'PAUSE all AI generation?',
              message: kill ? 'Users will be able to generate reports again.' : 'All AI features will return a maintenance message until resumed.',
              danger: !kill,
              run: async () => { await api('/flags', { method: 'POST', body: { aiKillSwitch: !kill } }); reload(); },
            })}
          >{kill ? 'Resume AI' : 'Pause AI'}</button>
        </div>
      </Section>

      <Section title="Push broadcast — all devices">
        <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <input className="input" placeholder="Title (e.g. අද විශේෂ නකතක්!)" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} maxLength={120} />
          <textarea className="input" placeholder="Body…" rows={3} value={pushBody} onChange={(e) => setPushBody(e.target.value)} maxLength={400} />
          <div className="row spread">
            <span className="muted" style={{ fontSize: 11.5 }}>Sends to every active push token. Cannot be recalled.</span>
            <button
              className="btn danger"
              disabled={!pushTitle.trim() || !pushBody.trim()}
              onClick={() => setConfirm({
                title: 'Broadcast to ALL users?',
                message: `"${pushTitle}" — this notification goes to every device with push enabled and cannot be recalled.`,
                danger: true,
                run: async () => {
                  const r = await api('/push/broadcast', { method: 'POST', body: { title: pushTitle.trim(), body: pushBody.trim(), confirm: 'SEND' } });
                  setPushTitle(''); setPushBody('');
                  alert(`Sent to ${r.sentTo} devices`);
                },
              })}
            >Broadcast</button>
          </div>
        </div>
      </Section>

      <Section title="Feature flags (config/adminFlags)">
        <div className="row" style={{ marginBottom: 12 }}>
          {Object.entries(flags).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
            <span key={k} className={`badge ${v === true ? 'b-green' : v === false ? 'b-muted' : 'b-violet'}`}>{k}: {String(v)}</span>
          ))}
          {Object.keys(flags).filter((k) => !k.startsWith('_')).length === 0 && <span className="muted">No flags set</span>}
        </div>
        <div className="row">
          <input className="input" placeholder="flag key" value={flagKey} onChange={(e) => setFlagKey(e.target.value)} style={{ width: 180 }} />
          <input className="input" placeholder="value (true/false/text/number)" value={flagVal} onChange={(e) => setFlagVal(e.target.value)} style={{ width: 220 }} />
          <button
            className="btn sm"
            disabled={!flagKey.trim()}
            onClick={() => {
              const raw = flagVal.trim();
              const val = raw === 'true' ? true : raw === 'false' ? false : raw !== '' && !isNaN(Number(raw)) ? Number(raw) : raw;
              setConfirm({
                title: `Set flag ${flagKey}?`,
                message: `config/adminFlags.${flagKey} = ${JSON.stringify(val)}`,
                run: async () => { await api('/flags', { method: 'POST', body: { [flagKey.trim()]: val } }); setFlagKey(''); setFlagVal(''); reload(); },
              });
            }}
          >Set flag</button>
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
          aiKillSwitch is enforced by the server today; other flags are stored for future app integration.
        </p>
      </Section>

      {confirm && (
        <Confirm title={confirm.title} message={confirm.message} danger={confirm.danger}
          onConfirm={confirm.run} onClose={() => setConfirm(null)} />
      )}
    </>
  );
}
