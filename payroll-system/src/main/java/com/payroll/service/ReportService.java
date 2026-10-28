package com.payroll.service;

import com.payroll.dao.AttendanceDAO;
import com.payroll.dao.AuditDAO;
import com.payroll.dao.EmployeeDAO;
import com.payroll.dao.PayrollDAO;
import com.payroll.model.Employee;
import com.payroll.model.Payroll;
import com.payroll.model.PayrollAudit;
import com.payroll.model.TableData;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ReportService {
    private final PayrollDAO payrollDao = new PayrollDAO();
    private final AttendanceDAO attendanceDao = new AttendanceDAO();
    private final EmployeeDAO employeeDao = new EmployeeDAO();
    private final AuditDAO auditDao = new AuditDAO();

    public TableData payrollReport(YearMonth month) {
        List<Object[]> rows = new ArrayList<>();
        for (Payroll p : payrollDao.getByMonth(month.toString())) {
            rows.add(new Object[]{p.empName(), p.payMonth(), p.workingDays(), p.absentDays(), p.basic(), p.hra(),
                    p.da(), p.grossSalary(), p.pf(), p.tax(), p.deductions(), p.netSalary(), p.status(), p.mode()});
        }
        return new TableData(List.of("Employee", "Month", "Working Days", "Absent Days", "Basic", "HRA", "DA",
                "Gross", "PF", "Tax", "Deductions", "Net", "Status", "Mode"), rows);
    }

    public TableData attendanceReport(YearMonth month) {
        List<Object[]> rows = new ArrayList<>();
        for (Object[] r : attendanceDao.monthlySummary(month.atDay(1), month.atEndOfMonth())) {
            rows.add(new Object[]{r[1], month.toString(), r[2], r[3], r[4]});
        }
        return new TableData(List.of("Employee", "Month", "Present (marked)", "Absent", "Leave"), rows);
    }

    public TableData employeeReport(Integer deptId, boolean includeInactive) {
        List<Object[]> rows = new ArrayList<>();
        for (Employee e : employeeDao.getEmployees(deptId, !includeInactive, null)) {
            rows.add(new Object[]{e.getId(), e.getName(), e.getUsername(), e.getEmail(), e.getDesignation(),
                    e.getDeptName() == null ? "" : e.getDeptName(), e.getJoiningDate(), e.getBasicSalary(),
                    e.isActive() ? "Active" : "Inactive"});
        }
        return new TableData(List.of("ID", "Name", "Username", "Email", "Designation", "Department",
                "Joined", "Basic Salary", "Status"), rows);
    }

    /** Department name to total net salary, largest first (for the chart). */
    public Map<String, BigDecimal> netSalaryByDepartment(YearMonth month) {
        Map<String, BigDecimal> out = new LinkedHashMap<>();
        for (Object[] r : payrollDao.netByDepartment(month.toString())) {
            out.put((String) r[0], (BigDecimal) r[1]);
        }
        return out;
    }

    public List<PayrollAudit> auditLog(String month, String action, String keyword) {
        return auditDao.getAuditLog(month, action, keyword, 500);
    }
}
