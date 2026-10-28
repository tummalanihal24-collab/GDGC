import { get } from '../api.js';
import { h, put, fmtStamp } from '../util.js';
import { pageHead, attempt, empty } from '../ui.js';

const CLASS = { GENERATED: 'GENERATED', RECALCULATED: 'GENERATED', VERIFIED: 'VERIFIED', PAID: 'PAID', CANCELLED: 'CANCELLED', REPROCESSED: 'VERIFIED' };
const ACTIONS = ['GENERATED', 'RECALCULATED', 'VERIFIED', 'PAID', 'CANCELLED', 'REPROCESSED'];

export async function mount(root) {
  put(root, h`${pageHead({ eyebrow: 'Administrator', title: 'Audit journal', lede: 'Every change to a payroll record, newest first. The latest 500 entries are kept in view.' })}
    <div class="toolbar">
      <label class="field"><span>Month</span><input type="month" id="month"></label>
      <label class="field"><span>Action</span><select id="action"><option value="">All actions</option>${ACTIONS.map((a) => h`<option>${a}</option>`)}</select></label>
      <label class="field grow"><span>Search</span><input type="search" id="q" placeholder="Employee, person or detail"></label>
    </div><div class="table-wrap" id="list" aria-live="polite"></div>`);
  const list = root.querySelector('#list');

  async function refresh() {
    const qs = new URLSearchParams({ month: root.querySelector('#month').value, action: root.querySelector('#action').value, q: root.querySelector('#q').value.trim() });
    const res = await attempt(() => get('admin/audit?' + qs));
    if (!res) return;
    put(list, res.entries.length ? h`<table class="ledger"><thead><tr><th>When</th><th>Employee</th><th>Month</th><th>Action</th><th>By</th><th>Details</th></tr></thead>
      <tbody>${res.entries.map((a) => h`<tr><td class="mono">${fmtStamp(a.actionTime)}</td><td><b>${a.empName}</b></td><td class="mono">${a.payMonth}</td>
        <td><span class="stamp ${CLASS[a.action] || ''}">${a.action.toLowerCase()}</span></td><td>${a.actionBy}</td><td class="muted">${a.details || ''}</td></tr>`)}</tbody></table>` : empty('No entries match.'));
  }
  let t;
  root.querySelector('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(refresh, 200); });
  root.querySelector('#month').addEventListener('change', refresh);
  root.querySelector('#action').addEventListener('change', refresh);
  await refresh();
}
