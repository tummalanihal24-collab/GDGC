import { useEffect, useState } from 'react';
import { api, hasToken, setToken, setOnUnauthorized } from './api.js';
import Auth from './pages/Auth.jsx';
import Paintings from './pages/Paintings.jsx';
import Orders from './pages/Orders.jsx';
import Bookings from './pages/Bookings.jsx';
import Pottery from './pages/Pottery.jsx';

const TABS = { Paintings, Orders, 'Wall painting': Bookings, Pottery };

export default function App() {
  const [user, setUser] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [boot, setBoot] = useState(hasToken() ? 'loading' : 'ready');
  const [bootError, setBootError] = useState(null);
  const [tab, setTab] = useState('Paintings');
  const [msg, setMsg] = useState(null); // { text, kind }

  const logout = () => { setToken(null); setUser(null); setCatalog(null); setBoot('ready'); };
  useEffect(() => setOnUnauthorized(logout), []);

  const start = () => {
    setBoot('loading'); setBootError(null);
    Promise.all([api('/me'), api('/catalog')])
      .then(([u, c]) => { setUser(u); setCatalog(c); setBoot('ready'); })
      .catch((e) => { if (hasToken()) { setBootError(e.message); setBoot('error'); } else setBoot('ready'); });
  };
  useEffect(() => { if (hasToken()) start(); }, []);

  const onAuth = ({ token, user }) => {
    setToken(token); setMsg(null);
    api('/catalog').then((c) => { setCatalog(c); setUser(user); });
  };

  // Run an action, show its message (including refusals like "just sold"), then refresh.
  const act = async (fn, ok, done) => {
    try { await fn(); setMsg({ text: ok, kind: 'ok' }); } catch (e) { setMsg({ text: e.message, kind: 'error' }); }
    done?.();
  };

  if (boot === 'loading') return <div className="wrap"><p className="muted">Loading…</p></div>;
  if (boot === 'error') return <div className="wrap"><p className="error">Error: {bootError} <button onClick={start}>Retry</button></p></div>;
  if (!user) return <div className="wrap"><h1>Art Studio</h1><Auth onAuth={onAuth} /></div>;

  const Page = TABS[tab];
  return (
    <div className="wrap">
      <header>
        <h1>Art Studio</h1>
        <div>{user.name} <span className="tag">{user.role}</span> <button onClick={logout}>Log out</button></div>
      </header>
      <nav>
        {Object.keys(TABS).map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => { setTab(t); setMsg(null); }}>{t}</button>
        ))}
      </nav>
      {msg && <p className={msg.kind} role="status">{msg.text}</p>}
      <Page key={tab} user={user} catalog={catalog} act={act} />
    </div>
  );
}
