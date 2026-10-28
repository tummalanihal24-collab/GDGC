import { get, post } from '../api.js';
import { h, put, amt, money, prevMonth, monthName } from '../util.js';
import { pageHead, stepper, bindStepper, dialog, confirmBox, toast, attempt, loading, empty, stamp } from '../ui.js';
import { statusBar } from '../charts.js';

const STATUSES = ['GENERATED', 'VERIFIED', 'PAID', 'CANCELLED'];
const VERB = { verify: 'Verified', pay: 'Marked paid', cancel: 'Cancelled', reprocess: 'Reprocessed', recalculate: 'Recalculated' };

function actionsFor(p) {
  switch (p.status) {
    case 'GENERATED': return [['recalculate', 'Recalculate', ''], ['verify', 'Verify', ''], ['cancel', 'Cancel', 'danger']];
    case 'VERIFIED': return [['pay', 'Mark paid', ''], ['cancel', 'Cancel', 'danger']];
    case 'CANCELLED': return [['reprocess', 'Reprocess', '']];
    default: return [];
  }
}

export async function mount(root) {
  const state = { month: prevMonth(), filter: 'ALL' };
  let view = null;
  const selected = new Set();

  async function load() {
    selected.clear();
    loading(root, 'Reading the ledger');
    view = await get('admin/payroll?month=' + state.month);
    draw();
  }

  function visible() { return view.payrolls.filter((p) => state.filter === 'ALL' || p.status === state.filter); }

  function draw() {
    const s = view.summary;
    const total = view.payrolls.length;
    const rows = visible();
    put(root, h`${pageHead({
      eyebrow: 'Administrator', title: 'Payroll',
      lede: 'Run a month once; running it again only fills in employees who are missing. A record moves from generated to verified to paid, and employees see their payslip once it is verified.',
      actions: h`${stepper(state.month)}<button class="btn primary" type="button" data-run>Run payroll for ${monthName(state.month, 'long').split(' ')[0]}</button>`,
    })}
    <dl class="facts row" aria-label="Month totals">
      <div><dt>Payrolls</dt><dd>${s.headcount}</dd></div>
      <div><dt>Gross</dt><dd>${amt(s.gross)}</dd></div>
      <div><dt>Deductions</dt><dd>${amt(s.deductions)}</dd></div>
      <div><dt>Net pay</dt><dd>${amt(s.net)}</dd></div>
    </dl>
    ${total ? h`${statusBar(view.counts)}
      <div class="legend" role="group" aria-label="Filter by status">
        <button type="button" data-filter="ALL" aria-pressed="${String(state.filter === 'ALL')}"><i class="ALL"></i>All ${total}</button>
        ${STATUSES.map((k) => h`<button type="button" data-filter="${k}" aria-pressed="${String(state.filter === k)}"><i class="${k}"></i>${k.toLowerCase()} ${view.counts[k] || 0}</button>`)}
      </div>` : ''}
    <div class="table-wrap">${total ? (rows.length ? h`<table class="ledger"><thead><tr>
        <th class="grp"><input type="checkbox" data-all aria-label="Select all shown" ${rows.every((p) => selected.has(p.payrollId)) ? h`checked` : ''}></th>
        <th>Employee</th><th class="num">Absent / days</th><th class="num">Basic</th><th class="num">Allowances</th><th class="num">Gross</th><th class="num">Deductions</th><th class="num">Net</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map((p) => h`<tr><td class="grp"><input type="checkbox" data-sel="${p.payrollId}" aria-label="Select ${p.empName}" ${selected.has(p.payrollId) ? h`checked` : ''}></td>
        <td><b>${p.empName}</b><small>${p.mode.toLowerCase()} run by ${p.generatedBy}</small></td>
        <td class="num">${p.absentDays} / ${p.workingDays}</td><td class="num">${money(p.basic)}</td><td class="num">${money(p.hra + p.da)}</td>
        <td class="num">${money(p.grossSalary)}</td><td class="num">${money(p.deductions)}</td><td class="num"><b>${money(p.netSalary)}</b></td>
        <td>${stamp(p.status)}</td>
        <td><div class="row-actions">${actionsFor(p).map(([a, label, cls]) => h`<button class="link ${cls}" data-do="${a}" data-id="${p.payrollId}">${label}</button>`)}</div></td></tr>`)}</tbody></table>`
        : empty('No records in this state.'))
      : empty(`No payroll for ${monthName(state.month)} yet. Run it to generate one record per active employee.`)}</div>
    ${bar()}`);
    bindStepper(root, state, load);
  }

  function bar() {
    if (!selected.size) return '';
    return h`<div class="selection-bar" role="region" aria-label="Selected records"><b>${selected.size} selected</b>
      <button class="btn small" data-bulk="verify">Verify</button><button class="btn small" data-bulk="pay">Mark paid</button>
      <button class="btn small" data-bulk="recalculate">Recalculate</button><button class="btn small" data-bulk="reprocess">Reprocess</button>
      <button class="btn small" data-bulk="cancel">Cancel</button><button class="link" data-clear>Clear</button></div>`;
  }

  async function run() {
    const label = monthName(state.month);
    const ok = await confirmBox(`Run payroll for ${label}?`, 'One record is created for every active employee who does not have one yet. Everyone is processed in a single transaction: if anything fails, nothing is saved.', 'Run payroll');
    if (!ok) return;
    const res = await attempt(() => post('admin/payroll/run', { month: state.month }));
    if (!res) return;
    await dialog({
      title: `Payroll for ${label}`, cancel: '',
      body: h`<p><b>${res.created}</b> record${res.created === 1 ? '' : 's'} created, <b>${res.skipped}</b> skipped (already processed or not yet joined).</p>
        <p>Total net pay: <b class="mono">${money(res.totalNet)}</b></p>
        ${res.problems.length ? h`<p class="form-error">Not processed:</p><ul>${res.problems.map((p) => h`<li>${p}</li>`)}</ul>` : ''}`,
    });
    load();
  }

  async function single(action, id) {
    if (action === 'cancel' && !(await confirmBox('Cancel this payroll record?', 'It is left out of month totals and the employee cannot see it. You can reprocess it later.', 'Cancel record', true))) return;
    if ((await attempt(() => post(`admin/payroll/${id}/${action}`))) !== undefined) { toast(VERB[action]); load(); }
  }

  async function bulk(action) {
    const ids = [...selected];
    if (action === 'cancel' && !(await confirmBox(`Cancel ${ids.length} records?`, 'They are left out of month totals. You can reprocess them later.', 'Cancel records', true))) return;
    const res = await attempt(() => post('admin/payroll/bulk', { ids, action }));
    if (!res) return;
    if (res.failures.length) {
      await dialog({ title: `${VERB[action]}: ${res.done} done, ${res.failures.length} unchanged`, cancel: '', body: h`<ul>${res.failures.map((f) => h`<li>${f}</li>`)}</ul>` });
    } else toast(`${VERB[action]}: ${res.done}`);
    load();
  }

  root.onclick = (ev) => {
    const t = ev.target;
    if (t.closest('[data-run]')) return run();
    const f = t.closest('[data-filter]');
    if (f) { state.filter = f.dataset.filter; return draw(); }
    const d = t.closest('[data-do]');
    if (d) return single(d.dataset.do, d.dataset.id);
    const b = t.closest('[data-bulk]');
    if (b) return bulk(b.dataset.bulk);
    if (t.closest('[data-clear]')) { selected.clear(); return draw(); }
    return undefined;
  };
  root.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.matches('[data-sel]')) { const id = Number(t.dataset.sel); if (t.checked) selected.add(id); else selected.delete(id); draw(); }
    if (t.matches('[data-all]')) { visible().forEach((p) => (t.checked ? selected.add(p.payrollId) : selected.delete(p.payrollId))); draw(); }
  });
  await load();
}
