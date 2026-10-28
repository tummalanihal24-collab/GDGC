package com.payroll.dao;

import com.payroll.model.PayrollAudit;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class AuditDAO {
    public void addAudit(int payrollId, String action, String by, String details) {
        Sql.insert("INSERT INTO payroll_audit (payroll_id, action, action_by, action_time, details) VALUES (?, ?, ?, ?, ?)",
                payrollId, action, by, LocalDateTime.now(), details);
    }

    /** Newest first, at most {@code limit} rows. Filters are optional (null/blank = no filter). */
    public List<PayrollAudit> getAuditLog(String month, String action, String keyword, int limit) {
        StringBuilder sql = new StringBuilder("""
                SELECT a.audit_id, a.payroll_id, u.name, p.pay_month, a.action, a.action_by, a.action_time, a.details
                FROM payroll_audit a
                JOIN payroll p ON p.payroll_id = a.payroll_id
                JOIN users u ON u.id = p.emp_id
                WHERE 1 = 1
                """);
        List<Object> params = new ArrayList<>();
        if (month != null && !month.isBlank()) {
            sql.append(" AND p.pay_month = ?");
            params.add(month);
        }
        if (action != null && !action.isBlank()) {
            sql.append(" AND a.action = ?");
            params.add(action);
        }
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (LOWER(u.name) LIKE ? OR LOWER(a.action_by) LIKE ? OR LOWER(a.details) LIKE ?)");
            String like = "%" + keyword.trim().toLowerCase() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
        }
        sql.append(" ORDER BY a.audit_id DESC LIMIT ").append(Math.max(1, limit));
        return Sql.query(sql.toString(), rs -> new PayrollAudit(rs.getInt(1), rs.getInt(2), rs.getString(3),
                rs.getString(4), rs.getString(5), rs.getString(6), Sql.dateTime(rs, "action_time"), rs.getString(8)),
                params.toArray());
    }
}
