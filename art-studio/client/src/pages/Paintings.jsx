import { useState } from 'react';
import { api, money } from '../api.js';
import { Async, useLoad } from '../hooks.jsx';

function PaintingForm({ initial, submitLabel, onSubmit, onCancel }) {
  const submit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    onSubmit({ ...f, price: Number(f.price) });
  };
  const v = initial || {};
  return (
    <form className="card" onSubmit={submit}>
      <label>Title<input name="title" defaultValue={v.title} required /></label>
      <label>Artist<input name="artist" defaultValue={v.artist} /></label>
      <label>Description<input name="description" defaultValue={v.description} /></label>
      <label>Price (₹)<input name="price" type="number" min="1" step="1" defaultValue={v.price} required /></label>
      <button className="primary">{submitLabel}</button>{' '}
      {onCancel && <button type="button" onClick={onCancel}>Discard</button>}
    </form>
  );
}

export default function Paintings({ user, act }) {
  const state = useLoad(() => api('/paintings'));
  const [editing, setEditing] = useState(null);
  const isAdmin = user.role === 'admin';
  const done = () => { setEditing(null); state.reload(); };

  return (
    <>
      {isAdmin && !editing && (
        <details className="card"><summary>Add a painting</summary>
          <PaintingForm submitLabel="Add painting" onSubmit={(b) => act(() => api('/paintings', 'POST', b), 'Painting added', done)} />
        </details>
      )}
      {editing && (
        <PaintingForm initial={editing} submitLabel="Save changes" onCancel={() => setEditing(null)}
          onSubmit={(b) => act(() => api('/paintings/' + editing.id, 'PUT', b), 'Painting updated', done)} />
      )}
      <Async state={state} empty="No paintings yet.">
        {(list) => (
          <div className="grid">
            {list.map((p) => (
              <div className="card painting" key={p.id}>
                {p.imageUrl && <img src={p.imageUrl} alt={p.title} loading="lazy" />}
                <h3>{p.title}</h3>
                <div className="muted">{p.artist}</div>
                <p>{p.description}</p>
                <div className="row">
                  <b>{money(p.price)}</b>
                  <span className={'tag ' + p.status}>{p.status}</span>
                </div>
                {!isAdmin && p.status === 'available' && (
                  <button className="primary" onClick={() => act(() => api('/orders', 'POST', { paintingId: p.id }), 'Order placed', state.reload)}>Buy</button>
                )}
                {isAdmin && p.status === 'available' && <button onClick={() => setEditing(p)}>Edit</button>}
              </div>
            ))}
          </div>
        )}
      </Async>
    </>
  );
}
