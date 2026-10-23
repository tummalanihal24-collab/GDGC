import { useState } from 'react';
import { api, dateIn, money } from '../api.js';
import { Async, useLoad } from '../hooks.jsx';

function BookingForm({ catalog, taken, act, onDone }) {
  const [date, setDate] = useState('');
  const [sqft, setSqft] = useState('');
  const price = sqft ? Number(sqft) * catalog.muralRatePerSqFt : null;
  const isTaken = taken.includes(date);
  const submit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    act(() => api('/bookings', 'POST', { ...f, wallSqft: Number(f.wallSqft) }), 'Booking requested', onDone);
  };
  return (
    <form className="card" onSubmit={submit}>
      <h3>Book a wall painting</h3>
      <label>Date (7–90 days from today)
        <input name="date" type="date" min={dateIn(7)} max={dateIn(90)} value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      {isTaken && <p className="error">That date is already taken. Please pick another.</p>}
      <label>Wall size in sq ft (10–500)
        <input name="wallSqft" type="number" min="10" max="500" value={sqft} onChange={(e) => setSqft(e.target.value)} required />
      </label>
      <label>Address<textarea name="address" required /></label>
      <p className="muted">Rate {money(catalog.muralRatePerSqFt)} / sq ft{price ? <> — estimated total <b>{money(price)}</b></> : null}</p>
      <button className="primary" disabled={isTaken}>Request booking</button>
    </form>
  );
}

export default function Bookings({ user, catalog, act }) {
  const state = useLoad(() => Promise.all([api('/bookings'), api('/bookings/taken-dates')]).then(([rows, taken]) => ({ rows, taken })));
  const isAdmin = user.role === 'admin';
  const run = (path, ok) => act(() => api(path, 'POST'), ok, state.reload);

  return (
    <Async state={state}>
      {({ rows, taken }) => (
        <>
          {!isAdmin && <BookingForm catalog={catalog} taken={taken} act={act} onDone={state.reload} />}
          {!rows.length && <p className="muted">No bookings yet.</p>}
          {rows.map((b) => (
            <div className="card" key={b.id}>
              <div className="row">
                <span><b>{b.date}</b> — {b.wallSqft} sq ft × {money(b.rate)} = <b>{money(b.price)}</b></span>
                <span className={'tag ' + b.status}>{b.status}</span>
              </div>
              <div className="muted">{b.address}{b.user ? ` · ${b.user.name} (${b.user.email})` : ''}</div>
              {isAdmin && b.status === 'requested' && (
                <>
                  <button className="primary" onClick={() => run(`/bookings/${b.id}/confirm`, 'Booking confirmed')}>Confirm</button>{' '}
                  <button onClick={() => run(`/bookings/${b.id}/decline`, 'Booking declined')}>Decline</button>
                </>
              )}
              {!isAdmin && ['requested', 'confirmed'].includes(b.status) && (
                <button onClick={() => run(`/bookings/${b.id}/cancel`, 'Booking cancelled')}>Cancel (until 3 days before)</button>
              )}
            </div>
          ))}
        </>
      )}
    </Async>
  );
}
