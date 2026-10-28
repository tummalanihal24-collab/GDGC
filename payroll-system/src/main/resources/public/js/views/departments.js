import { get, post, put as putApi, del } from '../api.js';
import { h, put } from '../util.js';
import { pageHead, drawer, dialog, field, toast, attempt, empty } from '../ui.js';

export async function mount(root) {
  put(root, h`${pageHead({
    eyebrow: 'Administrator', title: 'Departments',
    lede: 'A department can only be deleted once no employee belongs to it.',
    actions: h`<button class="btn primary" data-act="add" type="button">Add department</button>`,
  })}<div class="table-wrap" id="list"></div>`);
  const list = root.querySelector('#list');
  let rows = [];

  async function refresh() {
    rows = (await get('admin/departments')).departments;
    put(list, rows.length ? h`<table class="ledger"><thead><tr><th>Department</th><th>Location</th><th class="num">Employees</th><th></th></tr></thead><tbody>
      ${rows.map((d) => h`<tr><td><b>${d.name}</b></td><td>${d.location || '-'}</td><td class="num">${d.employees}</td>
        <td><div class="row-actions"><button class="link" data-act="edit" data-id="${d.id}">Edit</button>
        <button class="link danger" data-act="delete" data-id="${d.id}">Delete</button></div></td></tr>`)}</tbody></table>` : empty('No departments yet.'));
  }
  const fields = (d) => h`${field('Name', 'name', { value: d?.name ?? '', required: true })}${field('Location', 'location', { value: d?.location ?? '' })}`;

  root.onclick = async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const d = rows.find((r) => String(r.id) === b.dataset.id);
    if (b.dataset.act === 'add') {
      if (await drawer({ title: 'Add department', fields: fields(null), submit: 'Add', onSubmit: (v) => post('admin/departments', v) })) { toast('Department added'); refresh(); }
    } else if (b.dataset.act === 'edit') {
      if (await drawer({ title: 'Edit department', fields: fields(d), onSubmit: (v) => putApi('admin/departments/' + d.id, v) })) { toast('Saved'); refresh(); }
    } else if (b.dataset.act === 'delete') {
      const yes = await dialog({ title: 'Delete department?', body: h`<p><b>${d.name}</b> will be removed.</p>`, confirm: 'Delete', danger: true });
      if (yes && (await attempt(() => del('admin/departments/' + d.id)) !== undefined)) { toast('Deleted'); refresh(); }
    }
  };
  await refresh();
}
