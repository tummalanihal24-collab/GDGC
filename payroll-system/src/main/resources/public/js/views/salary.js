import { get, put as putApi, post } from '../api.js';
import { h, put, amt } from '../util.js';
import { pageHead, toast, attempt, empty } from '../ui.js';

const KEYS = ['hra', 'da', 'pf', 'tax'];

export async function mount(root) {
  put(root, h`${pageHead({
    eyebrow: 'Administrator', title: 'Salary structure',
    lede: 'HRA, DA and PF are percentages of basic pay; tax is a percentage of gross. Edit a figure and save the row.',
  })}<div class="table-wrap" id="list"></div>`);
  const list = root.querySelector('#list');
  let rows = [];

  function render() {
    put(list, rows.length ? h`<table class="ledger"><thead><tr><th>Employee</th><th class="num">Basic</th><th class="num">HRA %</th><th class="num">DA %</th><th class="num">PF %</th><th class="num">Tax %</th><th class="num">Net, full month</th><th></th></tr></thead><tbody>
      ${rows.map((r) => h`<tr data-emp="${r.empId}"><td><b>${r.name}</b></td><td class="num">${amt(r.basicSalary)}</td>
        ${KEYS.map((k) => h`<td class="in"><input type="number" step="0.5" min="0" max="100" name="${k}" value="${r[k]}" data-orig="${r[k]}" aria-label="${k.toUpperCase()} percent for ${r.name}"></td>`)}
        <td class="num" data-net>${amt(r.netFullMonth)}</td>
        <td><div class="row-actions"><button class="btn small primary" data-act="save" disabled>Save</button><button class="link muted" data-act="reset">Use defaults</button></div></td></tr>`)}</tbody></table>` : empty('No active employees.'));
  }

  const rowOf = (el) => el.closest('tr');
  const dirty = (tr) => [...tr.querySelectorAll('input')].some((i) => Number(i.value) !== Number(i.dataset.orig));

  root.addEventListener('input', (ev) => {
    const tr = ev.target.closest('tr[data-emp]');
    if (!tr) return;
    const d = dirty(tr);
    tr.classList.toggle('dirty', d);
    tr.querySelector('[data-act=save]').disabled = !d;
  });

  function apply(tr, res) {
    const r = rows.find((x) => x.empId === res.empId);
    Object.assign(r, res);
    KEYS.forEach((k) => { const i = tr.querySelector(`[name=${k}]`); i.value = res[k]; i.dataset.orig = res[k]; });
    tr.querySelector('[data-net]').replaceChildren(...new DOMParser().parseFromString(`<body>${amt(res.netFullMonth)}</body>`, 'text/html').body.childNodes);
    tr.classList.remove('dirty');
    tr.querySelector('[data-act=save]').disabled = true;
  }

  root.onclick = async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const tr = rowOf(b);
    const id = tr.dataset.emp;
    if (b.dataset.act === 'save') {
      const body = Object.fromEntries(KEYS.map((k) => [k, Number(tr.querySelector(`[name=${k}]`).value)]));
      const res = await attempt(() => putApi('admin/salary-structures/' + id, body));
      if (res) { apply(tr, res); toast('Salary structure saved'); }
    } else if (b.dataset.act === 'reset') {
      const res = await attempt(() => post(`admin/salary-structures/${id}/reset`));
      if (res) { apply(tr, res); toast('Reset to the default structure'); }
    }
  };
  rows = (await get('admin/salary-structures')).structures;
  render();
}
