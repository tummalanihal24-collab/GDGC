import { get } from '../api.js';
import { h, put, money, prevMonth, monthName, fmtDate } from '../util.js';
import { pageHead, stepper, bindStepper, loading, empty, stamp } from '../ui.js';
import { barList } from '../charts.js';

const TYPES = [['payroll', 'Payroll'], ['attendance', 'Attendance'], ['employees', 'Employees']];
const MONEY = new Set(['Basic', 'HRA', 'DA', 'Gross', 'PF', 'Tax', 'Deductions', 'Net', 'Basic Salary']);

function cell(col, v) {
  if (v === null || v === undefined || v === '') return h`<td>-</td>`;
  if (MONEY.has(col)) return h`<td class="num">${money(v)}</td>`;
  if (col === 'Status' && typeof v === 'string' && v === v.toUpperCase()) return h`<td>${stamp(v)}</td>`;
  if (col === 'Joined') return h`<td>${fmtDate(v)}</td>`;
  if (typeof v === 'number') return h`<td class="num">${v}</td>`;
  return h`<td>${v}</td>`;
}

export async function mount(root) {
  const state = { type: 'payroll', month: prevMonth() };

  async function load() {
    loading(root, 'Compiling the report');
    const qs = `?month=${state.month}`;
    const [t, dept] = await Promise.all([get(`admin/reports/${state.type}${qs}`), state.type === 'payroll' ? get('admin/reports-dept-salary' + qs) : null]);
    const monthly = state.type !== 'employees';
    put(root, h`${pageHead({
      eyebrow: 'Administrator', title: 'Reports',
      lede: monthly ? `${TYPES.find(([k]) => k === state.type)[1]} figures for ${monthName(state.month)}.` : 'Everyone currently on the payroll.',
      actions: h`${monthly ? stepper(state.month) : ''}<a class="btn" href="/api/admin/reports/${state.type}${qs}&format=csv" download>Download CSV</a>`,
    })}
    <div class="toolbar"><div class="seg-ctl" role="group" aria-label="Report type">${TYPES.map(([k, label]) => h`<button type="button" data-type="${k}" aria-pressed="${String(state.type === k)}">${label}</button>`)}</div></div>
    <div class="table-wrap">${t.rows.length ? h`<table class="ledger"><thead><tr>${t.columns.map((c) => h`<th class="${MONEY.has(c) || /Days|Present|Absent|Leave/.test(c) ? 'num' : ''}">${c}</th>`)}</tr></thead>
      <tbody>${t.rows.map((r) => h`<tr>${r.map((v, i) => cell(t.columns[i], v))}</tr>`)}</tbody></table>` : empty('Nothing to report for this period.')}</div>
    ${dept && dept.rows.length ? h`<section class="block"><header><h2>Net pay by department</h2><span class="label">${monthName(state.month, 'short')}</span></header>${barList(dept.rows)}</section>` : ''}`);
    bindStepper(root, state, load);
  }

  root.onclick = (ev) => {
    const b = ev.target.closest('[data-type]');
    if (b) { state.type = b.dataset.type; load(); }
  };
  await load();
}
