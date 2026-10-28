// Builds Payroll-Management-System.pptx  (node build.js)
const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/root/.claude/skills/synced/02812373-138d-4a58-874b-33e46fa50871_be6bfb8c-6762-4ee8-8d34-26939a1b2495/pptx/scripts/apply_theme.js");

const OUT = path.join(__dirname, "Payroll-Management-System.pptx");
const IMG = (f) => path.join(__dirname, "images", f);

// ---- visual identity: "ledger" - deep ledger green, white paper, ochre for money / emphasis
const THEME = {
  name: "Ledger",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1E2A27", lt1: "FFFFFF", dk2: "1F3A32", lt2: "EDF2EF",
    accent1: "2F6B5A", accent2: "B7791F", accent3: "56788C", accent4: "8A5A44", accent5: "6B7773", accent6: "A33B3B",
    hlink: "2F6B5A", folHlink: "56788C",
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Payroll Management System";
pres.subject = "Project presentation";
const C = pres.SchemeColor;
const W = 13.333, H = 7.5, MX = 0.7, CW = W - 2 * MX; // content width 11.933

// ---- layouts
const darkBg = [{ rect: { x: 0, y: 0, w: W, h: H, fill: { color: C.text2 } } }];
pres.defineSlideMaster({
  title: "TITLE",
  objects: [...darkBg,
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 1.75, w: 5.7, h: 2.1, fontSize: 40, bold: true, color: C.background1, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: "FFFFFF" },
  slideNumber: { x: W - MX - 0.6, y: 7.0, w: 0.6, h: 0.3, fontSize: 11, color: "6B7773", align: "right" },
  objects: [
    { text: { text: "Payroll Management System", options: { x: MX, y: 7.0, w: 5, h: 0.3, fontSize: 11, color: C.accent5, margin: 0 } } },
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.5, w: CW, h: 1.0, fontSize: 30, bold: true, color: C.text2, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CLOSING",
  objects: [...darkBg,
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 2.2, w: 9.6, h: 2.2, fontSize: 38, bold: true, color: C.background1, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
});

// ---- helpers
const txt = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, margin: 0, valign: "top", color: C.text1 }, o));
const ink = C.text1, muted = C.accent5, green = C.text2;
const run = (text, options) => ({ text, options });

function content(title, notes, section) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  if (notes) s.addNotes(notes);
  return s;
}

// =============== 1. Title ===============
pres.addSection({ title: "Introduction" });
{
  const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Introduction" });
  txt(s, "Project presentation", { x: MX, y: 1.2, w: 5.7, h: 0.4, fontSize: 16, color: C.accent2 });
  s.addText("Payroll Management System", { placeholder: "title" });
  txt(s, "A Java Swing desktop application that takes a company from attendance to payslip: employee records, salary calculation, approval and audit, stored in MySQL.",
    { x: MX, y: 4.05, w: 5.5, h: 1.5, fontSize: 18, color: C.background2 });
  txt(s, "Java 17  ·  Swing  ·  JDBC  ·  MySQL", { x: MX, y: 6.55, w: 5.7, h: 0.35, fontSize: 14, color: C.background2 });
  s.addImage({ path: IMG("admin-reports.png"), x: 6.95, y: 1.75, w: 5.7, h: 5.7 * 720 / 1180, altText: "Reports screen of the application showing a payroll table and a net salary by department chart" });
  txt(s, "Reports screen of the running application (demo data)", { x: 6.95, y: 5.4, w: 5.7, h: 0.3, fontSize: 12, color: C.background2 });
  s.addNotes("Introduce the project: a desktop payroll system built with Java Swing for the screens, JDBC for data access and MySQL for storage. The screenshot is the real application running on demo data.");
}

// =============== 2. Scope ===============
pres.addSection({ title: "Problem and scope" });
{
  const s = content("The system covers the full monthly payroll cycle, from attendance to payslip",
    "Walk through the six jobs the system does, then the three kinds of user. The scheduler is not a person: it is a timer inside the app that runs last month's payroll on the 1st.", "Problem and scope");
  const items = [
    "Keep employee, department and salary-structure records",
    "Record daily attendance: present, absent or on leave",
    "Calculate each month's salary, reducing basic pay for absences",
    "Review, verify and pay each payroll record",
    "Give every employee a payslip they can download as PDF",
    "Keep an audit trail of every payroll action",
  ];
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: { type: "number" }, breakLine: i < items.length - 1, paraSpaceAfter: 12 } })),
    { isTextBox: true, x: MX, y: 1.85, w: 6.3, h: 4.6, fontSize: 19, color: C.text1, margin: 0, valign: "top" });
  s.addShape(pres.ShapeType.rect, { x: 7.7, y: 1.85, w: 4.93, h: 3.75, fill: { color: C.background2 }, line: { type: "none" } });
  txt(s, "Who uses it", { x: 8.05, y: 2.1, w: 4.3, h: 0.4, fontSize: 20, bold: true, color: green });
  const who = [
    ["Admin / HR", "Maintains the data, runs payroll and approves it"],
    ["Employee", "Sees their profile, attendance and verified payslips"],
    ["Payroll scheduler", "Runs the previous month's payroll on the 1st, while the app is open"],
  ];
  const runs = [];
  who.forEach(([a, b], i) => {
    runs.push(run(a, { bold: true, fontSize: 17, breakLine: true, color: C.text2 }));
    runs.push(run(b, { fontSize: 16, breakLine: i < who.length - 1, paraSpaceAfter: 14 }));
  });
  s.addText(runs, { isTextBox: true, x: 8.05, y: 2.7, w: 4.3, h: 2.8, margin: 0, valign: "top", color: C.text1 });
}

// =============== 3. Stack ===============
pres.addSection({ title: "Design" });
{
  const s = content("A conventional Java stack: Swing, JDBC and MySQL",
    "Nothing exotic here. Each library does one job: FlatLaf for the look, HikariCP for pooled connections, jBCrypt for password hashes, OpenPDF for payslips.", "Design");
  const hdr = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text2 }, fontSize: 16 } });
  const cell = (t, o) => ({ text: t, options: Object.assign({ fontSize: 16, color: C.text1 }, o) });
  const rows = [
    [hdr("Concern"), hdr("Technology"), hdr("Used for")],
    ["Interface", "Java Swing + FlatLaf", "Login window, admin dashboard, employee portal"],
    ["Business logic", "Java 17 services", "Payroll calculation, authentication, reports, scheduler"],
    ["Data access", "JDBC + HikariCP", "PreparedStatement DAOs, pooled connections, transactions"],
    ["Database", "MySQL", "Seven tables with foreign keys and unique constraints"],
    ["Passwords", "jBCrypt", "Salted one-way password hashes"],
    ["Documents", "OpenPDF", "Payslip PDF (CSV export is written by hand)"],
    ["Build and test", "Maven, JUnit 5, H2", "19 automated tests plus a UI smoke test"],
  ].map((r, i) => (i === 0 ? r : r.map((t, j) => cell(t, { bold: j === 0, fill: { color: i % 2 ? C.background1 : C.background2 } }))));
  s.addTable(rows, { x: MX, y: 1.8, w: CW, colW: [2.4, 3.1, 6.433], rowH: 0.56, valign: "middle", border: { type: "none" }, margin: [0, 0.14, 0, 0.14] });
}

// =============== 4. Architecture ===============
{
  const s = content("Four layers keep screens, business rules and SQL apart",
    "Read the stack top to bottom. The key idea: screens never contain SQL, and the salary maths never touches the database, which is why it can be unit-tested on its own.", "Design");
  const layers = [
    ["Interface", "LoginFrame · AdminDashboard · EmployeePortal · eight tab panels", C.accent3],
    ["Services", "AuthService · EmployeeService · AttendanceService · PayrollService · PayrollCalculator · ReportService · PayslipService · PayrollScheduler", C.accent1],
    ["Data access", "UserDAO · EmployeeDAO · DepartmentDAO · SalaryStructureDAO · AttendanceDAO · PayrollDAO · AuditDAO", C.text2],
    ["Database", "MySQL, reached through DBConnection (HikariCP pool and transactions)", C.accent2],
  ];
  const bx = MX, bw = 6.9, bh = 1.0, gap = 0.34;
  layers.forEach(([name, parts, col], i) => {
    const y = 1.75 + i * (bh + gap);
    s.addShape(pres.ShapeType.rect, { x: bx, y, w: bw, h: bh, fill: { color: col }, line: { type: "none" } });
    txt(s, name, { x: bx + 0.2, y: y + 0.08, w: bw - 0.4, h: 0.32, fontSize: 16, bold: true, color: C.background1 });
    txt(s, parts, { x: bx + 0.2, y: y + 0.42, w: bw - 0.4, h: 0.56, fontSize: 12.5, color: C.background1 });
    if (i < layers.length - 1) {
      s.addShape(pres.ShapeType.line, { x: bx + bw / 2, y: y + bh + 0.02, w: 0, h: gap - 0.04, line: { color: C.accent5, width: 1.75, endArrowType: "triangle" } });
    }
  });
  const rx = 8.1, rw = W - MX - rx;
  const notes = [
    ["Screens call services, never SQL", "Slow work runs in a SwingWorker, so the window never freezes."],
    ["Services own the rules", "Validation, status changes and the salary formula live here. PayrollCalculator has no database access."],
    ["DAOs only run SQL", "Every query is a PreparedStatement. Inside inTransaction, all DAO calls share one connection and commit or roll back together."],
  ];
  const runs = [];
  notes.forEach(([a, b], i) => {
    runs.push(run(a, { bold: true, fontSize: 17, color: C.text2, breakLine: true }));
    runs.push(run(b, { fontSize: 15, breakLine: i < notes.length - 1, paraSpaceAfter: 16 }));
  });
  s.addText(runs, { isTextBox: true, x: rx, y: 1.75, w: rw, h: 5.0, margin: 0, valign: "top", color: C.text1 });
}

// =============== 5. Data model ===============
{
  const s = content("Seven tables hold everything, and payroll is unique per employee and month",
    "Accounts for both admins and employees live in users; employee adds the HR fields and shares the same key. The UNIQUE(emp_id, pay_month) constraint is what makes a payroll run safe to repeat.", "Design");
  const colW = 2.85, cx = [MX, 3.8, 6.9, 10.0];
  const box = (x, y, h, name, lines) => {
    s.addShape(pres.ShapeType.rect, { x, y, w: colW, h: 0.38, fill: { color: C.text2 }, line: { type: "none" } });
    txt(s, name, { x: x + 0.12, y: y + 0.05, w: colW - 0.24, h: 0.3, fontSize: 14, bold: true, color: C.background1 });
    s.addShape(pres.ShapeType.rect, { x, y: y + 0.38, w: colW, h: h - 0.38, fill: { color: C.background2 }, line: { type: "none" } });
    txt(s, lines.join("\n"), { x: x + 0.12, y: y + 0.46, w: colW - 0.24, h: h - 0.5, fontSize: 12.5, color: C.text1 });
  };
  const r1 = 1.75, r2 = 4.45, h1 = 1.85, h2 = 1.95;
  box(cx[0], r1, h1, "users", ["id (PK)", "name, email, username", "password_hash, role", "failed_attempts, locked_until"]);
  box(cx[1], r1, h1, "employee", ["emp_id (PK, FK to users)", "designation, joining_date", "basic_salary, is_active", "dept_id (FK)"]);
  box(cx[2], r1, h1, "department", ["dept_id (PK)", "dept_name (unique)", "location"]);
  box(cx[0], r2, h2, "salary_structure", ["emp_id (unique, FK)", "hra_percent, da_percent", "pf_percent, tax_percent"]);
  box(cx[1], r2, h2, "attendance", ["emp_id (FK), att_date", "status: PRESENT / ABSENT / LEAVE", "UNIQUE (emp_id, att_date)"]);
  box(cx[2], r2, h2, "payroll", ["emp_id (FK), pay_month", "working_days, absent_days", "basic, hra, da, gross, pf, tax", "net_salary, status, mode", "UNIQUE (emp_id, pay_month)"]);
  box(cx[3], r2, h2, "payroll_audit", ["payroll_id (FK)", "action, action_by", "action_time, details"]);
  const ln = (x1, y1, x2, y2) => s.addShape(pres.ShapeType.line, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: { color: C.accent5, width: 1.5 } });
  const lab = (t, x, y) => txt(s, t, { x, y, w: 0.4, h: 0.25, fontSize: 12, bold: true, color: C.accent2 });
  // users - employee, employee - department (horizontal, mid height of row 1)
  ln(cx[0] + colW, r1 + 0.95, cx[1], r1 + 0.95); lab("1", cx[0] + colW + 0.04, r1 + 0.68); lab("1", cx[1] - 0.2, r1 + 0.68);
  ln(cx[1] + colW, r1 + 0.95, cx[2], r1 + 0.95); lab("*", cx[1] + colW + 0.06, r1 + 0.68); lab("1", cx[2] - 0.2, r1 + 0.68);
  // employee down to row 2
  const ex = cx[1] + colW / 2, ymid = r1 + h1 + 0.32;
  ln(ex, r1 + h1, ex, r2); lab("1", ex + 0.06, r1 + h1 + 0.02); lab("*", ex + 0.06, r2 - 0.28);
  ln(cx[0] + colW / 2, ymid, ex, ymid); ln(cx[0] + colW / 2, ymid, cx[0] + colW / 2, r2); lab("1", cx[0] + colW / 2 + 0.06, r2 - 0.28);
  ln(ex, ymid, cx[2] + colW / 2, ymid); ln(cx[2] + colW / 2, ymid, cx[2] + colW / 2, r2); lab("*", cx[2] + colW / 2 + 0.06, r2 - 0.28);
  // payroll - audit
  ln(cx[2] + colW, r2 + 0.95, cx[3], r2 + 0.95); lab("1", cx[2] + colW + 0.04, r2 + 0.68); lab("*", cx[3] - 0.2, r2 + 0.68);
  txt(s, "1 = one row, * = many rows. Each of employee's children (salary structure, attendance, payroll) references it by emp_id.", { x: cx[3] - 0.0, y: r1 + 0.1, w: colW, h: 1.6, fontSize: 13, color: C.accent5 });
}

// =============== 6. Admin features ===============
pres.addSection({ title: "Features" });
{
  const s = content("HR runs the whole payroll cycle from one dashboard",
    "Each tab in the screenshot is one feature area. Highlight Run Payroll: that is where the calculation, verification and payment happen. Screenshot uses demo employees.", "Features");
  const iw = CW, ih = iw * 335 / 1180;
  s.addImage({ path: IMG("admin-run-payroll.png"), x: MX, y: 1.65, w: iw, h: ih, altText: "Admin dashboard on the Run Payroll tab listing five payroll records for the demo month" });
  txt(s, "Admin dashboard, Run Payroll tab (demo data)", { x: MX, y: 1.65 + ih + 0.06, w: 6, h: 0.28, fontSize: 12, color: C.accent5 });
  const colA = [
    ["Employees", "add, edit, search, deactivate, reset password"],
    ["Departments", "add, rename; delete blocked while staffed"],
    ["Salary structure", "HRA, DA, PF and tax % per employee"],
    ["Attendance", "mark present, absent or leave per day"],
  ];
  const colB = [
    ["Run Payroll", "generate, verify, pay, cancel, reprocess"],
    ["Reports", "payroll, attendance, employee; CSV export"],
    ["Audit log", "who changed which record, and when"],
    ["Overview", "headcount and last month's totals"],
  ];
  const mk = (arr) => {
    const r = [];
    arr.forEach(([a, b], i) => {
      r.push(run(a + "  ", { bold: true, color: C.text2, fontSize: 16 }));
      r.push(run(b, { fontSize: 15, breakLine: i < arr.length - 1, paraSpaceAfter: 7 }));
    });
    return r;
  };
  const y = 1.65 + ih + 0.5;
  s.addText(mk(colA), { isTextBox: true, x: MX, y, w: 5.8, h: 1.9, margin: 0, valign: "top", color: C.text1 });
  s.addText(mk(colB), { isTextBox: true, x: MX + 6.1, y, w: 5.8, h: 1.9, margin: 0, valign: "top", color: C.text1 });
}

// =============== 7. Employee features ===============
{
  const s = content("Employees see only their own data, and payslips only after HR verifies the month",
    "The payslip list only contains months whose payroll is VERIFIED or PAID, so an employee never sees a figure that HR might still change. The PDF is generated on demand with OpenPDF.", "Features");
  const items = [
    ["Profile", "Edit name and email, change password"],
    ["Attendance", "Pick a month; see marked days with absent and leave totals"],
    ["Payslips", "Lists verified and paid months only; full breakdown from basic to net"],
    ["Download", "Save any payslip as a PDF"],
  ];
  const r = [];
  items.forEach(([a, b], i) => {
    r.push(run(a, { bold: true, color: C.text2, fontSize: 18, breakLine: true }));
    r.push(run(b, { fontSize: 16, breakLine: i < items.length - 1, paraSpaceAfter: 16 }));
  });
  s.addText(r, { isTextBox: true, x: MX, y: 1.95, w: 4.4, h: 4.6, margin: 0, valign: "top", color: C.text1 });
  const iw = 7.0, ih = iw * 600 / 900;
  s.addImage({ path: IMG("employee-payslip.png"), x: W - MX - iw, y: 1.8, w: iw, h: ih, altText: "Employee portal Payslips tab showing a payslip with basic, HRA, DA, gross, PF, tax, deductions and net salary" });
  txt(s, "Employee portal, My Payslips tab (demo data)", { x: W - MX - iw, y: 1.8 + ih + 0.06, w: iw, h: 0.28, fontSize: 12, color: C.accent5 });
}

// =============== 8. How a run works ===============
pres.addSection({ title: "How it works" });
{
  const s = content("A payroll run is a single transaction: every employee is processed, or none",
    "This is the heart of the system. Whether HR clicks Run Payroll or the scheduler fires on the 1st, the same service method runs. If anything fails, nothing is saved, and because rows are unique per employee and month, running it again is safe.", "How it works");
  const steps = [
    ["Start", "HR clicks Run Payroll, or the scheduler fires on the 1st"],
    ["Check", "Month not in the future; open the transaction"],
    ["Load", "Fetch all active employees"],
    ["Decide", "Skip if already processed or joined later; check basic salary"],
    ["Calculate", "Read structure and absent days; apply the formula"],
    ["Save", "Insert the payroll row and a GENERATED audit row"],
  ];
  const bw = 1.78, gap = (CW - 6 * bw) / 5, y = 1.8, bh = 2.45;
  steps.forEach(([a, b], i) => {
    const x = MX + i * (bw + gap);
    const loop = i >= 3;
    s.addShape(pres.ShapeType.rect, { x, y, w: bw, h: bh, fill: { color: loop ? C.background2 : C.text2 }, line: { type: "none" } });
    txt(s, a, { x: x + 0.14, y: y + 0.15, w: bw - 0.28, h: 0.35, fontSize: 17, bold: true, color: loop ? C.text2 : C.background1 });
    txt(s, b, { x: x + 0.14, y: y + 0.6, w: bw - 0.28, h: bh - 0.7, fontSize: 14, color: loop ? C.text1 : C.background1 });
    if (i < 5) s.addShape(pres.ShapeType.line, { x: x + bw + 0.03, y: y + bh / 2, w: gap - 0.06, h: 0, line: { color: C.accent5, width: 1.75, endArrowType: "triangle" } });
  });
  const lx = MX + 3 * (bw + gap);
  txt(s, "Repeated for each active employee", { x: lx, y: y + bh + 0.1, w: 3 * bw + 2 * gap, h: 0.3, fontSize: 13, italic: true, color: C.accent5 });
  // outcomes
  const oy = 5.0;
  s.addShape(pres.ShapeType.rect, { x: MX, y: oy, w: 5.85, h: 1.55, fill: { color: C.background2 }, line: { type: "none" } });
  s.addShape(pres.ShapeType.rect, { x: MX + 6.08, y: oy, w: 5.85, h: 1.55, fill: { color: C.background2 }, line: { type: "none" } });
  s.addText([run("All employees processed", { bold: true, color: C.accent1, fontSize: 17, breakLine: true }),
    run("COMMIT. HR sees a summary: records created, skipped, and any employees that could not be processed.", { fontSize: 15 })],
    { isTextBox: true, x: MX + 0.25, y: oy + 0.2, w: 5.35, h: 1.2, margin: 0, valign: "top", color: C.text1 });
  s.addText([run("Any error along the way", { bold: true, color: C.accent6, fontSize: 17, breakLine: true }),
    run("ROLLBACK. Nothing is saved, so there are no half-finished months. Run it again once the cause is fixed.", { fontSize: 15 })],
    { isTextBox: true, x: MX + 6.33, y: oy + 0.2, w: 5.35, h: 1.2, margin: 0, valign: "top", color: C.text1 });
}

// =============== 9. Salary calculation ===============
{
  const s = content("Absences reduce basic pay, and the other amounts follow",
    "Work through the formula once, then the worked example on the right. Only ABSENT days reduce pay; leave is paid, and days with no record count as present. The example numbers come straight from the unit test.", "How it works");
  const f = [
    ["Working days", "Monday to Friday days in the month"],
    ["Basic", "basic salary × (working − absent) ÷ working"],
    ["HRA, DA", "basic × HRA %, basic × DA %"],
    ["Gross", "basic + HRA + DA"],
    ["PF, Tax", "PF = basic × PF %,  Tax = gross × tax %"],
    ["Net salary", "gross − (PF + Tax)"],
  ];
  const r = [];
  f.forEach(([a, b], i) => {
    r.push(run(a, { bold: true, color: C.text2, fontSize: 16, breakLine: true }));
    r.push(run(b, { fontSize: 17, breakLine: i < f.length - 1, paraSpaceAfter: 11 }));
  });
  s.addText(r, { isTextBox: true, x: MX, y: 1.8, w: 5.7, h: 4.3, margin: 0, valign: "top", color: C.text1 });
  txt(s, "Leave is paid; days with no record count as present. A new employee starts with HRA 20, DA 10, PF 12 and tax 5 percent, editable per employee.",
    { x: MX, y: 6.0, w: 5.7, h: 0.8, fontSize: 14, color: C.accent5 });

  const tx = 7.0, tw = W - MX - tx;
  txt(s, "Worked example: basic salary 60,000, no absences", { x: tx, y: 1.8, w: tw, h: 0.35, fontSize: 16, bold: true, color: C.text2 });
  const c1 = (t, o) => ({ text: t, options: Object.assign({ fontSize: 16, color: C.text1 }, o) });
  const money = [
    ["Basic", "60,000.00"], ["HRA (20%)", "12,000.00"], ["DA (10%)", "6,000.00"], ["Gross salary", "78,000.00"],
    ["PF (12% of basic)", "7,200.00"], ["Tax (5% of gross)", "3,900.00"], ["Total deductions", "11,100.00"], ["Net salary", "66,900.00"],
  ];
  const rows = money.map(([a, b], i) => {
    const strong = a === "Gross salary" || a === "Total deductions";
    const last = i === money.length - 1;
    const fill = { color: last ? C.text2 : (i % 2 ? C.background1 : C.background2) };
    const col = last ? C.background1 : C.text1;
    return [c1(a, { bold: strong || last, fill, color: col }), c1(b, { bold: strong || last, align: "right", fill, color: col })];
  });
  s.addTable(rows, { x: tx, y: 2.3, w: tw, colW: [tw - 1.9, 1.9], rowH: 0.46, valign: "middle", border: { type: "none" }, margin: [0, 0.14, 0, 0.14] });
  txt(s, "With one absent day out of 23 working days (January 2025), basic becomes 57,391.30 before the percentages apply. Figures are from the project's unit tests.",
    { x: tx, y: 6.2, w: tw, h: 0.65, fontSize: 13, color: C.accent5 });
}

// =============== 10. Lifecycle ===============
{
  const s = content("A payroll record moves through four states, and PAID is final",
    "Generated is where HR can still recalculate. Verified releases the payslip to the employee. Paid is final. Cancel is possible before payment; a cancelled record can be reprocessed back to Generated with fresh figures. Every move is written to the audit log.", "How it works");
  const st = (x, y, name, col) => {
    s.addShape(pres.ShapeType.roundRect, { x, y, w: 2.5, h: 0.9, rectRadius: 0.12, fill: { color: col }, line: { type: "none" } });
    txt(s, name, { x, y, w: 2.5, h: 0.9, fontSize: 18, bold: true, color: C.background1, align: "center", valign: "middle" });
  };
  const arrow = (x1, y1, x2, y2) => s.addShape(pres.ShapeType.line, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipV: y2 < y1, line: { color: C.accent5, width: 1.75, endArrowType: "triangle" } });
  const seg = (x1, y1, x2, y2) => s.addShape(pres.ShapeType.line, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: { color: C.accent5, width: 1.75 } });
  const lab = (t, x, y, w) => txt(s, t, { x, y, w: w || 1.3, h: 0.28, fontSize: 13, italic: true, color: C.accent5 });
  const y0 = 2.1;
  st(0.7, y0, "GENERATED", C.accent3);
  st(4.55, y0, "VERIFIED", C.accent1);
  st(8.4, y0, "PAID", C.text2);
  arrow(3.2, y0 + 0.45, 4.55, y0 + 0.45); lab("verify()", 3.42, y0 + 0.12, 1.0);
  arrow(7.05, y0 + 0.45, 8.4, y0 + 0.45); lab("markPaid()", 7.2, y0 + 0.12, 1.1);
  txt(s, "final", { x: 8.4, y: y0 + 0.98, w: 2.5, h: 0.28, fontSize: 13, italic: true, color: C.accent5, align: "center" });
  // cancelled below
  const cy = 4.35;
  st(2.6, cy, "CANCELLED", C.accent6);
  seg(1.45, y0 + 0.9, 1.45, cy + 0.45); arrow(1.45, cy + 0.45, 2.6, cy + 0.45); lab("cancel()", 1.52, cy + 0.12, 1.0);
  arrow(4.7, y0 + 0.9, 4.7, cy); lab("cancel()", 4.8, 3.35, 1.0);
  arrow(3.0, cy, 3.0, y0 + 0.9); lab("reprocess()", 3.1, 3.35, 1.2);
  // meanings
  const mx = 6.1, mw = W - MX - mx;
  const mean = [
    ["GENERATED", C.accent3, "Figures calculated. HR can recalculate from the latest attendance and salary structure. Hidden from the employee."],
    ["VERIFIED", C.accent1, "Approved by HR. The employee can now see and download the payslip."],
    ["PAID", C.text2, "Payment recorded. No further changes."],
    ["CANCELLED", C.accent6, "Left out of month totals. Can be reprocessed."],
  ];
  const r = [];
  mean.forEach(([n, col, d], i) => {
    r.push(run(n + "  ", { bold: true, color: col, fontSize: 16 }));
    r.push(run(d, { fontSize: 16, breakLine: i < mean.length - 1, paraSpaceAfter: 14 }));
  });
  s.addText(r, { isTextBox: true, x: mx, y: 4.0, w: mw, h: 2.8, margin: 0, valign: "top", color: C.text1 });
  txt(s, "recalculate() keeps a record in GENERATED. Each change also writes a row to the audit log.", { x: MX, y: 5.85, w: 5.1, h: 0.7, fontSize: 14, color: C.accent5 });
}

// =============== 11. Safeguards ===============
pres.addSection({ title: "Quality" });
{
  const s = content("Safeguards cover logins, data integrity and the payroll run",
    "Group these into accounts and data. The point for a payroll system: money figures cannot be duplicated, silently changed or traced to nobody.", "Quality");
  const col = (head, arr, x) => {
    txt(s, head, { x, y: 1.85, w: 5.6, h: 0.4, fontSize: 22, bold: true, color: C.text2, fontFace: "+mj-lt" });
    const r = [];
    arr.forEach(([a, b], i) => {
      r.push(run(a + "  ", { bold: true, fontSize: 16, color: C.text1 }));
      r.push(run(b, { fontSize: 16, breakLine: i < arr.length - 1, paraSpaceAfter: 14 }));
    });
    s.addText(r, { isTextBox: true, x, y: 2.45, w: 5.6, h: 4.2, margin: 0, valign: "top", color: C.text1 });
  };
  col("Accounts", [
    ["Hashed passwords.", "BCrypt with a salt; plain text is never stored."],
    ["Lockout.", "Five wrong passwords lock the account for 15 minutes."],
    ["Soft delete.", "A deactivated employee cannot log in, but payroll history stays intact."],
    ["Role-based windows.", "Admins and employees get different screens."],
  ], MX);
  col("Data and payroll", [
    ["PreparedStatements", "for every query, so input never becomes SQL."],
    ["Unique per employee and month,", "so a payroll cannot be created twice."],
    ["Constraints.", "Foreign keys and CHECK rules reject invalid rows."],
    ["Audit rows", "for every generate, recalculate, verify, pay, cancel and reprocess."],
    ["CSV export", "neutralises cells that start like spreadsheet formulas."],
  ], MX + 6.3);
}

// =============== 12. Verification and limits ===============
{
  const s = content("Tested end to end; the remaining gaps are known",
    "Be straightforward about scope. The workflow suite passes on H2 and on a MariaDB server; MySQL 8 itself has not been run, though the SQL is standard. The limitations on the right are the natural next steps.", "Quality");
  txt(s, "19", { x: MX, y: 1.75, w: 1.6, h: 0.95, fontSize: 60, bold: true, color: C.accent2, fontFace: "+mj-lt" });
  txt(s, "automated tests pass", { x: MX + 1.65, y: 2.12, w: 3.8, h: 0.5, fontSize: 20, bold: true, color: C.text2 });
  const left = [
    "5 cover the salary maths; 14 run the full workflow: login and lockout, payroll runs, status changes, payslip PDF, reports and rollback",
    "The workflow suite passes on in-memory H2 and on a MariaDB 10.11 server",
    "A UI smoke test opens every window against demo data",
    "Not yet run against MySQL 8 itself",
  ];
  s.addText(left.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < left.length - 1, paraSpaceAfter: 10 } })),
    { isTextBox: true, x: MX, y: 3.0, w: 5.5, h: 3.7, fontSize: 16, color: C.text1, margin: 0, valign: "top" });
  txt(s, "Limitations and future work", { x: 7.0, y: 1.85, w: 5.6, h: 0.4, fontSize: 22, bold: true, color: C.text2, fontFace: "+mj-lt" });
  const right = [
    "The automatic run needs the app open on the 1st; HR can always run it manually",
    "Tax is a flat percentage, with no tax slabs",
    "Employees who join mid-month are not pro-rated",
    "One currency, one company, desktop only",
    "No concurrency testing with many simultaneous users",
  ];
  s.addText(right.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < right.length - 1, paraSpaceAfter: 10 } })),
    { isTextBox: true, x: 7.0, y: 2.45, w: 5.6, h: 4.2, fontSize: 16, color: C.text1, margin: 0, valign: "top" });
}

// =============== 13. Closing ===============
{
  const s = pres.addSlide({ masterName: "CLOSING", sectionTitle: "Quality" });
  s.addText("One calculation engine, one audit trail, two kinds of users", { placeholder: "title" });
  txt(s, "Questions?", { x: MX, y: 4.75, w: 6, h: 0.6, fontSize: 24, color: C.accent2, fontFace: "+mj-lt" });
  txt(s, "Source code, UML diagrams and tests are in the project folder payroll-system/", { x: MX, y: 6.4, w: 9, h: 0.4, fontSize: 14, color: C.background2 });
  s.addNotes("Close with the three ideas: a single place where salary is calculated, a complete audit trail, and separate experiences for HR and employees. Then take questions.");
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})();
