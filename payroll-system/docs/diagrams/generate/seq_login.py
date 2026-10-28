from dg import Canvas
from seq import Seq


def build():
    c = Canvas(2020, 1500, "4", "Sequence Diagram - Employee Login & View Payslip")
    parts = [("Employee", "(User)", "actor"), ("LoginFrame", "(UI)", "box"), ("AuthService", "(Service)", "box"), ("UserDAO", "(DAO)", "box"),
             ("EmployeePortal", "(UI)", "box"), ("PayslipService", "(Service)", "box"), ("PayrollDAO", "(DAO)", "box"),
             ("EmployeeDAO", "(DAO)", "box"), ("MySQL", "(Database)", "box")]
    s = Seq(c, parts, 110, 1900)
    s.bw = 176
    y_start = s.y
    alt0 = s.y - 8
    s.skip(44)
    s.msg("Employee", "LoginFrame", "enterCredentials(username, password), click Login")
    s.msg("LoginFrame", "AuthService", "login(username, password)  [in SwingWorker]")
    s.msg("AuthService", "UserDAO", "findByUsername(username)")
    s.msg("UserDAO", "MySQL", "SELECT ... FROM users LEFT JOIN employee")
    s.msg("UserDAO", "AuthService", "Employee (row mapped to object)", dashed=True)
    s.self_msg("AuthService", "not locked, BCrypt.checkpw(password, hash), isActive()", w=80)
    s.msg("AuthService", "UserDAO", "resetFailures(id)  [only if earlier failures]")
    s.msg("UserDAO", "MySQL", "UPDATE users SET failed_attempts = 0")
    s.msg("AuthService", "LoginFrame", "Person (Employee)", dashed=True)
    s.msg("LoginFrame", "EmployeePortal", "new EmployeePortal(person).setVisible(true)")
    alt_div = s.y - 8
    s.skip(26)
    s.msg("AuthService", "UserDAO", "recordFailure(id, attempts, lockedUntil)")
    s.msg("UserDAO", "MySQL", "UPDATE users SET failed_attempts, locked_until")
    s.msg("AuthService", "LoginFrame", "ServiceException (invalid / locked / deactivated)", dashed=True)
    s.msg("LoginFrame", "Employee", "showError(message)", dashed=True)
    alt1 = s.y - 14
    s.fragment("alt", "Login", alt0, alt1, "Employee", "MySQL", dividers=[(alt_div, "Invalid credentials, account locked or deactivated")], pad=70)
    s.skip(28)

    y_view = s.y
    s.msg("Employee", "EmployeePortal", 'open "My Payslips" tab')
    s.msg("EmployeePortal", "PayslipService", "availablePayslips(empId)")
    s.msg("PayslipService", "PayrollDAO", "getByEmployee(empId)")
    s.msg("PayrollDAO", "MySQL", "SELECT ... FROM payroll WHERE emp_id = ?")
    s.msg("PayrollDAO", "PayslipService", "payroll rows", dashed=True)
    s.self_msg("PayslipService", "keep only status VERIFIED or PAID", w=70)
    s.msg("PayslipService", "EmployeePortal", "list of released months", dashed=True)
    s.msg("Employee", "EmployeePortal", "select a month")
    s.msg("EmployeePortal", "PayslipService", "getPayslip(empId, month)")
    s.msg("PayslipService", "PayrollDAO", "findByEmployeeAndMonth(empId, month)")
    s.msg("PayrollDAO", "MySQL", "SELECT ... WHERE emp_id = ? AND pay_month = ?")
    s.msg("PayrollDAO", "PayslipService", "Payroll", dashed=True)
    s.msg("PayslipService", "EmployeeDAO", "findById(empId)")
    s.msg("EmployeeDAO", "MySQL", "SELECT ... FROM employee JOIN users")
    s.msg("EmployeeDAO", "PayslipService", "Employee", dashed=True)
    s.msg("PayslipService", "EmployeePortal", "Payslip(employee, payroll)", dashed=True)
    s.msg("EmployeePortal", "PayslipService", "toText(payslip)")
    s.msg("PayslipService", "EmployeePortal", "formatted payslip text", dashed=True)
    s.msg("EmployeePortal", "Employee", "displayPayslip(text)", dashed=True)
    s.skip(60)
    opt0 = s.y - 8
    s.skip(26)
    s.msg("Employee", "EmployeePortal", 'click "Download PDF", choose file')
    s.msg("EmployeePortal", "PayslipService", "generatePdf(payslip, file)")
    s.self_msg("PayslipService", "build PDF with OpenPDF and save", w=70)
    s.msg("PayslipService", "EmployeePortal", "file written", dashed=True)
    s.msg("EmployeePortal", "Employee", 'info: "Saved payslip-yyyy-MM.pdf"', dashed=True)
    opt1 = s.y - 14
    s.fragment("opt", "Download Payslip", opt0, opt1, "Employee", "MySQL", pad=70)

    s.act("Employee", y_start, opt1)
    s.act("LoginFrame", s.ys[1] - 6, s.ys[10] + 12)
    s.act("AuthService", s.ys[2] - 6, s.ys[9] + 8)
    s.finish()
    c.note(1330, s.ys[30] - 10, 560, ["Payslip contains: employee details, pay month,", "working / absent days, Basic, HRA, DA, Gross,",
                                      "PF, Tax, Deductions, Net salary, generated on / by.", "Visible only after HR verifies the month."])
    return c


if __name__ == "__main__":
    build().save("../04-sequence-employee-login-view-payslip.svg")
