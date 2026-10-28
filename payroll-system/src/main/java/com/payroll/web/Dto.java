package com.payroll.web;

import com.payroll.model.Employee;
import com.payroll.model.Payroll;
import com.payroll.model.Payslip;
import com.payroll.model.Person;

import java.math.BigDecimal;
import java.time.LocalDate;

/** What the browser is allowed to see. Entities such as Person carry a password hash, so they are never serialised directly. */
final class Dto {
    private Dto() {
    }

    record User(int id, String name, String email, String username, String role, String designation,
                LocalDate joiningDate, BigDecimal basicSalary, Integer deptId, String deptName, Boolean active) {
    }

    record PayslipView(int employeeId, String employeeName, String designation, String department, Payroll payroll) {
    }

    static User user(Person p) {
        if (p instanceof Employee e) {
            return new User(e.getId(), e.getName(), e.getEmail(), e.getUsername(), e.getRole(), e.getDesignation(),
                    e.getJoiningDate(), e.getBasicSalary(), e.getDeptId(), e.getDeptName(), e.isActive());
        }
        return new User(p.getId(), p.getName(), p.getEmail(), p.getUsername(), p.getRole(), null, null, null, null, null, null);
    }

    static PayslipView payslip(Payslip s) {
        Employee e = s.employee();
        return new PayslipView(e.getId(), e.getName(), e.getDesignation(), e.getDeptName(), s.payroll());
    }

    // ---- request bodies
    record LoginReq(String username, String password) {
    }

    record ProfileReq(String name, String email) {
    }

    record PasswordReq(String current, String next) {
    }

    record ResetReq(String password) {
    }

    record ActiveReq(boolean active) {
    }

    record EmployeeReq(String name, String email, String username, String password, String designation,
                       String joiningDate, BigDecimal basicSalary, Integer deptId) {
    }

    record DeptReq(String name, String location) {
    }

    record StructReq(BigDecimal hra, BigDecimal da, BigDecimal pf, BigDecimal tax) {
    }

    record MarkReq(int empId, String date, String status) {
    }

    record DayReq(String date) {
    }

    record RunReq(String month) {
    }

    record BulkReq(java.util.List<Integer> ids, String action) {
    }
}
