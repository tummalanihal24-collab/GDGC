package com.payroll.web;

import com.payroll.service.AttendanceService;
import com.payroll.service.AuthService;
import com.payroll.service.DepartmentService;
import com.payroll.service.EmployeeService;
import com.payroll.service.PayrollService;
import com.payroll.service.PayslipService;
import com.payroll.service.ReportService;

/** The service objects shared by every route. They hold no state, so one instance each is enough. */
final class Svc {
    static final AuthService auth = new AuthService();
    static final EmployeeService employees = new EmployeeService();
    static final DepartmentService departments = new DepartmentService();
    static final AttendanceService attendance = new AttendanceService();
    static final PayrollService payroll = new PayrollService();
    static final PayslipService payslips = new PayslipService();
    static final ReportService reports = new ReportService();

    private Svc() {
    }
}
