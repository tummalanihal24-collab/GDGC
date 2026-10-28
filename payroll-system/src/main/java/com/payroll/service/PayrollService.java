package com.payroll.service;

import com.payroll.dao.AttendanceDAO;
import com.payroll.dao.AuditDAO;
import com.payroll.dao.EmployeeDAO;
import com.payroll.dao.PayrollDAO;
import com.payroll.dao.SalaryStructureDAO;
import com.payroll.db.DBConnection;
import com.payroll.model.Attendance;
import com.payroll.model.Employee;
import com.payroll.model.Payroll;
import com.payroll.model.PayrollStatus;
import com.payroll.model.SalaryStructure;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

public class PayrollService {
    public static final String MANUAL = "MANUAL";
    public static final String AUTO = "AUTO";

    /** Outcome of one run. {@code problems} lists employees that could not be processed and why. */
    public record RunSummary(String month, int created, int skipped, List<String> problems, BigDecimal totalNet) {
    }

    /** Month totals: headcount and the sums over non-cancelled payrolls. */
    public record Summary(int headcount, BigDecimal gross, BigDecimal deductions, BigDecimal net) {
    }

    private final PayrollDAO payrollDao = new PayrollDAO();
    private final AuditDAO auditDao = new AuditDAO();
    private final EmployeeDAO employeeDao = new EmployeeDAO();
    private final SalaryStructureDAO structureDao = new SalaryStructureDAO();
    private final AttendanceDAO attendanceDao = new AttendanceDAO();

    /**
     * Generates payroll for every active employee who has none yet for the month. The whole run is one
     * transaction, and employees already processed are skipped, so running it twice is harmless.
     */
    public RunSummary runPayroll(YearMonth month, String mode, String by) {
        if (month.isAfter(YearMonth.now())) {
            throw new ServiceException("Cannot run payroll for a future month");
        }
        String key = month.toString();
        return DBConnection.inTransaction(() -> {
            int created = 0;
            int skipped = 0;
            BigDecimal totalNet = BigDecimal.ZERO;
            List<String> problems = new ArrayList<>();
            for (Employee e : employeeDao.getEmployees(null, true, null)) {
                if (payrollDao.exists(e.getId(), key) || e.getJoiningDate().isAfter(month.atEndOfMonth())) {
                    skipped++;
                    continue;
                }
                String issue = validate(e);
                if (issue != null) {
                    problems.add(e.getName() + ": " + issue);
                    continue;
                }
                Payroll p = buildPayroll(e, month, mode, by);
                int id = payrollDao.insertPayroll(p);
                auditDao.addAudit(id, "GENERATED", by, mode + " run, net " + p.netSalary());
                created++;
                totalNet = totalNet.add(p.netSalary());
            }
            return new RunSummary(key, created, skipped, problems, totalNet);
        });
    }

    public List<Payroll> getPayrolls(YearMonth month) {
        return payrollDao.getByMonth(month.toString());
    }

    public List<Payroll> getPayrollsForEmployee(int empId) {
        return payrollDao.getByEmployee(empId);
    }

    public Summary getSummary(YearMonth month) {
        BigDecimal[] s = payrollDao.getSummary(month.toString());
        return new Summary(s[0].intValue(), s[1], s[2], s[3]);
    }

    /** Re-reads attendance, salary and structure and recalculates a GENERATED payroll. */
    public void recalculate(int payrollId, String by) {
        DBConnection.inTransaction(() -> {
            Payroll old = load(payrollId);
            if (old.status() != PayrollStatus.GENERATED) {
                throw new ServiceException("Only GENERATED payrolls can be recalculated (this one is " + old.status() + ")");
            }
            rewrite(old, PayrollStatus.GENERATED, "RECALCULATED", by);
        });
    }

    public void verify(int payrollId, String by) {
        transition(payrollId, PayrollStatus.VERIFIED, "VERIFIED", by);
    }

    public void markPaid(int payrollId, String by) {
        transition(payrollId, PayrollStatus.PAID, "PAID", by);
    }

    public void cancel(int payrollId, String by) {
        transition(payrollId, PayrollStatus.CANCELLED, "CANCELLED", by);
    }

    /** Takes a CANCELLED payroll back to GENERATED with freshly calculated figures. */
    public void reprocess(int payrollId, String by) {
        DBConnection.inTransaction(() -> {
            Payroll old = load(payrollId);
            if (!old.status().canMoveTo(PayrollStatus.GENERATED)) {
                throw new ServiceException("Only CANCELLED payrolls can be reprocessed (this one is " + old.status() + ")");
            }
            rewrite(old, PayrollStatus.GENERATED, "REPROCESSED", by);
        });
    }

    private void transition(int payrollId, PayrollStatus target, String action, String by) {
        DBConnection.inTransaction(() -> {
            Payroll p = load(payrollId);
            if (!p.status().canMoveTo(target)) {
                throw new ServiceException("Cannot move " + p.empName() + " (" + p.payMonth() + ") from "
                        + p.status() + " to " + target);
            }
            payrollDao.updateStatus(payrollId, target);
            auditDao.addAudit(payrollId, action, by, p.status() + " -> " + target);
        });
    }

    private void rewrite(Payroll old, PayrollStatus status, String action, String by) {
        Employee e = employeeDao.findById(old.empId());
        Payroll fresh = buildPayroll(e, YearMonth.parse(old.payMonth()), old.mode(), by)
                .withId(old.payrollId()).withStatus(status);
        payrollDao.updatePayroll(fresh);
        auditDao.addAudit(old.payrollId(), action, by,
                "net " + old.netSalary() + " -> " + fresh.netSalary());
    }

    private Payroll buildPayroll(Employee e, YearMonth month, String mode, String by) {
        SalaryStructure s = structureDao.getStructure(e.getId());
        if (s == null) {
            s = SalaryStructure.defaults(e.getId(), e.getName());
        }
        int absent = attendanceDao.countByStatus(e.getId(), month.atDay(1), month.atEndOfMonth(), Attendance.ABSENT);
        return PayrollCalculator.calculate(e, s, month, absent, mode, by);
    }

    private Payroll load(int payrollId) {
        Payroll p = payrollDao.findById(payrollId);
        if (p == null) {
            throw new ServiceException("Payroll record not found");
        }
        return p;
    }

    /** Validation step before a payroll is generated. Returns the problem, or null if fine. */
    private static String validate(Employee e) {
        if (e.getBasicSalary() == null || e.getBasicSalary().signum() <= 0) {
            return "basic salary is not set";
        }
        return null;
    }
}
