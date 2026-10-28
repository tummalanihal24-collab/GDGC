import { get, post, put as putApi } from '../api.js';
import { h, put, fmtDate, amt } from '../util.js';
import { pageHead, drawer, dialog, field, select, toast, attempt, empty } from '../ui.js';

export async function mount(root) {
  const { departments } = await get('admin/departments');
  const state = { q: '', dept: '', inactive: false };
  let rows = [];

  put(root, h`${pageHead({
    eyebrow: 'Administrator', title: 'Employees',
    lede: 'The people on the payroll. Deactivating someone keeps their pay history but removes them from future runs.',
    actions: h`<button class="btn primary" data-act="add" type="button">Add employee</button>`,
  })}
    <div class="toolbar">
      <label class="field grow"><span>Search</span><input id="q" type="search" placeholder="Name, username, email or designation"></label>
      <label class="field"><span>Department</span><select id="dept"><option value="">All departments</option>${departments.map((d) => h`<option value="${d.id}">${d.name}</option>`)}</select></label>
      <label class="check"><input id="inactive" type="checkbox"> Show inactive</label>
    </div>
    <div class="table-wrap" id="list" aria-live="polite"></div>`);

  const list = root.querySelector('#list');
  const deptOptions = [['', 'No department'], ...departments.map((d) => [d.id, d.name])];

  async function refresh() {
    const qs = new URLSearchParams({ q: state.q, dept: state.dept, inactive: state.inactive });
    const res = await attempt(() => get('admin/employees?' + qs));
    if (!res) return;
    rows = res.employees;
    put(list, rows.length ? h`<table class="ledger"><thead><tr><th>Employee</th><th>Designation</th><th>Department</th><th>Joined</th><th class="num">Basic salary</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map((e) => h`<tr><td><b>${e.name}</b><small>${e.username} &middot; ${e.email}</small></td><td>${e.designation}</td><td>${e.deptName || '-'}</td>
        <td>${fmtDate(e.joiningDate)}</td><td class="num">${amt(e.basicSalary)}</td>
        <td><span class="stamp ${e.active ? 'active' : 'inactive'}">${e.active ? 'active' : 'inactive'}</span></td>
        <td><div class="row-actions"><button class="link" data-act="edit" data-id="${e.id}">Edit</button>
          <button class="link" data-act="password" data-id="${e.id}">Reset password</button>
          <button class="link ${e.active ? 'danger' : ''}" data-act="toggle" data-id="${e.id}">${e.active ? 'Deactivate' : 'Reactivate'}</button></div></td></tr>`)}</tbody></table>`
      : empty('No one matches that search.'));
  }

  function form(e) {
    const adding = !e;
    return h`${field('Full name', 'name', { value: e?.name ?? '', required: true })}
      ${field('Email', 'email', { type: 'email', value: e?.email ?? '', required: true })}
      ${field('Username', 'username', { value: e?.username ?? '', readonly: !adding, required: adding, hint: adding ? 'Letters, digits, dot, dash or underscore. Cannot be changed later.' : '' })}
      ${adding ? field('Initial password', 'password', { type: 'password', required: true, hint: 'At least 6 characters. The employee can change it after signing in.' }) : ''}
      ${field('Designation', 'designation', { value: e?.designation ?? '', required: true })}
      ${field('Joining date', 'joiningDate', { type: 'date', value: e?.joiningDate ?? '', required: true })}
      ${field('Basic salary (monthly)', 'basicSalary', { type: 'number', value: e?.basicSalary ?? '', required: true, attrs: 'step="0.01" min="0"' })}
      ${select('Department', 'deptId', deptOptions, e?.deptId)}`;
  }
  const payload = (v) => ({ ...v, basicSalary: v.basicSalary === '' ? null : Number(v.basicSalary), deptId: v.deptId === '' ? null : Number(v.deptId) });

  root.onclick = async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const e = rows.find((r) => String(r.id) === b.dataset.id);
    switch (b.dataset.act) {
      case 'add': {
        const ok = await drawer({ title: 'Add employee', fields: form(null), submit: 'Add employee', onSubmit: (v) => post('admin/employees', payload(v)) });
        if (ok) { toast('Employee added'); refresh(); }
        break;
      }
      case 'edit': {
        const ok = await drawer({ title: 'Edit employee', fields: form(e), onSubmit: (v) => putApi('admin/employees/' + e.id, payload({ ...v, username: e.username })) });
        if (ok) { toast('Changes saved'); refresh(); }
        break;
      }
      case 'toggle': {
        const next = !e.active;
        const yes = await dialog({
          title: next ? 'Reactivate employee?' : 'Deactivate employee?',
          body: h`<p>${next ? h`<b>${e.name}</b> will be able to sign in again and will be included in payroll runs.`
            : h`<b>${e.name}</b> will no longer be able to sign in or be included in payroll runs. Past payroll stays on record.`}</p>`,
          confirm: next ? 'Reactivate' : 'Deactivate', danger: !next,
        });
        if (yes && (await attempt(() => post(`admin/employees/${e.id}/active`, { active: next })) !== undefined)) { toast(next ? 'Reactivated' : 'Deactivated'); refresh(); }
        break;
      }
      case 'password': {
        const ok = await drawer({
          title: 'Reset password', submit: 'Set password',
          fields: h`<p>Set a new password for <b>${e.name}</b> (${e.username}).</p>${field('New password', 'password', { type: 'password', required: true, hint: 'At least 6 characters.' })}`,
          onSubmit: (v) => post(`admin/employees/${e.id}/password`, { password: v.password }),
        });
        if (ok) toast('Password updated');
        break;
      }
      default:
    }
  };

  let timer;
  root.querySelector('#q').addEventListener('input', (ev) => { clearTimeout(timer); timer = setTimeout(() => { state.q = ev.target.value.trim(); refresh(); }, 180); });
  root.querySelector('#dept').addEventListener('change', (ev) => { state.dept = ev.target.value; refresh(); });
  root.querySelector('#inactive').addEventListener('change', (ev) => { state.inactive = ev.target.checked; refresh(); });
  await refresh();
}
