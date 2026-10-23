import { api, money } from '../api.js';
import { Async, useLoad } from '../hooks.jsx';

export default function Orders({ user, act }) {
  const state = useLoad(() => api('/orders'));
  return (
    <Async state={state} empty="No orders yet.">
      {(list) => list.map((o) => (
        <div className="card" key={o.id}>
          <div className="row">
            <span>{o.painting?.title} — <b>{money(o.price)}</b></span>
            <span className={'tag ' + o.status}>{o.status}</span>
          </div>
          {o.user && <div className="muted">by {o.user.name} ({o.user.email})</div>}
          {user.role === 'customer' && o.status === 'placed' && (
            <button onClick={() => act(() => api(`/orders/${o.id}/cancel`, 'POST'), 'Order cancelled', state.reload)}>Cancel order</button>
          )}
        </div>
      ))}
    </Async>
  );
}
