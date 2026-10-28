package com.payroll.model;

import java.math.BigDecimal;

/** Percentages applied to an employee's basic salary. empName is only filled for display. */
public record SalaryStructure(int structId, int empId, String empName,
                              BigDecimal hraPercent, BigDecimal daPercent,
                              BigDecimal pfPercent, BigDecimal taxPercent) {

    public static SalaryStructure defaults(int empId, String empName) {
        return new SalaryStructure(0, empId, empName,
                new BigDecimal("20"), new BigDecimal("10"), new BigDecimal("12"), new BigDecimal("5"));
    }
}
