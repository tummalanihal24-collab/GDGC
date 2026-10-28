import { get } from '../api.js';
import { h, put, thisMonth, daysIn, pad, dowOf, monthName } from '../util.js';
import { pageHead, stepper, bindStepper, loading } from '../ui.js';

const HEAD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export async function mount(root) {
  const state = { month: thisMonth() };

  async function load() {
    loading(root, 'Opening your calendar');
    const d = await get('me/attendance?month=' + state.month);
    const marks = Object.fromEntries(d.marks.map((m) => [m.date, m.status]));
    const n = daysIn(state.month);
    const lead = (dowOf(`${state.month}-01`) + 6) % 7; // Monday-first
    const cells = [...Array.from({ length: lead }, () => h`<div class="day blank"></div>`),
      ...Array.from({ length: n }, (_, i) => {
        const iso = `${state.month}-${pad(i + 1)}`;
        const st = marks[iso] || '';
        return h`<div class="day ${st}"><b>${i + 1}</b>${st ? h`<em>${st === 'LEAVE' ? 'Leave' : 'Absent'}</em>` : ''}</div>`;
      })];
    put(root, h`${pageHead({ eyebrow: 'Employee', title: 'Your attendance', lede: 'Days HR has not marked count as present. Absent days reduce that month\'s basic pay; leave is paid.', actions: stepper(state.month) })}
      <dl class="facts row"><div><dt>Month</dt><dd>${monthName(state.month, 'short')}</dd></div><div><dt>Marked days</dt><dd>${d.marks.length}</dd></div>
        <div><dt>Absent</dt><dd>${d.absent}</dd></div><div><dt>Leave</dt><dd>${d.leave}</dd></div></dl>
      <div class="calendar" role="group" aria-label="${monthName(state.month)}">${HEAD.map((x) => h`<div class="dow">${x}</div>`)}${cells}</div>`);
    bindStepper(root, state, load);
  }
  await load();
}
