import { get } from '../api.js';
import { h, put, money, amt, monthName, fmtStamp } from '../util.js';
import { pageHead } from '../ui.js';
import { columnChart, barList, statusBar } from '../charts.js';

const STAMP_CLASS = { GENERATED: 'GENERATED', RECALCULATED: 'GENERATED', VERIFIED: 'VERIFIED', PAID: 'PAID', CANCELLED: 'CANCELLED', REPROCESSED: 'VERIFIED' };

export async function mount(root) {
  const d = await get('admin/overview');
  const s = d.summary;
  const [whole, cents] = money(s.net).split('.');
  const hasPayroll = s.headcount > 0 || Object.values(d.counts).some((n) => n > 0);

  put(root, h`${pageHead({
    eyebrow: 'Administrator',
    title: 'Overview',
    lede: `Where payroll stands for ${monthName(d.month)}, the last full month.`,
    actions: h`<a class="btn primary" href="#/payroll">Go to payroll</a>`,
  })}
    <div class="cols two">
      <section class="figure" aria-label="Net payroll">
        <div class="label">Net payroll &middot; ${monthName(d.month)}</div>
        <div class="big">${whole}<small>.${cents}</small></div>
        <p class="sub">${hasPayroll
          ? h`${s.headcount} payroll${s.headcount === 1 ? '' : 's'}, gross ${amt(s.gross)}, less deductions of ${amt(s.deductions)}.`
          : h`No payroll has been run for ${monthName(d.month)} yet. <a href="#/payroll">Run it now</a>.`}</p>
        ${statusBar(d.counts)}
        <div class="legend" aria-hidden="true">${['PAID', 'VERIFIED', 'GENERATED', 'CANCELLED'].map((k) =>
          h`<span><i class="${k}"></i> ${d.counts[k] || 0} ${k.toLowerCase()}</span>`)}</div>
      </section>
      <dl class="facts" aria-label="Key figures">
        <div><dt>Active employees</dt><dd>${d.activeEmployees}</dd></div>
        <div><dt>Departments</dt><dd>${d.departments}</dd></div>
        <div><dt>Awaiting verification</dt><dd>${d.awaiting}</dd></div>
        <div><dt>Gross pay</dt><dd>${amt(s.gross)}</dd></div>
        <div><dt>Deductions</dt><dd>${amt(s.deductions)}</dd></div>
      </dl>
    </div>

    <section class="block"><header><h2>Six months of net payroll</h2><span class="label">Cancelled records excluded</span></header>
      ${columnChart(d.trend)}</section>

    <div class="cols even">
      <section class="block"><header><h2>Net pay by department</h2><span class="label">${monthName(d.month, 'short')}</span></header>
        ${d.byDepartment.length ? barList(d.byDepartment) : h`<div class="empty">Nothing to show until payroll is run.</div>`}</section>
      <section class="block"><header><h2>Journal</h2><a class="link" href="#/audit">All entries</a></header>
        ${d.recentAudit.length ? h`<ol class="journal">${d.recentAudit.map((a) => h`<li><time datetime="${a.actionTime}">${fmtStamp(a.actionTime)}</time>
          <span><span class="stamp ${STAMP_CLASS[a.action] || ''}">${a.action.toLowerCase()}</span></span>
          <span class="what"><b>${a.empName}</b> <span class="muted">${a.payMonth}</span><small>by ${a.actionBy}${a.details ? ' - ' + a.details : ''}</small></span></li>`)}</ol>`
          : h`<div class="empty">The journal is empty.</div>`}</section>
    </div>`);
}
