package com.payroll.service;

import com.payroll.model.Employee;
import com.payroll.model.Payroll;
import com.payroll.model.PayrollStatus;
import com.payroll.model.SalaryStructure;
import com.payroll.util.Money;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.YearMonth;

/**
 * Pure salary maths, the single source of truth for payroll figures.
 * <pre>
 * basic  = basicSalary * (workingDays - absentDays) / workingDays
 * hra    = basic * hra%       da  = basic * da%
 * gross  = basic + hra + da
 * pf     = basic * pf%        tax = gross * tax%
 * net    = gross - (pf + tax)
 * </pre>
 */
public final class PayrollCalculator {
    private PayrollCalculator() {
    }

    /** Monday-Friday days in the month. */
    public static int workingDays(YearMonth month) {
        int n = 0;
        for (int d = 1; d <= month.lengthOfMonth(); d++) {
            DayOfWeek dow = month.atDay(d).getDayOfWeek();
            if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
                n++;
            }
        }
        return n;
    }

    public static Payroll calculate(Employee e, SalaryStructure s, YearMonth month, int absentDays,
                                    String mode, String generatedBy) {
        int working = workingDays(month);
        int absent = Math.min(Math.max(absentDays, 0), working);
        BigDecimal ratio = working == 0 ? BigDecimal.ONE
                : BigDecimal.valueOf(working - absent).divide(BigDecimal.valueOf(working), 10, RoundingMode.HALF_UP);

        BigDecimal basic = Money.round(e.getBasicSalary().multiply(ratio));
        BigDecimal hra = Money.percentOf(basic, s.hraPercent());
        BigDecimal da = Money.percentOf(basic, s.daPercent());
        BigDecimal gross = basic.add(hra).add(da);
        BigDecimal pf = Money.percentOf(basic, s.pfPercent());
        BigDecimal tax = Money.percentOf(gross, s.taxPercent());
        BigDecimal deductions = pf.add(tax);
        BigDecimal net = gross.subtract(deductions);

        return new Payroll(0, e.getId(), e.getName(), month.toString(), working, absent,
                basic, hra, da, gross, pf, tax, deductions, net,
                PayrollStatus.GENERATED, mode, generatedBy, LocalDateTime.now());
    }
}
