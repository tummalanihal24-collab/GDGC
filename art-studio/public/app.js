const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let token = localStorage.getItem('token');
let user = null;
let catalog = null;

async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) { logout(); }
  if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
  return data;
}

function say(text, kind = 'ok') { $('#msg').className = kind; $('#msg').textContent = text; }
function logout() { token = null; user = null; localStorage.removeItem('token'); render(); }

// Every data screen goes through here: loading -> (error | empty | content).
async function screen(load, show, emptyText) {
  const view = $('#view');
  view.innerHTML = '<p class="muted">Loading…</p>';
  try {
    const data = await load();
    if (Array.isArray(data) && !data.length) view.innerHTML = `<p class="muted">${esc(emptyText)}</p>`;
    else show(data, view);
  } catch (e) {
    view.innerHTML = `<p class="error">Error: ${esc(e.message)} <button id="retry">Retry</button></p>`;
    $('#retry').onclick = () => screen(load, show, emptyText);
  }
}

// Run an action, show its message (including refusals), then reload the screen.
async function act(fn, okText, reload) {
  try { await fn(); say(okText, 'ok'); } catch (e) { say(e.message, 'error'); }
  reload();
}

const money = (n) => '$' + Number(n).toFixed(2);
const isoIn = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

// ---------- auth ----------
function authView() {
  $('#nav').innerHTML = '';
  $('#view').innerHTML = `
    <div class="card"><h3>Log in</h3>
      <form id="login"><label>Email<input name="email" type="email" required></label>
      <label>Password<input name="password" type="password" required></label><button>Log in</button></form></div>
    <div class="card"><h3>Sign up (customer)</h3>
      <form id="signup"><label>Name<input name="name" required></label>
      <label>Email<input name="email" type="email" required></label>
      <label>Password (6+ chars)<input name="password" type="password" minlength="6" required></label><button>Sign up</button></form></div>`;
  for (const [id, path] of [['login', '/auth/login'], ['signup', '/auth/signup']]) {
    $('#' + id).onsubmit = async (ev) => {
      ev.preventDefault();
      try {
        const r = await api(path, 'POST', Object.fromEntries(new FormData(ev.target)));
        token = r.token; localStorage.setItem('token', token); say('');
        render();
      } catch (e) { say(e.message, 'error'); }
    };
  }
}

// ---------- paintings ----------
function paintingsView() {
  const isAdmin = user.role === 'admin';
  const reload = paintingsView;
  screen(() => api('/paintings'), (list, view) => {
    view.innerHTML = (isAdmin ? addPaintingForm() : '') + list.map((p) => `
      <div class="card"><b>${esc(p.title)}</b> <span class="tag">${p.status}</span> — ${money(p.price)}
        <div class="muted">${esc(p.artist)} ${esc(p.description)}</div>
        ${!isAdmin && p.status === 'available' ? `<button data-buy="${p.id}">Buy</button>` : ''}
        ${isAdmin && p.status === 'available' ? `<button data-edit="${p.id}">Edit</button>` : ''}
      </div>`).join('');
    view.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () =>
      act(() => api('/orders', 'POST', { paintingId: Number(b.dataset.buy) }), 'Order placed', reload));
    view.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => {
      const p = list.find((x) => x.id == b.dataset.edit);
      const title = prompt('Title', p.title); if (title === null) return;
      const price = prompt('Price', p.price); if (price === null) return;
      act(() => api('/paintings/' + p.id, 'PUT', { ...p, title, price: Number(price) }), 'Painting updated', reload);
    });
    if (isAdmin) $('#addp').onsubmit = (ev) => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.target));
      act(() => api('/paintings', 'POST', f), 'Painting added', reload);
    };
  }, 'No paintings yet.');
}
const addPaintingForm = () => `<form id="addp" class="card"><b>Add painting</b>
  <label>Title<input name="title" required></label><label>Artist<input name="artist"></label>
  <label>Description<input name="description"></label><label>Price<input name="price" type="number" min="1" step="0.01" required></label>
  <button>Add</button></form>`;

// ---------- orders ----------
function ordersView() {
  screen(() => api('/orders'), (list, view) => {
    view.innerHTML = list.map((o) => `<div class="card">#${o.id} ${esc(o.painting_title)} — ${money(o.price)} <span class="tag">${o.status}</span>
      ${o.customer_name ? `<div class="muted">by ${esc(o.customer_name)} (${esc(o.customer_email)})</div>` : ''}
      ${user.role === 'customer' && o.status === 'placed' ? `<button data-c="${o.id}">Cancel</button>` : ''}</div>`).join('');
    view.querySelectorAll('[data-c]').forEach((b) => b.onclick = () =>
      act(() => api(`/orders/${b.dataset.c}/cancel`, 'POST'), 'Order cancelled', ordersView));
  }, 'No orders yet.');
}

// ---------- bookings ----------
function bookingsView() {
  const isAdmin = user.role === 'admin';
  const view = $('#view');
  const list = () => screen(() => api('/bookings'), (rows, v) => {
    v.innerHTML = rows.map((b) => `<div class="card">${b.date} — ${b.wall_sqft} sq ft @ ${money(b.rate)} = <b>${money(b.price)}</b> <span class="tag">${b.status}</span>
      <div class="muted">${esc(b.address)}${b.customer_name ? ' · ' + esc(b.customer_name) : ''}</div>
      ${isAdmin && b.status === 'requested' ? `<button data-a="confirm" data-id="${b.id}">Confirm</button> <button data-a="decline" data-id="${b.id}">Decline</button>` : ''}
      ${!isAdmin && ['requested', 'confirmed'].includes(b.status) ? `<button data-a="cancel" data-id="${b.id}">Cancel</button>` : ''}</div>`).join('');
    v.querySelectorAll('[data-a]').forEach((btn) => btn.onclick = () =>
      act(() => api(`/bookings/${btn.dataset.id}/${btn.dataset.a}`, 'POST'), 'Booking ' + btn.dataset.a + ' done', bookingsView));
  }, 'No bookings yet.');
  if (isAdmin) return list();
  view.innerHTML = `<form id="bk" class="card"><b>Book a wall painting</b>
    <label>Date<input name="date" type="date" min="${isoIn(7)}" max="${isoIn(90)}" required></label>
    <label>Wall size (sq ft, 10–500)<input name="wallSqft" type="number" min="10" max="500" required></label>
    <label>Address<textarea name="address" required></textarea></label>
    <div class="muted">Rate: ${money(catalog.wallRatePerSqft)} per sq ft</div><button>Request booking</button></form><div id="bklist"></div>`;
  $('#bk').onsubmit = (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.target));
    act(() => api('/bookings', 'POST', { ...f, wallSqft: Number(f.wallSqft) }), 'Booking requested', bookingsView);
  };
  // render list below the form
  const holder = $('#bklist');
  holder.innerHTML = '<p class="muted">Loading…</p>';
  api('/bookings').then((rows) => {
    holder.innerHTML = rows.length ? '' : '<p class="muted">No bookings yet.</p>';
    rows.forEach((b) => {
      const d = document.createElement('div'); d.className = 'card';
      d.innerHTML = `${b.date} — ${b.wall_sqft} sq ft = <b>${money(b.price)}</b> <span class="tag">${b.status}</span><div class="muted">${esc(b.address)}</div>`;
      if (['requested', 'confirmed'].includes(b.status)) {
        const btn = document.createElement('button'); btn.textContent = 'Cancel';
        btn.onclick = () => act(() => api(`/bookings/${b.id}/cancel`, 'POST'), 'Booking cancelled', bookingsView);
        d.append(btn);
      }
      holder.append(d);
    });
  }).catch((e) => { holder.innerHTML = `<p class="error">Error: ${esc(e.message)}</p>`; });
}

// ---------- pottery ----------
function potteryView() {
  const isAdmin = user.role === 'admin';
  const reload = potteryView;
  const opts = (sel, arr) => arr.map(([v, t]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(t)}</option>`).join('');
  const form = (r) => `<form id="pf" class="card"><b>${r ? 'Edit request #' + r.id : 'Request custom pottery'}</b>
    <label>Item<select name="itemId">${opts(r?.item_id, catalog.potteryItems.map((i) => [i.id, `${i.name} (${money(i.price)})`]))}</select></label>
    <label>Glaze<select name="glaze">${opts(r?.glaze, catalog.glazes.map((g) => [g, g]))}</select></label>
    <label>Quantity (1–12)<input name="quantity" type="number" min="1" max="12" value="${r?.quantity ?? 1}" required></label>
    <label>Needed by<input name="neededBy" type="date" min="${isoIn(14)}" value="${r?.needed_by ?? ''}" required></label>
    <button>${r ? 'Save' : 'Request'}</button> ${r ? '<button type="button" id="nocancel">Discard</button>' : ''}</form>`;
  let editing = null;
  screen(() => api('/pottery'), (rows, view) => paint(rows, view), 'No pottery requests yet.');
  function paint(rows, view) {
    view.innerHTML = (isAdmin ? '' : form(editing)) + rows.map((r) => `<div class="card">#${r.id} ${r.quantity} × ${esc(r.item_name)}, ${esc(r.glaze)} glaze — needed by ${r.needed_by} <span class="tag">${r.status}</span>
      ${r.customer_name ? `<div class="muted">${esc(r.customer_name)} (${esc(r.customer_email)})</div>` : ''}
      ${isAdmin && r.status === 'requested' ? `<button data-a="accept" data-id="${r.id}">Accept</button> <button data-a="decline" data-id="${r.id}">Decline</button>` : ''}
      ${!isAdmin && r.status === 'requested' ? `<button data-e="${r.id}">Edit</button> <button data-a="cancel" data-id="${r.id}">Cancel</button>` : ''}</div>`).join('');
    view.querySelectorAll('[data-a]').forEach((b) => b.onclick = () =>
      act(() => api(`/pottery/${b.dataset.id}/${b.dataset.a}`, 'POST'), 'Request ' + b.dataset.a + ' done', reload));
    view.querySelectorAll('[data-e]').forEach((b) => b.onclick = () => { editing = rows.find((r) => r.id == b.dataset.e); paint(rows, view); });
    if (!isAdmin) {
      $('#pf').onsubmit = (ev) => {
        ev.preventDefault();
        const f = Object.fromEntries(new FormData(ev.target));
        const body = { ...f, quantity: Number(f.quantity) };
        act(() => editing ? api('/pottery/' + editing.id, 'PUT', body) : api('/pottery', 'POST', body), editing ? 'Request updated' : 'Request sent', reload);
      };
      if (editing) $('#nocancel').onclick = () => { editing = null; paint(rows, view); };
    }
  }
}

// ---------- shell ----------
const TABS = { Paintings: paintingsView, Orders: ordersView, 'Wall bookings': bookingsView, Pottery: potteryView };

function show(name) {
  say('');
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.textContent === name));
  TABS[name]();
}

async function render() {
  if (!token) { $('#who').textContent = ''; return authView(); }
  try {
    user = await api('/me');
    catalog = await api('/catalog');
  } catch (e) {
    if (!token) return authView();
    $('#view').innerHTML = `<p class="error">Error: ${esc(e.message)}</p>`; return;
  }
  $('#who').innerHTML = `${esc(user.name)} <span class="tag">${user.role}</span> <button id="out">Log out</button>`;
  $('#out').onclick = logout;
  $('#nav').innerHTML = Object.keys(TABS).map((t) => `<button>${t}</button>`).join('');
  $('#nav').querySelectorAll('button').forEach((b) => b.onclick = () => show(b.textContent));
  show('Paintings');
}

render();
