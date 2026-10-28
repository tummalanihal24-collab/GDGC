package com.payroll.dao;

import com.payroll.model.Payroll;
import com.payroll.model.PayrollStatus;

import java.math.BigDecimal;
import java.util.List;

public class PayrollDAO {
    private static final String SELECT = """
            SELECT p.payroll_id, p.emp_id, u.name, p.pay_month, p.working_days, p.absent_days,
                   p.basic, p.hra, p.da, p.gross_salary, p.pf, p.tax, p.deductions, p.net_salary,
                   p.status, p.mode, p.generated_by, p.generated_on
            FROM payroll p JOIN users u ON u.id = p.emp_id
            """;

    public int insertPayroll(Payroll p) {
        return Sql.insert("""
                INSERT INTO payroll (emp_id, pay_month, working_days, absent_days, basic, hra, da, gross_salary,
                                     pf, tax, deductions, net_salary, status, mode, generated_by, generated_on)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, p.empId(), p.payMonth(), p.workingDays(), p.absentDays(), p.basic(), p.hra(), p.da(),
                p.grossSalary(), p.pf(), p.tax(), p.deductions(), p.netSalary(), p.status(), p.mode(),
                p.generatedBy(), p.generatedOn());
    }

    /** Rewrites the calculated figures and status (recalculate / reprocess). */
    public void updatePayroll(Payroll p) {
        Sql.update("""
                UPDATE payroll SET working_days = ?, absent_days = ?, basic = ?, hra = ?, da = ?, gross_salary = ?,
                       pf = ?, tax = ?, deductions = ?, net_salary = ?, status = ?, generated_by = ?, generated_on = ?
                WHERE payroll_id = ?
                """, p.workingDays(), p.absentDays(), p.basic(), p.hra(), p.da(), p.grossSalary(), p.pf(), p.tax(),
                p.deductions(), p.netSalary(), p.status(), p.generatedBy(), p.generatedOn(), p.payrollId());
    }

    public void updateStatus(int payrollId, PayrollStatus status) {
        Sql.update("UPDATE payroll SET status = ? WHERE payroll_id = ?", status, payrollId);
    }

    public Payroll findById(int payrollId) {
        return Sql.queryOne(SELECT + " WHERE p.payroll_id = ?", PayrollDAO::map, payrollId);
    }

    public Payroll findByEmployeeAndMonth(int empId, String month) {
        return Sql.queryOne(SELECT + " WHERE p.emp_id = ? AND p.pay_month = ?", PayrollDAO::map, empId, month);
    }

    public boolean exists(int empId, String month) {
        return Sql.queryOne("SELECT COUNT(*) FROM payroll WHERE emp_id = ? AND pay_month = ?",
                rs -> rs.getInt(1), empId, month) > 0;
    }

    public List<Payroll> getByMonth(String month) {
        return Sql.query(SELECT + " WHERE p.pay_month = ? ORDER BY u.name", PayrollDAO::map, month);
    }

    public List<Payroll> getByEmployee(int empId) {
        return Sql.query(SELECT + " WHERE p.emp_id = ? ORDER BY p.pay_month DESC", PayrollDAO::map, empId);
    }

    /** {headcount, gross, deductions, net} over non-cancelled payrolls of the month. */
    public BigDecimal[] getSummary(String month) {
        return Sql.queryOne("""
                SELECT COUNT(*), COALESCE(SUM(gross_salary), 0), COALESCE(SUM(deductions), 0), COALESCE(SUM(net_salary), 0)
                FROM payroll WHERE pay_month = ? AND status <> 'CANCELLED'
                """, rs -> new BigDecimal[]{BigDecimal.valueOf(rs.getInt(1)), rs.getBigDecimal(2),
                rs.getBigDecimal(3), rs.getBigDecimal(4)}, month);
    }

    /** Net salary per department for non-cancelled payrolls: {deptName, netTotal}. */
    public List<Object[]> netByDepartment(String month) {
        return Sql.query("""
                SELECT COALESCE(d.dept_name, 'Unassigned'), SUM(p.net_salary)
                FROM payroll p
                JOIN employee e ON e.emp_id = p.emp_id
                LEFT JOIN department d ON d.dept_id = e.dept_id
                WHERE p.pay_month = ? AND p.status <> 'CANCELLED'
                GROUP BY COALESCE(d.dept_name, 'Unassigned')
                ORDER BY 2 DESC
                """, rs -> new Object[]{rs.getString(1), rs.getBigDecimal(2)}, month);
    }

    private static Payroll map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Payroll(rs.getInt(1), rs.getInt(2), rs.getString(3), rs.getString(4), rs.getInt(5), rs.getInt(6),
                rs.getBigDecimal(7), rs.getBigDecimal(8), rs.getBigDecimal(9), rs.getBigDecimal(10),
                rs.getBigDecimal(11), rs.getBigDecimal(12), rs.getBigDecimal(13), rs.getBigDecimal(14),
                PayrollStatus.valueOf(rs.getString(15)), rs.getString(16), rs.getString(17), Sql.dateTime(rs, "generated_on"));
    }
}
