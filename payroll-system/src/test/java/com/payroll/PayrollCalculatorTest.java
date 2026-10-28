package com.payroll;

import com.payroll.model.Employee;
import com.payroll.model.Payroll;
import com.payroll.model.SalaryStructure;
import com.payroll.service.PayrollCalculator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.YearMonth;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PayrollCalculatorTest {
    private static final YearMonth JAN_2025 = YearMonth.of(2025, 1); // 23 weekdays

    private static Employee employee(String basic) {
        Employee e = new Employee();
        e.setId(1);
        e.setName("Test");
        e.setBasicSalary(new BigDecimal(basic));
        return e;
    }

    private static BigDecimal bd(String s) {
        return new BigDecimal(s);
    }

    @Test
    void workingDaysCountsWeekdaysOnly() {
        assertEquals(23, PayrollCalculator.workingDays(JAN_2025));
        assertEquals(20, PayrollCalculator.workingDays(YearMonth.of(2025, 2)));
    }

    @Test
    void fullAttendanceUsesStructurePercentages() {
        Payroll p = PayrollCalculator.calculate(employee("60000"), SalaryStructure.defaults(1, "Test"),
                JAN_2025, 0, "MANUAL", "admin");
        assertEquals(bd("60000.00"), p.basic());
        assertEquals(bd("12000.00"), p.hra());
        assertEquals(bd("6000.00"), p.da());
        assertEquals(bd("78000.00"), p.grossSalary());
        assertEquals(bd("7200.00"), p.pf());
        assertEquals(bd("3900.00"), p.tax());
        assertEquals(bd("11100.00"), p.deductions());
        assertEquals(bd("66900.00"), p.netSalary());
    }

    @Test
    void absencesReduceBasicProportionally() {
        Payroll p = PayrollCalculator.calculate(employee("60000"), SalaryStructure.defaults(1, "Test"),
                JAN_2025, 1, "MANUAL", "admin");
        assertEquals(bd("57391.30"), p.basic()); // 60000 * 22 / 23
        assertEquals(1, p.absentDays());
        assertEquals(p.grossSalary().subtract(p.deductions()), p.netSalary());
        assertEquals(p.basic().add(p.hra()).add(p.da()), p.grossSalary());
    }

    @Test
    void absentDaysAreCappedAtWorkingDays() {
        Payroll p = PayrollCalculator.calculate(employee("60000"), SalaryStructure.defaults(1, "Test"),
                JAN_2025, 99, "MANUAL", "admin");
        assertEquals(23, p.absentDays());
        assertEquals(bd("0.00"), p.netSalary());
    }

    @Test
    void zeroPercentStructureGivesGrossEqualToBasic() {
        SalaryStructure none = new SalaryStructure(0, 1, "T", bd("0"), bd("0"), bd("0"), bd("0"));
        Payroll p = PayrollCalculator.calculate(employee("1000"), none, JAN_2025, 0, "AUTO", "SYSTEM");
        assertEquals(bd("1000.00"), p.netSalary());
    }
}
