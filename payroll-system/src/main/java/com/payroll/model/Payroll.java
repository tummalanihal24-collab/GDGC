package com.payroll.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record Payroll(int payrollId, int empId, String empName, String payMonth,
                      int workingDays, int absentDays,
                      BigDecimal basic, BigDecimal hra, BigDecimal da, BigDecimal grossSalary,
                      BigDecimal pf, BigDecimal tax, BigDecimal deductions, BigDecimal netSalary,
                      PayrollStatus status, String mode, String generatedBy, LocalDateTime generatedOn) {

    public Payroll withId(int id) {
        return new Payroll(id, empId, empName, payMonth, workingDays, absentDays, basic, hra, da, grossSalary,
                pf, tax, deductions, netSalary, status, mode, generatedBy, generatedOn);
    }

    public Payroll withStatus(PayrollStatus s) {
        return new Payroll(payrollId, empId, empName, payMonth, workingDays, absentDays, basic, hra, da,
                grossSalary, pf, tax, deductions, netSalary, s, mode, generatedBy, generatedOn);
    }
}
