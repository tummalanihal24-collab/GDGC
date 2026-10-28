from dg import Canvas, tw

SZ = 12


def auto_w(name, attrs, methods, stereotype=None, minw=150):
    w = max([tw(s, SZ) for s in attrs + methods] + [tw(name, 14, True), tw(f"<<{stereotype}>>", 11.5) if stereotype else 0]) + 22
    return max(w, minw)


def box(c, x, y, name, attrs, methods, stereotype=None, w=None, abstract=False):
    w = w or auto_w(name, attrs, methods, stereotype)
    return c.class_box(x, y, w, name, attrs, methods, stereotype=stereotype, size=SZ, abstract=abstract)


def row(c, items, x, y, gap=34):
    out = []
    for it in items:
        b = box(c, x, y, *it[:3], **(it[3] if len(it) > 3 else {}))
        out.append(b)
        x += b[2] + gap
    return out


def frame(c, x, y, w, h, label):
    c.rect(x, y, w, h, rx=6, sw=1.4, dash="8 5", fill="none")
    tw_ = tw(label, 13, True) + 22
    c.rect(x, y - 24, tw_, 24, rx=3, sw=1.4, fill="#fff")
    c.text(x + 11, y - 7, label, 13, bold=True)


def build():
    W = 2020
    c = Canvas(W, 2330, "2", "Class Diagram")
    X0, FW = 30, W - 130

    # ============ model ============
    y0 = 160
    frame(c, X0, y0, FW, 640, "package com.payroll.model")
    person = box(c, 60, y0 + 28, "Person",
                 ["- id : int", "- name : String", "- email : String", "- username : String", "- passwordHash : String",
                  "- role : String", "- failedAttempts : int", "- lockedUntil : LocalDateTime"],
                 ["+ getRole() : String", "+ getName() : String", "+ getUsername() : String"], stereotype="abstract", abstract=True)
    admin = box(c, 440, y0 + 28, "Admin", [], ["+ Admin()  // role = ADMIN"])
    payslip = box(c, 800, y0 + 28, "Payslip", ["- employee : Employee", "- payroll : Payroll"], [], stereotype="record")
    audit = box(c, 1130, y0 + 28, "PayrollAudit",
                ["- auditId, payrollId : int", "- empName, payMonth : String", "- action, actionBy, details : String",
                 "- actionTime : LocalDateTime"], [], stereotype="record")
    pstatus = box(c, 1560, y0 + 28, "PayrollStatus",
                  ["GENERATED", "VERIFIED", "PAID", "CANCELLED"],
                  ["+ next() : Set<PayrollStatus>", "+ canMoveTo(target) : boolean"], stereotype="enumeration")

    ry = y0 + 28 + 300
    emp = box(c, 60, ry, "Employee",
              ["- designation : String", "- joiningDate : LocalDate", "- basicSalary : BigDecimal", "- deptId : Integer",
               "- deptName : String", "- active : boolean"],
              ["+ isActive() : boolean", "+ getBasicSalary() : BigDecimal"])
    dept = box(c, 450, ry, "Department", ["- deptId : int", "- deptName : String", "- location : String"], [], stereotype="record", w=230)
    ss = box(c, 720, ry, "SalaryStructure",
             ["- structId, empId : int", "- empName : String", "- hraPercent, daPercent : BigDecimal",
              "- pfPercent, taxPercent : BigDecimal"],
             ["+ defaults(empId, empName) : SalaryStructure"], stereotype="record")
    att = box(c, 1150, ry, "Attendance",
              ["- attendanceId, empId : int", "- empName : String", "- date : LocalDate", "- status : String"],
              ["+ PRESENT / ABSENT / LEAVE"], stereotype="record", w=250)
    pay = box(c, 1440, ry, "Payroll",
              ["- payrollId, empId : int", "- empName, payMonth, mode, generatedBy : String", "- workingDays, absentDays : int",
               "- basic, hra, da, grossSalary : BigDecimal", "- pf, tax, deductions, netSalary : BigDecimal",
               "- status : PayrollStatus", "- generatedOn : LocalDateTime"],
              ["+ withId(id) : Payroll", "+ withStatus(s) : Payroll"], stereotype="record")

    # generalization
    c.line([(emp[0] + 160, emp[1]), (emp[0] + 160, person[1] + person[3])], sw=1.6, end="tri")
    c.line([(admin[0], admin[1] + 22), (person[0] + person[2], admin[1] + 22)], sw=1.6, end="tri")
    # Employee staircase associations (farthest target = leftmost start, deepest level)
    base = emp[1] + emp[3]
    links = [(pay, 100, base + 100, "1", "0..*"), (att, 140, base + 80, "1", "0..*"),
             (ss, 180, base + 60, "1", "1"), (dept, 220, base + 40, "0..*", "0..1")]
    for tgt, sx, lvl, m1, m2 in links:
        tx = tgt[0] + tgt[2] / 2
        c.line([(emp[0] + (sx - 60), base), (emp[0] + (sx - 60), lvl), (tx, lvl), (tx, tgt[1] + tgt[3])], sw=1.6)
        c.text(emp[0] + (sx - 60) + 4, base + 14, m1 if m1 != "0..*" else m1, 11.5)
        c.text(tx + 5, tgt[1] + tgt[3] + 15, m2, 11.5)
    # composition Payroll <>-- PayrollAudit, association Payroll -> PayrollStatus
    ax = audit[0] + audit[2] / 2
    c.line([(pay[0] + 40, pay[1]), (pay[0] + 40, pay[1] - 40), (ax, pay[1] - 40), (ax, audit[1] + audit[3])], sw=1.6, start="diamond")
    c.text(pay[0] + 46, pay[1] - 46, "1", 11.5)
    c.text(ax + 6, audit[1] + audit[3] + 15, "1..*", 11.5)
    sx_ = pstatus[0] + pstatus[2] / 2 + 40
    c.line([(sx_, pay[1]), (sx_, pstatus[1] + pstatus[3])], sw=1.6, end="open")
    c.text(sx_ + 6, pstatus[1] + pstatus[3] + 40, "status", 11.5, italic=True)

    # ============ service ============
    sy = y0 + 640 + 70
    s1 = row(c, [
        ("PayrollScheduler", ["- payrollService : PayrollService"], ["+ start() : void", "+ stop() : void", "+ checkNow() : void"]),
        ("PayrollService", ["+ MANUAL, AUTO : String"],
         ["+ runPayroll(month, mode, by) : RunSummary", "+ getPayrolls(month) : List<Payroll>", "+ getSummary(month) : Summary",
          "+ recalculate(payrollId, by) : void", "+ verify(payrollId, by) : void", "+ markPaid(payrollId, by) : void",
          "+ cancel(payrollId, by) : void", "+ reprocess(payrollId, by) : void"]),
        ("PayrollCalculator", [], ["+ workingDays(month) : int",
                                    "+ calculate(emp, structure, month,", "      absentDays, mode, by) : Payroll"], {"stereotype": "utility"}),
        ("AuthService", [], ["+ hashPassword(pw) : String", "+ verifyPassword(pw, hash) : boolean", "+ login(username, pw) : Person",
                              "+ changePassword(id, current, new) : void", "+ resetPassword(id, new) : void"]),
    ], X0 + 30, sy + 28)
    s2y = sy + 28 + 215
    s2 = row(c, [
        ("EmployeeService", [], ["+ addEmployee(e, password) : Employee", "+ updateEmployee(e) : void", "+ setActive(id, active) : void",
                                  "+ search(deptId, inactive, kw) : List<Employee>", "+ updateProfile(p, name, email) : void",
                                  "+ getSalaryStructure(empId) : SalaryStructure", "+ listSalaryStructures() : List<SalaryStructure>",
                                  "+ saveSalaryStructure(s) : void"]),
        ("DepartmentService", [], ["+ getAll() : List<Department>", "+ add(name, location) : Department", "+ update(id, name, loc) : void",
                                    "+ delete(id) : void", "+ employeeCount(id) : int"]),
        ("AttendanceService", [], ["+ markAttendance(empId, date, status) : void", "+ markAllPresent(date) : void",
                                    "+ dayView(date) : List<Object[]>", "+ getAttendance(empId, month) : List<Attendance>",
                                    "+ countAbsences(empId, month) : int"]),
        ("ReportService", [], ["+ payrollReport(month) : TableData", "+ attendanceReport(month) : TableData",
                                "+ employeeReport(deptId, inactive) : TableData", "+ netSalaryByDepartment(month) : Map",
                                "+ auditLog(month, action, kw) : List<PayrollAudit>"]),
        ("PayslipService", [], ["+ availablePayslips(empId) : List<Payroll>", "+ getPayslip(empId, month) : Payslip",
                                 "+ toText(slip) : String", "+ generatePdf(slip, file) : void"]),
    ], X0 + 30, s2y, gap=26)
    c.line([(s1[0][0] + s1[0][2], s1[0][1] + 60), (s1[1][0], s1[0][1] + 60)], sw=1.4, dash="6 4", end="open")
    c.text((s1[0][0] + s1[0][2] + s1[1][0]) / 2, s1[0][1] + 52, "<<use>>", 11, anchor="middle")
    c.line([(s1[1][0] + s1[1][2], s1[1][1] + 70), (s1[2][0], s1[1][1] + 70)], sw=1.4, dash="6 4", end="open")
    c.text((s1[1][0] + s1[1][2] + s1[2][0]) / 2, s1[1][1] + 62, "<<use>>", 11, anchor="middle")
    s_bottom = max(b[1] + b[3] for b in s1 + s2) + 28
    frame(c, X0, sy, FW, s_bottom - sy, "package com.payroll.service")

    # ============ dao / db ============
    dy = s_bottom + 80
    d1 = row(c, [
        ("UserDAO", [], ["+ findByUsername(username) : Person", "+ findById(id) : Person", "+ count() : int", "+ insert(p) : int",
                         "+ updateProfile(id, name, email)", "+ updatePasswordHash(id, hash)", "+ recordFailure(id, n, until)", "+ resetFailures(id)"]),
        ("EmployeeDAO", [], ["+ addEmployee(e) : void", "+ updateEmployee(e) : void", "+ setActive(id, active) : void",
                              "+ findById(empId) : Employee", "+ getEmployees(dept, active, kw)", "+ countInDepartment(deptId) : int"]),
        ("DepartmentDAO", [], ["+ addDepartment(name, loc) : int", "+ updateDepartment(d) : void", "+ deleteDepartment(id) : void",
                                "+ getDepartment(id) : Department", "+ getAll() : List<Department>"]),
        ("SalaryStructureDAO", [], ["+ getStructure(empId)", "+ getAll() : List<SalaryStructure>", "+ setStructure(s) : void"]),
        ("AttendanceDAO", [], ["+ markAttendance(empId, date, status)", "+ getAttendance(empId, from, to)", "+ getForDate(date)",
                                "+ countByStatus(empId, from, to, st)", "+ monthlySummary(from, to)"]),
    ], X0 + 30, dy + 28, gap=24)
    d1_bottom = max(b[1] + b[3] for b in d1)
    bus_y = d1_bottom + 24
    d2y = bus_y + 40
    d2 = row(c, [
        ("PayrollDAO", [], ["+ insertPayroll(p) : int", "+ updatePayroll(p) : void", "+ updateStatus(id, status) : void",
                             "+ findById(id) : Payroll", "+ findByEmployeeAndMonth(emp, month)", "+ exists(empId, month) : boolean",
                             "+ getByMonth(month) / getByEmployee(emp)", "+ getSummary(month) / netByDepartment(month)"]),
        ("AuditDAO", [], ["+ addAudit(payrollId, action, by, details)", "+ getAuditLog(month, action, kw, limit)"]),
        ("DBConnection", ["- dataSource : HikariDataSource", "- TX : ThreadLocal<Connection>"],
         ["+ init() : void", "+ configure(url, user, password) : void", "+ getConnection() : Connection",
          "+ inTransaction(work) : T", "+ close() : void"]),
        ("DatabaseInitializer", [], ["+ run() : void", "+ createSchema() : void", "+ seedIfEmpty() : void"]),
    ], X0 + 30, d2y, gap=60)
    dbc = d2[2]
    cx_db = dbc[0] + dbc[2] / 2
    xs = [b[0] + b[2] / 2 for b in d1]
    c.line([(min(xs), bus_y), (max(max(xs), cx_db), bus_y)], sw=1.4, dash="6 4")
    for b, x in zip(d1, xs):
        c.line([(x, b[1] + b[3]), (x, bus_y)], sw=1.4, dash="6 4")
    c.line([(cx_db, bus_y), (cx_db, dbc[1])], sw=1.4, dash="6 4", end="open")
    c.text(min(xs) + 10, bus_y + 18, "<<use>>  (every DAO opens its connections through DBConnection)", 11)
    a = d2[1]
    c.line([(a[0] + a[2], a[1] + 30), (dbc[0], a[1] + 30)], sw=1.4, dash="6 4", end="open")
    c.text((a[0] + a[2] + dbc[0]) / 2, a[1] + 22, "<<use>>", 11, anchor="middle")
    p = d2[0]
    low = max(p[1] + p[3], dbc[1] + dbc[3]) + 16
    c.line([(p[0] + p[2] / 2, p[1] + p[3]), (p[0] + p[2] / 2, low), (cx_db + 30, low), (cx_db + 30, dbc[1] + dbc[3])], sw=1.4, dash="6 4", end="open")
    di = d2[3]
    c.line([(di[0], di[1] + 40), (dbc[0] + dbc[2], di[1] + 40)], sw=1.4, dash="6 4", end="open")
    c.text((di[0] + dbc[0] + dbc[2]) / 2, di[1] + 32, "<<use>>", 11, anchor="middle")
    d_bottom = low + 28
    frame(c, X0, dy, FW, d_bottom - dy, "package com.payroll.dao  and  com.payroll.db")

    # service -> dao
    c.line([(X0 + FW / 2, dy), (X0 + FW / 2, s_bottom)], sw=1.6, dash="6 4", end="open")
    c.text(X0 + FW / 2 + 8, s_bottom + 44, "<<use>>", 12)

    # ============ ui ============
    uy = d_bottom + 80
    u1 = row(c, [
        ("PayrollApp", [], ["+ main(args) : void", "~ launchLogin() : void"]),
        ("LoginFrame", ["- usernameField : JTextField", "- passwordField : JPasswordField", "- loginButton : JButton"],
         ["+ clear() : void", "- doLogin() : void"], {"stereotype": "JFrame"}),
        ("AdminDashboard", ["- tabs : JTabbedPane"], ["+ AdminDashboard(admin, loginFrame)"], {"stereotype": "JFrame"}),
        ("EmployeePortal", ["- user : Person"], ["ProfileTab, AttendanceTab, PayslipTab (inner)"], {"stereotype": "JFrame"}),
        ("Refreshable", [], ["+ refresh() : void"], {"stereotype": "interface"}),
        ("Ui", [], ["+ model(cols) / table(model)", "+ async(owner, work, done)", "+ form(parent, title, labels, fields)",
                    "+ showError(parent, t)"], {"stereotype": "utility"}),
    ], X0 + 30, uy + 28, gap=26)
    u1_bottom = max(b[1] + b[3] for b in u1)
    busy = u1_bottom + 40
    pny = busy + 40
    panels = ["OverviewPanel", "EmployeePanel", "DepartmentPanel", "SalaryStructurePanel", "AttendancePanel", "PayrollPanel", "ReportsPanel",
              "AuditPanel"]
    px = X0 + 30
    pboxes = []
    for nm in panels:
        b = box(c, px, pny, nm, [], ["+ refresh() : void"], stereotype="JPanel", w=205)
        pboxes.append(b)
        px += 217
    ref = u1[4]
    rx_ = ref[0] + ref[2] / 2
    c.line([(rx_, ref[1] + ref[3]), (rx_, busy)], sw=1.5, dash="6 4", end="tri")
    c.line([(pboxes[0][0] + 102, busy), (pboxes[-1][0] + 102, busy)], sw=1.5, dash="6 4")
    for b in pboxes:
        c.line([(b[0] + 102, busy), (b[0] + 102, b[1])], sw=1.5, dash="6 4")
    c.text(rx_ + 10, busy - 8, "<<realize>>", 11)
    ey = pny + max(b[3] for b in pboxes) + 30
    extra = row(c, [("BarChart", ["- data : Map<String, BigDecimal>"], ["+ setData(title, data) : void"], {"stereotype": "JPanel"}),
                    ("ChangePasswordDialog", [], ["~ show(parent, user) : void"])], X0 + 30, ey, gap=26)
    # legend (inside the ui frame, right)
    lx = X0 + FW - 320
    ly = ey - 8
    c.rect(lx, ly, 300, 240, rx=0, sw=1.6)
    c.text(lx + 10, ly + 24, "Legend:", 13, bold=True)
    items = [("tri", None, "= Generalization (inherits)"), ("tri", "6 4", "= Realization (implements)"), (None, None, "= Association"),
             ("diamond", None, "= Composition"), ("open", "6 4", "= Dependency (uses)")]
    for i, (end, dash, txt) in enumerate(items):
        yy = ly + 50 + i * 28
        if end == "diamond":
            c.line([(lx + 12, yy), (lx + 66, yy)], sw=1.5, start="diamond")
        else:
            c.line([(lx + 12, yy), (lx + 66, yy)], sw=1.5, dash=dash, end=end)
        c.text(lx + 78, yy + 4, txt, 12)
    c.text(lx + 12, ly + 50 + 5 * 28 + 4, "1..*   = Multiplicity", 12)
    c.text(lx + 12, ly + 50 + 6 * 28 + 4, "<<record>> = Java record", 12)
    ui_bottom = max(max(b[1] + b[3] for b in extra), ly + 240) + 28
    frame(c, X0, uy, FW, ui_bottom - uy, "package com.payroll.ui")
    # ui -> service along the right margin
    mx = X0 + FW + 45
    c.line([(X0 + FW, uy + 40), (mx, uy + 40), (mx, sy + 60), (X0 + FW, sy + 60)], sw=1.6, dash="6 4", end="open")
    c.label(mx, uy + 28, "<<use>>", 12)
    c.h = int(ui_bottom + 40)
    return c


if __name__ == "__main__":
    build().save("../02-class-diagram.svg")
