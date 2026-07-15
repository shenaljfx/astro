import React, { useState } from 'react';
import { useApi, Section, Table, Badge, Confirm, ErrorNote, Loading } from '../ui';
import { api } from '../api';

export default function Config() {
  const { data, err, loading, reload } = useApi('/config', 0); // no auto-poll — form page
  const [edits, setEdits] = useState({});
  const [save, setSave] = useState(null);
  if (loading && !data) return <Loading />;

  const schema = data?.schema || {};
  const eff = data?.effective || {};
  const groups = {};
  Object.entries(schema).forEach(([k, s]) => { (groups[s.group] = groups[s.group] || []).push([k, s]); });

  const pending = Object.entries(edits).filter(([k, v]) => String(v) !== String(eff[k]?.value ?? ''));

  return (
    <>
      <h1 className="page-title">Config &amp; Env</h1>
      <p className="page-sub">
        Live operational settings (apply instantly, no restart) + a read-only view of what's set on the VM.
        Secrets stay on the server — they're shown masked and can't be edited here.
      </p>
      <ErrorNote err={err} />

      {Object.entries(groups).map(([group, keys]) => (
        <Section key={group} title={group}>
          <Table
            cols={['Setting', 'Effective', 'Source', 'New value', '']}
            rows={keys.map(([key, s]) => {
              const cur = eff[key] || {};
              const draft = edits[key] ?? '';
              const changed = draft !== '' && String(draft) !== String(cur.value ?? '');
              return [
                <span title={s.help}>{key}<div className="muted" style={{ fontSize: 10.5 }}>{s.help}</div></span>,
                <span className="mono">{cur.value ?? '—'}</span>,
                <Badge tone={cur.overridden ? 'b-gold' : 'b-muted'}>{cur.source}</Badge>,
                <input className="input" style={{ width: 130 }} type="number" min={s.min} max={s.max}
                  placeholder={String(cur.value ?? '')} value={draft}
                  onChange={(e) => setEdits((p) => ({ ...p, [key]: e.target.value }))} />,
                <span className="row" style={{ gap: 6 }}>
                  {changed && <button className="btn sm" onClick={() => setSave({ [key]: Number(draft) })}>Save</button>}
                  {cur.overridden && <button className="btn sm ghost" onClick={() => setSave({ [key]: null })}>Reset</button>}
                </span>,
              ];
            })}
          />
        </Section>
      ))}

      <Section title="Environment on the VM (read-only, secrets masked)">
        <Table
          cols={['Key', 'Value', 'Type']}
          rows={(data?.env || []).map((e) => [
            <span className="mono">{e.key}</span>,
            <span className={`mono ${e.set ? '' : 'muted'}`}>{e.display}{e.secret && e.set ? <span className="muted"> · {e.length} chars</span> : ''}</span>,
            e.secret ? <Badge tone="b-red">secret</Badge> : e.editable ? <Badge tone="b-gold">editable above</Badge> : <Badge tone="b-muted">config</Badge>,
          ])}
        />
        <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
          {data?.note}
        </p>
      </Section>

      {save && (
        <Confirm
          title={Object.values(save)[0] === null ? 'Reset to env default?' : 'Apply live?'}
          message={`${Object.keys(save)[0]} → ${Object.values(save)[0] === null ? '(env default)' : Object.values(save)[0]}. Takes effect within ~30s across server + worker. Audited.`}
          onConfirm={async () => { await api('/config', { method: 'POST', body: { patch: save } }); setEdits({}); reload(); }}
          onClose={() => setSave(null)}
        />
      )}
    </>
  );
}
