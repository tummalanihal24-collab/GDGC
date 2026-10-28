package com.payroll.service;

import com.payroll.dao.AttendanceDAO;
import com.payroll.dao.EmployeeDAO;
import com.payroll.db.DBConnection;
import com.payroll.model.Attendance;
import com.payroll.model.Employee;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Days with no record count as present; only ABSENT days reduce pay (LEAVE is paid). */
public class AttendanceService {
    private final AttendanceDAO attendanceDao = new AttendanceDAO();
    private final EmployeeDAO employeeDao = new EmployeeDAO();

    public void markAttendance(int empId, LocalDate date, String status) {
        if (!Attendance.STATUSES.contains(status)) {
            throw new ServiceException("Status must be one of " + Attendance.STATUSES);
        }
        if (date.isAfter(LocalDate.now())) {
            throw new ServiceException("Cannot mark attendance for a future date");
        }
        Employee e = employeeDao.findById(empId);
        if (e == null || !e.isActive()) {
            throw new ServiceException("Employee not found or inactive");
        }
        if (e.getJoiningDate() != null && date.isBefore(e.getJoiningDate())) {
            throw new ServiceException("Date is before the employee's joining date");
        }
        attendanceDao.markAttendance(empId, date, status);
    }

    public void markAllPresent(LocalDate date) {
        List<Employee> active = employeeDao.getEmployees(null, true, null);
        DBConnection.inTransaction(() -> {
            for (Employee e : active) {
                if (!date.isBefore(e.getJoiningDate())) {
                    attendanceDao.markAttendance(e.getId(), date, Attendance.PRESENT);
                }
            }
        });
    }

    /** Active employees for a day with their recorded status; null status = not marked yet. */
    public List<Object[]> dayView(LocalDate date) {
        Map<Integer, String> marked = new HashMap<>();
        attendanceDao.getForDate(date).forEach(a -> marked.put(a.empId(), a.status()));
        return employeeDao.getEmployees(null, true, null).stream()
                .map(e -> new Object[]{e.getId(), e.getName(), e.getDeptName(), marked.get(e.getId())})
                .toList();
    }

    public List<Attendance> getAttendance(int empId, YearMonth month) {
        return attendanceDao.getAttendance(empId, month.atDay(1), month.atEndOfMonth());
    }

    public int countAbsences(int empId, YearMonth month) {
        return attendanceDao.countByStatus(empId, month.atDay(1), month.atEndOfMonth(), Attendance.ABSENT);
    }

    public int count(int empId, YearMonth month, String status) {
        return attendanceDao.countByStatus(empId, month.atDay(1), month.atEndOfMonth(), status);
    }
}
