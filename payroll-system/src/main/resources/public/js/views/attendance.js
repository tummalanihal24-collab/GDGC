import { get, put as putApi, post } from '../api.js';
import { h, put, thisMonth, daysIn, pad, dowOf, isWeekend, todayIso, monthName } from '../util.js';
import { pageHead, stepper, bindStepper, toast, attempt, loading, empty } from '../ui.js';

const NEXT = { '': 'PRESENT', PRESENT: 'ABSENT', ABSENT: 'LEAVE', LEAVE: '' };
const LETTER = { PRESENT: 'P', ABSENT: 'A', LEAVE: 'L', '': '' };
const DOW = 'SMTWTFS';

export async function mount(root) {
  const state = { month: thisMonth() };
  let reg = { rows: [] };

  async function load() {
    loading(root, 'Opening the register');
    reg = await get('admin/attendance?month=' + state.month);
    draw();
  }

  function draw() {
    const n = daysIn(state.month);
    const today = todayIso();
    const days = Array.from({ length: n }, (_, i) => `${state.month}-${pad(i + 1)}`);
    const defaultDay = today.startsWith(state.month) ? today : days[0];

    put(root, h`${pageHead({
      eyebrow: 'Administrator', title: 'Attendance register',
      lede: 'Click a day to cycle present, absent, leave and unmarked. Unmarked days count as present when payroll runs; only absences reduce pay.',
      actions: stepper(state.month),
    })}
    <div class="toolbar">
      <label class="field"><span>Mark everyone present on</span><input type="date" id="allday" value="${defaultDay}" min="${days[0]}" max="${days[n - 1]}"></label>
      <button class="btn" type="button" id="allgo">Apply</button>
    </div>
    <p class="keyline" aria-hidden="true"><span><i class="P">P</i> present</span><span><i class="A">A</i> absent (unpaid)</span><span><i class="L">L</i> leave (paid)</span><span><i class="W"></i> weekend</span><span>blank = not marked</span></p>
    ${reg.rows.length ? h`<div class="register-wrap"><table class="register"><caption class="sr">Attendance for ${monthName(state.month)}</caption>
      <thead><tr><th class="who-col label" scope="col">Employee</th>${days.map((iso) => h`<th scope="col" class="${isWeekend(iso) ? 'wk' : ''}"><b>${Number(iso.slice(8))}</b>${DOW[dowOf(iso)]}</th>`)}<th class="tot a" scope="col">Abs</th><th class="tot l" scope="col">Lv</th></tr></thead>
      <tbody>${reg.rows.map((r) => {
        const marks = r.marks || {};
        const vals = Object.values(marks);
        return h`<tr data-emp="${r.empId}"><th class="who-col" scope="row">${r.name}<small>${r.department || 'No department'}</small></th>
          ${days.map((iso) => {
            const st = marks[iso] || '';
            const off = iso > today || iso < r.joined;
            return h`<td class="d ${st} ${isWeekend(iso) ? 'wk' : ''} ${off ? 'off' : ''}"><button type="button" data-emp="${r.empId}" data-date="${iso}" aria-label="${r.name}, ${iso}: ${st ? st.toLowerCase() : 'not marked'}">${LETTER[st]}</button></td>`;
          })}
          <td class="tot a" data-t="ABSENT">${vals.filter((v) => v === 'ABSENT').length || ''}</td><td class="tot l" data-t="LEAVE">${vals.filter((v) => v === 'LEAVE').length || ''}</td></tr>`;
      })}</tbody></table></div>` : empty('There are no active employees to mark.')}`);

    bindStepper(root, state, load);
    root.querySelector('#allgo')?.addEventListener('click', async () => {
      const date = root.querySelector('#allday').value;
      if (!date) return;
      if ((await attempt(() => post('admin/attendance/all-present', { date }))) !== undefined) { toast(`Everyone marked present on ${date}`); load(); }
    });
  }

  root.onclick = async (ev) => {
    const btn = ev.target.closest('button[data-date]');
    if (!btn) return;
    const td = btn.parentElement;
    const tr = td.parentElement;
    const empId = Number(btn.dataset.emp);
    const row = reg.rows.find((r) => r.empId === empId);
    const date = btn.dataset.date;
    const before = row.marks[date] || '';
    const after = NEXT[before];
    set(td, btn, row, date, after);                       // optimistic
    try {
      await putApi('admin/attendance', { empId, date, status: after || null });
    } catch (e) {
      set(td, btn, row, date, before);                    // roll back
      toast(e.message, 'error');
    }
    totals(tr, row);
  };

  function set(td, btn, row, date, status) {
    if (status) row.marks[date] = status; else delete row.marks[date];
    td.classList.remove('PRESENT', 'ABSENT', 'LEAVE');
    if (status) td.classList.add(status);
    btn.textContent = LETTER[status];
    btn.setAttribute('aria-label', `${row.name}, ${date}: ${status ? status.toLowerCase() : 'not marked'}`);
  }
  function totals(tr, row) {
    const vals = Object.values(row.marks);
    tr.querySelector('[data-t=ABSENT]').textContent = vals.filter((v) => v === 'ABSENT').length || '';
    tr.querySelector('[data-t=LEAVE]').textContent = vals.filter((v) => v === 'LEAVE').length || '';
  }
  await load();
}
