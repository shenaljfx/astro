import React, { useEffect, useState } from 'react';
import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { watchAuth, signIn, signOut } from './firebase';
import { api } from './api';
import Overview from './pages/Overview';
import Money from './pages/Money';
import Costs from './pages/Costs';
import Jobs from './pages/Jobs';
import Users from './pages/Users';
import Logs from './pages/Logs';
import Health from './pages/Health';
import Funnel from './pages/Funnel';
import Controls from './pages/Controls';
import Audit from './pages/Audit';
import Fulfillment from './pages/Fulfillment';

const NAV = [
  ['/', '✦', 'Overview'],
  ['/money', '◈', 'Money'],
  ['/costs', '◉', 'AI Costs'],
  ['/jobs', '⚙', 'Jobs & Workers'],
  ['/fulfillment', '✉', 'Fulfillment'],
  ['/users', '☺', 'Users'],
  ['/logs', '≡', 'Server Logs'],
  ['/health', '♥', 'Health'],
  ['/funnel', '◇', 'Funnel'],
  ['/controls', '⌘', 'God Controls'],
  ['/audit', '§', 'Audit Trail'],
];

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = booting
  const [authorized, setAuthorized] = useState(null); // null = checking
  const [menu, setMenu] = useState(false);

  useEffect(() => watchAuth(async (u) => {
    setUser(u || null);
    if (!u) return setAuthorized(null);
    try { await api('/health'); setAuthorized(true); }
    catch (e) { setAuthorized(false); }
  }), []);

  if (user === undefined) return <div className="login"><div className="box"><div className="orb spin">☾</div></div></div>;

  if (!user || authorized === false) {
    return (
      <div className="login">
        <div className="box card">
          <img src="/logo.png" alt="Grahachara" />
          <h1>Grahachara Mission Control</h1>
          <p>{authorized === false
            ? `Signed in as ${user.email} — this account is not authorized. Access denied and logged.`
            : 'Restricted area. Sign in with the owner account.'}</p>
          {authorized === false
            ? <button className="btn ghost" onClick={() => signOut()}>Sign out</button>
            : <button className="btn" onClick={() => signIn().catch((e) => alert(e.message))}>Continue with Google</button>}
        </div>
      </div>
    );
  }

  if (authorized === null) return <div className="login"><div className="box"><div className="orb spin">☾</div><p className="muted">verifying clearance…</p></div></div>;

  return (
    <div className="shell">
      <aside className={`side ${menu ? 'open' : ''}`}>
        <div className="brand">
          <img src="/logo.png" alt="" />
          <div><div className="name">Grahachara</div><div className="sub">Mission·Ctrl</div></div>
        </div>
        {NAV.map(([to, icon, label]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setMenu(false)}>
            <span>{icon}</span> {label}
          </NavLink>
        ))}
        <div className="foot">
          <div>{user.email}</div>
          <a onClick={() => signOut()} style={{ cursor: 'pointer' }}>Sign out</a>
        </div>
      </aside>
      <main className="main">
        <button className="btn ghost sm menu-btn" onClick={() => setMenu(!menu)} style={{ marginBottom: 12 }}>☰ Menu</button>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/money" element={<Money />} />
          <Route path="/costs" element={<Costs />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/fulfillment" element={<Fulfillment />} />
          <Route path="/users" element={<Users />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/health" element={<Health />} />
          <Route path="/funnel" element={<Funnel />} />
          <Route path="/controls" element={<Controls />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
