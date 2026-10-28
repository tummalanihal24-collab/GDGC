// Hand-drawn SVG charts (no library). Colours come from the stylesheet via classes.
import { h, raw, short, money, monthName } from './util.js';

/** Vertical bars, one per month. rows: [{ month, net }] */
export function columnChart(rows, { height = 250 } = {}) {
  const W = 1200, top = 34, bottom = 30, left = 6, right = 6;
  const max = Math.max(...rows.map((r) => r.net), 1);
  const slot = (W - left - right) / rows.length;
  const bw = Math.min(84, slot * 0.46);
  const plot = height - top - bottom;
  const last = rows.length - 1;
  const bars = rows.map((r, i) => {
    const bh = r.net > 0 ? Math.max(3, (r.net / max) * plot) : 0;
    const x = left + i * slot + (slot - bw) / 2;
    const y = top + plot - bh;
    return `<g>${bh ? `<rect class="bar${i === last ? '' : ' dim'}" x="${x}" y="${y}" width="${bw}" height="${bh}"/>` : `<line class="base" x1="${x}" x2="${x + bw}" y1="${y}" y2="${y}"/>`}
      <text x="${x + bw / 2}" y="${y - 8}" text-anchor="middle">${r.net > 0 ? short(r.net) : '&ndash;'}</text>
      <text class="lab" x="${x + bw / 2}" y="${height - 8}" text-anchor="middle">${monthName(r.month, 'short')}</text></g>`;
  }).join('');
  const label = rows.map((r) => `${monthName(r.month)}: ${money(r.net)}`).join('; ');
  return h`<svg class="chart" viewBox="0 0 ${W} ${height}" role="img" aria-label="${'Net payroll by month. ' + label}">
    <line class="grid" x1="0" x2="${W}" y1="${top}" y2="${top}"/><line class="base" x1="0" x2="${W}" y1="${top + plot}" y2="${top + plot}"/>${raw(bars)}</svg>`;
}

/** Horizontal bars. rows: [{ name, net }] */
export function barList(rows) {
  const W = 620, label = 170, right = 96, rowH = 40;
  const max = Math.max(...rows.map((r) => r.net), 1);
  const bw = W - label - right;
  const body = rows.map((r, i) => {
    const y = i * rowH;
    const w = Math.max(2, (r.net / max) * bw);
    return `<g><text class="name" x="0" y="${y + 24}">${escapeSvg(trim(r.name, 20))}</text>
      <rect class="bar" x="${label}" y="${y + 9}" width="${w}" height="20"/>
      <text x="${label + w + 8}" y="${y + 24}">${short(r.net)}</text></g>`;
  }).join('');
  const desc = rows.map((r) => `${r.name}: ${money(r.net)}`).join('; ');
  return h`<svg class="chart" viewBox="0 0 ${W} ${rows.length * rowH + 2}" role="img" aria-label="${'Net salary by department. ' + desc}">
    <line class="base" x1="${label}" x2="${label}" y1="0" y2="${rows.length * rowH}"/>${raw(body)}</svg>`;
}

/** One stacked bar of payroll states. counts: { GENERATED: n, ... } */
export function statusBar(counts) {
  const order = ['PAID', 'VERIFIED', 'GENERATED', 'CANCELLED'];
  const total = order.reduce((s, k) => s + (counts[k] || 0), 0);
  const W = 620, H = 22;
  let x = 0;
  const segs = total === 0 ? '' : order.map((k) => {
    const w = ((counts[k] || 0) / total) * W;
    const seg = w > 0 ? `<rect class="seg ${k}" x="${x}" y="0" width="${w}" height="${H}"/>` : '';
    x += w;
    return seg;
  }).join('');
  const desc = order.map((k) => `${counts[k] || 0} ${k.toLowerCase()}`).join(', ');
  return h`<svg class="chart status" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${'Payroll states: ' + desc}"><rect class="frame" x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}"/>${raw(segs)}</svg>`;
}

const trim = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const escapeSvg = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
