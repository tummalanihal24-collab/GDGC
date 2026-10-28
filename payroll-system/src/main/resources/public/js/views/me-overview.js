import { get } from '../api.js';
import { h, put, amt, money, monthName, fmtDate, daysIn, pad, isWeekend, todayIso } from '../util.js';
import { pageHead, stamp, empty } from '../ui.js';

export async function mount(root) {
  const d = await get('me/overview');
  const u = d.user;
  const first = u.name.split(' ')[0];
  const [whole, cents] = d.latest ? money(d.latest.netSalary).split('.') : ['', ''];
  const n = daysIn(d.month);
  const marks = Object.fromEntries(d.marks.map((m) => [m.date, m.status]));
  const today = todayIso();

  put(root, h`${pageHead({
    eyebrow: `${u.designation}${u.deptName ? ' - ' + u.deptName : ''}`,
    title: `Hello, ${first}`,
    actions: d.payslipCount ? h`<a class="btn primary" href="#/payslips/${d.latest.payMonth}">Open latest payslip</a>` : '',
  })}
  <div class="cols two">
    <section class="figure" aria-label="Latest pay">
      ${d.latest ? h`<div class="label">Latest net pay &middot; ${monthName(d.latest.payMonth)} ${stamp(d.latest.status)}</div>
        <div class="big">${whole}<small>.${cents}</small></div>
        <p class="sub">Gross ${amt(d.latest.grossSalary)}, less deductions of ${amt(d.latest.deductions)}.</p>`
        : h`<div class="label">Latest net pay</div><div class="big">&ndash;</div>
          <p class="sub">Payslips appear here once HR has verified a month's payroll.</p>`}
    </section>
    <dl class="facts">
      <div><dt>Basic salary</dt><dd>${amt(u.basicSalary)}</dd></div>
      <div><dt>Payslips available</dt><dd>${d.payslipCount}</dd></div>
      <div><dt>Absent this month</dt><dd>${d.absent}</dd></div>
      <div><dt>On leave this month</dt><dd>${d.leave}</dd></div>
      <div><dt>Joined</dt><dd>${fmtDate(u.joiningDate)}</dd></div>
    </dl>
  </div>

  <section class="block"><header><h2>${monthName(d.month)}</h2><a class="link" href="#/attendance">Full calendar</a></header>
    <div class="strip" role="img" aria-label="Attendance this month: ${d.absent} absent, ${d.leave} on leave">${Array.from({ length: n }, (_, i) => {
      const iso = `${d.month}-${pad(i + 1)}`;
      const cls = marks[iso] || (isWeekend(iso) ? 'wk' : iso > today ? 'future' : '');
      return h`<i class="${cls}" title="${i + 1}: ${marks[iso] ? marks[iso].toLowerCase() : isWeekend(iso) ? 'weekend' : iso > today ? 'to come' : 'present'}"></i>`;
    })}</div>
    <p class="muted">Days without a mark count as present. Hatched days are weekends.</p></section>

  <section class="block"><header><h2>Recent payslips</h2><span class="label">Verified and paid months only</span></header>
    ${d.recent.length ? h`<div class="table-wrap"><table class="ledger"><thead><tr><th>Month</th><th class="num">Gross</th><th class="num">Deductions</th><th class="num">Net</th><th>Status</th><th></th></tr></thead>
      <tbody>${d.recent.map((p) => h`<tr><td><b>${monthName(p.payMonth)}</b></td><td class="num">${money(p.grossSalary)}</td><td class="num">${money(p.deductions)}</td>
        <td class="num"><b>${money(p.netSalary)}</b></td><td>${stamp(p.status)}</td><td><div class="row-actions"><a class="link" href="#/payslips/${p.payMonth}">Open</a></div></td></tr>`)}</tbody></table></div>`
      : empty('Nothing here yet.')}</section>`);
}
