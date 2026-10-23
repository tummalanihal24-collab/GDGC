import { useState } from 'react';
import { api, dateIn } from '../api.js';
import { Async, useLoad } from '../hooks.jsx';

function PotteryForm({ catalog, editing, act, onDone, onDiscard }) {
  const v = editing && { itemId: editing.item.id, glazeId: editing.glaze.id, quantity: editing.quantity, neededBy: editing.neededBy };
  const submit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const body = { ...f, quantity: Number(f.quantity) };
    act(() => (editing ? api('/pottery/' + editing.id, 'PUT', body) : api('/pottery', 'POST', body)),
      editing ? 'Request updated' : 'Request sent', onDone);
  };
  return (
    <form className="card" onSubmit={submit}>
      <h3>{editing ? 'Edit request' : 'Request custom pottery'}</h3>
      <label>Item<select name="itemId" defaultValue={v?.itemId}>{catalog.potteryItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
      <label>Glaze<select name="glazeId" defaultValue={v?.glazeId}>{catalog.glazes.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
      <label>Quantity (1–12)<input name="quantity" type="number" min="1" max="12" defaultValue={v?.quantity ?? 1} required /></label>
      <label>Needed by (at least 14 days away)<input name="neededBy" type="date" min={dateIn(14)} defaultValue={v?.neededBy} required /></label>
      <button className="primary">{editing ? 'Save' : 'Send request'}</button>{' '}
      {editing && <button type="button" onClick={onDiscard}>Discard</button>}
    </form>
  );
}

export default function Pottery({ user, catalog, act }) {
  const state = useLoad(() => api('/pottery'));
  const [editing, setEditing] = useState(null);
  const isAdmin = user.role === 'admin';
  const done = () => { setEditing(null); state.reload(); };
  const run = (path, ok) => act(() => api(path, 'POST'), ok, state.reload);

  return (
    <>
      {!isAdmin && <PotteryForm key={editing?.id || 'new'} catalog={catalog} editing={editing} act={act} onDone={done} onDiscard={() => setEditing(null)} />}
      <Async state={state} empty="No pottery requests yet.">
        {(list) => list.map((r) => (
          <div className="card" key={r.id}>
            <div className="row">
              <span>{r.quantity} × <b>{r.item?.name}</b>, {r.glaze?.name} — needed by {r.neededBy}</span>
              <span className={'tag ' + r.status}>{r.status}</span>
            </div>
            {r.user && <div className="muted">{r.user.name} ({r.user.email})</div>}
            {isAdmin && r.status === 'requested' && (
              <>
                <button className="primary" onClick={() => run(`/pottery/${r.id}/accept`, 'Request accepted')}>Accept</button>{' '}
                <button onClick={() => run(`/pottery/${r.id}/decline`, 'Request declined')}>Decline</button>
              </>
            )}
            {!isAdmin && r.status === 'requested' && (
              <>
                <button onClick={() => setEditing(r)}>Edit</button>{' '}
                <button onClick={() => run(`/pottery/${r.id}/cancel`, 'Request cancelled')}>Cancel</button>
              </>
            )}
          </div>
        ))}
      </Async>
    </>
  );
}
