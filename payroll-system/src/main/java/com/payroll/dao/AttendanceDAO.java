package com.payroll.dao;

import com.payroll.model.Attendance;

import java.time.LocalDate;
import java.util.List;

public class AttendanceDAO {
    private static final String SELECT = """
            SELECT a.attendance_id, a.emp_id, u.name, a.att_date, a.status
            FROM attendance a JOIN users u ON u.id = a.emp_id
            """;

    /** Insert or change the status for one employee on one day. */
    public void markAttendance(int empId, LocalDate date, String status) {
        int updated = Sql.update("UPDATE attendance SET status = ? WHERE emp_id = ? AND att_date = ?", status, empId, date);
        if (updated == 0) {
            Sql.insert("INSERT INTO attendance (emp_id, att_date, status) VALUES (?, ?, ?)", empId, date, status);
        }
    }

    public List<Attendance> getAttendance(int empId, LocalDate from, LocalDate to) {
        return Sql.query(SELECT + " WHERE a.emp_id = ? AND a.att_date BETWEEN ? AND ? ORDER BY a.att_date",
                AttendanceDAO::map, empId, from, to);
    }

    /** Every recorded day for every employee in the period (used by the monthly register). */
    public List<Attendance> getBetween(LocalDate from, LocalDate to) {
        return Sql.query(SELECT + " WHERE a.att_date BETWEEN ? AND ? ORDER BY u.name, a.att_date", AttendanceDAO::map, from, to);
    }

    /** Removes the record so the day counts as unmarked (present) again. */
    public void clear(int empId, LocalDate date) {
        Sql.update("DELETE FROM attendance WHERE emp_id = ? AND att_date = ?", empId, date);
    }

    public List<Attendance> getForDate(LocalDate date) {
        return Sql.query(SELECT + " WHERE a.att_date = ? ORDER BY u.name", AttendanceDAO::map, date);
    }

    public int countByStatus(int empId, LocalDate from, LocalDate to, String status) {
        return Sql.queryOne("SELECT COUNT(*) FROM attendance WHERE emp_id = ? AND att_date BETWEEN ? AND ? AND status = ?",
                rs -> rs.getInt(1), empId, from, to, status);
    }

    /** Per-employee totals for the period: {empId, name, present, absent, leave}. */
    public List<Object[]> monthlySummary(LocalDate from, LocalDate to) {
        return Sql.query("""
                SELECT u.id, u.name,
                       COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS present_days,
                       COALESCE(SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END), 0) AS absent_days,
                       COALESCE(SUM(CASE WHEN a.status = 'LEAVE' THEN 1 ELSE 0 END), 0) AS leave_days
                FROM employee e
                JOIN users u ON u.id = e.emp_id
                LEFT JOIN attendance a ON a.emp_id = e.emp_id AND a.att_date BETWEEN ? AND ?
                WHERE e.is_active = TRUE
                GROUP BY u.id, u.name
                ORDER BY u.name
                """, rs -> new Object[]{rs.getInt(1), rs.getString(2), rs.getInt(3), rs.getInt(4), rs.getInt(5)}, from, to);
    }

    private static Attendance map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Attendance(rs.getInt(1), rs.getInt(2), rs.getString(3), Sql.date(rs, "att_date"), rs.getString(5));
    }
}
