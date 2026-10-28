from dg import Canvas
from seq import Seq


def build():
    c = Canvas(2020, 1700, "3", "Sequence Diagram - Manual Payroll Run")
    parts = [("Admin / HR", "(Actor)", "actor"), ("PayrollPanel", "(UI)", "box"), ("PayrollService", "(Service)", "box"),
             ("DBConnection", "(JDBC / Hikari)", "box"), ("EmployeeDAO", "(DAO)", "box"), ("SalaryStructureDAO", "(DAO)", "box"),
             ("AttendanceDAO", "(DAO)", "box"), ("PayrollDAO", "(DAO)", "box"), ("AuditDAO", "(DAO)", "box"), ("MySQL", "(Database)", "box")]
    s = Seq(c, parts, 110, 1910)
    s.bw = 176
    y_start = s.y
    s.msg("Admin / HR", "PayrollPanel", 'Select month, click "Run Payroll"')
    s.self_msg("PayrollPanel", 'confirm("Run payroll for yyyy-MM?")', w=70)
    s.msg("PayrollPanel", "PayrollService", 'runPayroll(month, "MANUAL", admin)  [in SwingWorker]')
    a_svc = s.y - 34
    s.self_msg("PayrollService", "month is not in the future", w=60)
    s.msg("PayrollService", "DBConnection", "inTransaction(work)")
    s.msg("DBConnection", "MySQL", "setAutoCommit(false)")
    s.msg("PayrollService", "EmployeeDAO", "getEmployees(null, activeOnly, null)")
    s.msg("EmployeeDAO", "MySQL", "SELECT active employees (users + employee + department)")
    s.msg("EmployeeDAO", "PayrollService", "employee list", dashed=True)

    # loop
    loop0 = s.y - 6
    s.skip(26)
    s.msg("PayrollService", "PayrollDAO", "exists(empId, month)")
    s.msg("PayrollDAO", "MySQL", "SELECT COUNT(*) FROM payroll")
    s.msg("PayrollDAO", "PayrollService", "false", dashed=True)
    opt0 = s.y - 4
    s.skip(26)
    s.self_msg("PayrollService", "validate(employee): basic salary > 0", w=70)
    s.msg("PayrollService", "SalaryStructureDAO", "getStructure(empId)")
    s.msg("SalaryStructureDAO", "MySQL", "SELECT FROM salary_structure")
    s.msg("SalaryStructureDAO", "PayrollService", "structure (or defaults)", dashed=True)
    s.msg("PayrollService", "AttendanceDAO", 'countByStatus(empId, from, to, "ABSENT")')
    s.msg("AttendanceDAO", "MySQL", "SELECT COUNT(*) FROM attendance")
    s.msg("AttendanceDAO", "PayrollService", "absentDays", dashed=True)
    s.self_msg("PayrollService", "PayrollCalculator.calculate(...) : Payroll", w=70)
    s.msg("PayrollService", "PayrollDAO", "insertPayroll(payroll)")
    s.msg("PayrollDAO", "MySQL", "INSERT INTO payroll ...")
    s.msg("PayrollDAO", "PayrollService", "payrollId", dashed=True)
    s.msg("PayrollService", "AuditDAO", 'addAudit(id, "GENERATED", by, details)')
    s.msg("AuditDAO", "MySQL", "INSERT INTO payroll_audit ...")
    opt1 = s.y - 14
    loop1 = opt1 + 12
    s.fragment("opt", "no payroll yet and joined on/before month end", opt0, opt1, "PayrollService", "AuditDAO", pad=70)
    s.fragment("loop", "for each active employee", loop0, loop1 + 8, "PayrollService", "MySQL", pad=80)
    s.skip(26)

    # alt
    alt0 = s.y - 6
    s.skip(26)
    s.msg("PayrollService", "DBConnection", "commit")
    s.msg("DBConnection", "MySQL", "COMMIT")
    s.msg("PayrollService", "PayrollPanel", "RunSummary(created, skipped, problems, totalNet)", dashed=True)
    s.msg("PayrollPanel", "Admin / HR", "show summary dialog; refresh table (getPayrolls, getSummary)", dashed=True)
    alt_div = s.y - 6
    s.skip(26)
    s.msg("DBConnection", "MySQL", "ROLLBACK  (any exception in the run)")
    s.msg("PayrollService", "PayrollPanel", "DataAccessException / ServiceException", dashed=True)
    s.msg("PayrollPanel", "Admin / HR", "showError(message)", dashed=True)
    alt1 = s.y - 12
    s.fragment("alt", "success", alt0, alt1, "Admin / HR", "MySQL", dividers=[(alt_div, "error")], pad=70)

    # activation bars
    s.act("Admin / HR", y_start - 12, s.ys[1] + 8)
    s.act("PayrollPanel", s.ys[1] - 6, s.ys[2] + 18)
    s.act("PayrollPanel", s.ys[3] - 6, alt1 - 40)
    s.act("PayrollService", s.ys[3] - 6, alt1 - 40)
    s.finish()
    c.note(1010, 232, 760, ["Transaction: every DAO call made inside inTransaction(...) on this thread", "shares one connection. Success -> COMMIT, any exception -> ROLLBACK,",
                              "so a run creates all payrolls or none."])
    # note about the transaction (placed inside the right margin below header)
    return c, s


if __name__ == "__main__":
    c, s = build()
    c.save("../03-sequence-manual-payroll-run.svg")
