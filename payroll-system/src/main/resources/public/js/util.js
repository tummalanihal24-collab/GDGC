// Small helpers: HTML-safe templating, number / date formatting.

class Safe {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const part = (v) => {
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(part).join('');
  if (v === null || v === undefined || v === false) return '';
  return esc(v);
};

/** Tagged template: every interpolated value is escaped unless it came from another h`` call. */
export function h(strings, ...vals) {
  let out = strings[0];
  vals.forEach((v, i) => { out += part(v) + strings[i + 1]; });
  return new Safe(out);
}
export const raw = (s) => new Safe(s);
export const put = (el, safe) => { el.innerHTML = part(safe); };

// ---- numbers
const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (n) => (n === null || n === undefined ? '-' : nf.format(n));
/** 66,900.00 with the cents set lighter. */
export function amt(n) {
  if (n === null || n === undefined) return raw('-');
  const [whole, cents] = nf.format(n).split('.');
  return h`<span class="amt">${whole}<small>.${cents}</small></span>`;
}
export const short = (n) => (Math.abs(n) >= 100000 ? (n / 1000).toFixed(0) + 'k' : Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n)));

// ---- months ("2026-09") and dates ("2026-09-03")
export const thisMonth = () => new Date().toISOString().slice(0, 7);
export function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
export const prevMonth = () => shiftMonth(thisMonth(), -1);
export function monthName(ym, style = 'long') {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', { month: style, year: style === 'long' ? 'numeric' : undefined, timeZone: 'UTC' });
}
export const daysIn = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
export const dowOf = (iso) => new Date(iso + 'T00:00:00Z').getUTCDay(); // 0 = Sunday
export const isWeekend = (iso) => { const d = dowOf(iso); return d === 0 || d === 6; };
export const pad = (n) => String(n).padStart(2, '0');
export const todayIso = () => new Date().toISOString().slice(0, 10);
export function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
export function fmtStamp(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
export const sentence = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '');
