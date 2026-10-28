import { get } from '../api.js';
import { h, put, amt, money, monthName, fmtStamp } from '../util.js';
import { pageHead, stamp, empty } from '../ui.js';

export async function mount(root, { params }) {
  const { payslips } = await get('me/payslips');
  if (!payslips.length) {
    put(root, h`${pageHead({ eyebrow: 'Employee', title: 'Payslips' })}${empty('No payslips yet. They appear here once HR has verified a month\'s payroll.')}`);
    return;
  }
  const month = params[0] && payslips.some((p) => p.payMonth === params[0]) ? params[0] : payslips[0].payMonth;
  const slip = await get('me/payslips/' + month);
  const p = slip.payroll;

  put(root, h`${pageHead({ eyebrow: 'Employee', title: 'Payslips', lede: 'Only verified and paid months are shown.' })}
  <div class="slip-layout">
    <ul class="slip-list" aria-label="Months">${payslips.map((x) => h`<li><a href="#/payslips/${x.payMonth}" aria-current="${String(x.payMonth === month)}">
      <span><b>${monthName(x.payMonth)}</b><small>${money(x.netSalary)}</small></span>${stamp(x.status)}</a></li>`)}</ul>
    <div>
      <article class="slip" aria-label="Payslip for ${monthName(month)}">
        <header><div><div class="label">Payslip</div><h2>${slip.employeeName}</h2></div>
          <div class="period"><span class="label">Pay period</span><b>${monthName(month)}</b></div></header>
        <div class="party">
          <div><span>Employee ID</span><b class="mono">${String(slip.employeeId).padStart(4, '0')}</b></div>
          <div><span>Designation</span><b>${slip.designation || '-'}</b></div>
          <div><span>Department</span><b>${slip.department || '-'}</b></div>
          <div><span>Working days</span><b class="mono">${p.workingDays}</b></div>
          <div><span>Days absent</span><b class="mono">${p.absentDays}</b></div>
          <div><span>Basis</span><b>Mon-Fri, pro-rated</b></div>
        </div>
        <div class="sheets">
          <section><h3>Earnings</h3>
            <div class="line"><span>Basic (pro-rated)</span><span>${money(p.basic)}</span></div>
            <div class="line"><span>House rent allowance</span><span>${money(p.hra)}</span></div>
            <div class="line"><span>Dearness allowance</span><span>${money(p.da)}</span></div>
            <div class="line total"><span>Gross salary</span><span>${money(p.grossSalary)}</span></div></section>
          <section><h3>Deductions</h3>
            <div class="line"><span>Provident fund</span><span>${money(p.pf)}</span></div>
            <div class="line"><span>Income tax</span><span>${money(p.tax)}</span></div>
            <div class="line total"><span>Total deductions</span><span>${money(p.deductions)}</span></div></section>
        </div>
        <div class="net"><span>Net salary</span><strong>${amt(p.netSalary)}</strong></div>
        <footer><span>Generated ${fmtStamp(p.generatedOn)} by ${p.generatedBy}</span><span class="stamp big ${p.status}">${p.status.toLowerCase()}</span></footer>
      </article>
      <div class="slip-actions"><a class="btn primary" href="/api/me/payslips/${month}/pdf">Download PDF</a><button class="btn" type="button" id="print">Print</button></div>
    </div>
  </div>`);
  root.querySelector('#print').addEventListener('click', () => window.print());
}
