// Toasts, confirm dialog, slide-over drawer, form helpers and shared page furniture.
import { h, put, raw, monthName, shiftMonth } from './util.js';

export function toast(message, kind = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast' + (kind === 'error' ? ' error' : '');
  el.textContent = message;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), kind === 'error' ? 6500 : 3500);
}

/** Runs an async action; shows its error as a toast. Returns undefined on failure. */
export async function attempt(fn) {
  try { return await fn(); } catch (e) { toast(e.message || 'Something went wrong', 'error'); return undefined; }
}

export function dialog({ title, body, confirm = 'OK', cancel = 'Cancel', danger = false }) {
  const dlg = document.getElementById('dialog');
  put(dlg, h`<form method="dialog">
    <h2>${title}</h2><div>${body}</div>
    <div class="foot">${cancel ? h`<button class="btn" value="no" type="submit">${cancel}</button>` : ''}
    <button class="btn ${danger ? 'danger' : 'primary'}" value="yes" type="submit">${confirm}</button></div></form>`);
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'yes'), { once: true });
    dlg.returnValue = 'no';
    dlg.showModal();
  });
}
export const confirmBox = (title, text, confirm = 'Confirm', danger = false) => dialog({ title, body: h`<p>${text}</p>`, confirm, danger });

/**
 * Slide-over form. `fields` is html; `onSubmit(values)` may throw to show an inline error. Resolves true when saved.
 */
export function drawer({ title, fields, submit = 'Save', onSubmit }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    put(wrap, h`<div class="scrim" data-close></div>
      <aside class="drawer" role="dialog" aria-modal="true" aria-label="${title}">
        <header><h2>${title}</h2><button class="close" type="button" data-close aria-label="Close">&times;</button></header>
        <form novalidate>${fields}<p class="form-error" role="alert"></p>
          <div class="foot"><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="submit">${submit}</button></div>
        </form></aside>`);
    document.body.appendChild(wrap);
    const form = wrap.querySelector('form');
    const err = wrap.querySelector('.form-error');
    const finish = (ok) => { document.removeEventListener('keydown', onKey); wrap.remove(); resolve(ok); };
    const onKey = (e) => { if (e.key === 'Escape') finish(false); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) finish(false); });
    const first = form.querySelector('input:not([readonly]), select');
    if (first) first.focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true; err.textContent = '';
      try { await onSubmit(values(form)); finish(true); } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
    });
  });
}

export function values(form) {
  const o = {};
  new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  form.querySelectorAll('input[type=checkbox]').forEach((c) => { o[c.name] = c.checked; });
  return o;
}

export const field = (label, name, { type = 'text', value = '', hint = '', readonly = false, required = false, attrs = '' } = {}) =>
  h`<label class="field"><span>${label}</span><input type="${type}" name="${name}" value="${value}" ${raw(readonly ? 'readonly' : '')} ${raw(required ? 'required' : '')} ${raw(attrs)} autocomplete="off">${hint ? h`<small class="hint">${hint}</small>` : ''}</label>`;

export const select = (label, name, options, selected) =>
  h`<label class="field"><span>${label}</span><select name="${name}">${options.map(([v, t]) => h`<option value="${v}" ${raw(String(v) === String(selected ?? '') ? 'selected' : '')}>${t}</option>`)}</select></label>`;

export const stamp = (status) => h`<span class="stamp ${status}">${status.toLowerCase()}</span>`;

export function pageHead({ eyebrow, title, lede, actions }) {
  return h`<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${lede ? h`<p class="lede">${lede}</p>` : ''}</div>${actions ? h`<div class="actions">${actions}</div>` : ''}</div>`;
}

export const stepper = (month) =>
  h`<div class="stepper" role="group" aria-label="Month"><button type="button" data-step="-1" aria-label="Previous month">&lsaquo;</button><b>${monthName(month)}</b><button type="button" data-step="1" aria-label="Next month">&rsaquo;</button></div>`;

/** Wires every [data-step] button inside root to move `state.month` and call reload(). */
export function bindStepper(root, state, reload) {
  root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
    state.month = shiftMonth(state.month, Number(b.dataset.step));
    reload();
  }));
}

export const loading = (root, text = 'Turning the page') => put(root, h`<div class="loading">${text}&hellip;</div>`);
export const empty = (text) => h`<div class="empty">${text}</div>`;
