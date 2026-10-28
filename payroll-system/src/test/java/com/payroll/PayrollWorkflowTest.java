package com.payroll;

import com.payroll.db.DBConnection;
import com.payroll.db.DatabaseInitializer;
import com.payroll.model.Attendance;
import com.payroll.model.Department;
import com.payroll.model.Employee;
import com.payroll.model.Payroll;
import com.payroll.model.PayrollAudit;
import com.payroll.model.PayrollStatus;
import com.payroll.model.Payslip;
import com.payroll.model.Person;
import com.payroll.model.Role;
import com.payroll.model.SalaryStructure;
import com.payroll.model.TableData;
import com.payroll.service.AttendanceService;
import com.payroll.service.AuthService;
import com.payroll.service.DepartmentService;
import com.payroll.service.EmployeeService;
import com.payroll.service.PayrollScheduler;
import com.payroll.service.PayrollService;
import com.payroll.service.PayslipService;
import com.payroll.service.ReportService;
import com.payroll.service.ServiceException;
import com.payroll.util.CsvExporter;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** End-to-end service + DAO test against H2 in MySQL mode, using the real schema.sql and seed data. */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PayrollWorkflowTest {
    private static final YearMonth CLEAN_MONTH = YearMonth.now().minusMonths(1);
    private static final YearMonth ABSENCE_MONTH = YearMonth.now().minusMonths(2);

    private static final AuthService auth = new AuthService();
    private static final EmployeeService employees = new EmployeeService();
    private static final DepartmentService departments = new DepartmentService();
    private static final AttendanceService attendance = new AttendanceService();
    private static final PayrollService payroll = new PayrollService();
    private static final PayslipService payslips = new PayslipService();
    private static final ReportService reports = new ReportService();

    @BeforeAll
    static void setUp() throws Exception {
        // Set PAYROLL_TEST_URL (+ _USER / _PASSWORD) to run this suite against a real MySQL; its tables are wiped first.
        String url = System.getenv("PAYROLL_TEST_URL");
        if (url != null) {
            DBConnection.configure(url, System.getenv().getOrDefault("PAYROLL_TEST_USER", "root"),
                    System.getenv().getOrDefault("PAYROLL_TEST_PASSWORD", ""));
            try (var c = DBConnection.getConnection(); var st = c.createStatement()) {
                st.execute("SET FOREIGN_KEY_CHECKS = 0");
                for (String t : List.of("payroll_audit", "payroll", "attendance", "salary_structure", "employee", "users", "department")) {
                    st.execute("DROP TABLE IF EXISTS " + t);
                }
                st.execute("SET FOREIGN_KEY_CHECKS = 1");
            }
        } else {
            DBConnection.configure("jdbc:h2:mem:payroll_test;MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        }
        DatabaseInitializer.run();
        DatabaseInitializer.run(); // second call must be harmless
    }

    private static Employee asha() {
        return employees.search(null, false, "asha").get(0);
    }

    @Test
    @Order(1)
    void seedDataAndLogin() {
        Person admin = auth.login("admin", "admin123");
        assertEquals(Role.ADMIN, admin.getRole());
        Person emp = auth.login("asha", "emp123");
        assertInstanceOf(Employee.class, emp);
        assertEquals(5, employees.search(null, false, null).size());
        assertEquals(4, departments.getAll().size());
    }

    @Test
    @Order(2)
    void badCredentialsAndLockout() {
        assertThrows(ServiceException.class, () -> auth.login("admin", "wrong"));
        assertThrows(ServiceException.class, () -> auth.login("nobody", "x"));
        for (int i = 0; i < 5; i++) {
            assertThrows(ServiceException.class, () -> auth.login("neha", "bad"));
        }
        ServiceException locked = assertThrows(ServiceException.class, () -> auth.login("neha", "emp123"));
        assertTrue(locked.getMessage().contains("locked"));
    }

    @Test
    @Order(3)
    void passwordChange() {
        Person p = auth.login("karan", "emp123");
        assertThrows(ServiceException.class, () -> auth.changePassword(p.getId(), "wrong", "newpass1"));
        assertThrows(ServiceException.class, () -> auth.changePassword(p.getId(), "emp123", "123"));
        auth.changePassword(p.getId(), "emp123", "newpass1");
        assertThrows(ServiceException.class, () -> auth.login("karan", "emp123"));
        assertNotNull(auth.login("karan", "newpass1"));
    }

    @Test
    @Order(4)
    void addEmployeeValidationAndDuplicates() {
        Employee e = new Employee();
        e.setName("Test User");
        e.setEmail("asha@company.com"); // already used
        e.setUsername("tester");
        e.setDesignation("QA");
        e.setBasicSalary(new BigDecimal("30000"));
        e.setJoiningDate(LocalDate.now().minusYears(1));
        assertThrows(ServiceException.class, () -> employees.addEmployee(e, "emp123"));

        e.setEmail("tester@company.com");
        e.setBasicSalary(BigDecimal.ZERO);
        assertThrows(ServiceException.class, () -> employees.addEmployee(e, "emp123"));

        e.setBasicSalary(new BigDecimal("30000"));
        Employee saved = employees.addEmployee(e, "emp123");
        assertTrue(saved.getId() > 0);
        assertEquals(new BigDecimal("20"), employees.getSalaryStructure(saved.getId()).hraPercent().stripTrailingZeros().setScale(0));

        // deactivate so it does not disturb the headcount assumptions in later tests
        employees.setActive(saved.getId(), false);
        assertThrows(ServiceException.class, () -> auth.login("tester", "emp123"));
        assertEquals(5, employees.search(null, false, null).size());
        assertEquals(6, employees.search(null, true, null).size());
    }

    @Test
    @Order(5)
    void departmentRules() {
        Department eng = departments.getAll().stream().filter(d -> d.deptName().equals("Engineering")).findFirst().orElseThrow();
        assertThrows(ServiceException.class, () -> departments.delete(eng.deptId()));
        assertThrows(ServiceException.class, () -> departments.add("Engineering", "x"));
        Department temp = departments.add("Temp", "Nowhere");
        departments.delete(temp.deptId());
        assertEquals(4, departments.getAll().size());
    }

    @Test
    @Order(6)
    void salaryStructureValidation() {
        Employee a = asha();
        SalaryStructure bad = new SalaryStructure(0, a.getId(), null, new BigDecimal("150"), BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE);
        assertThrows(ServiceException.class, () -> employees.saveSalaryStructure(bad));
        SalaryStructure good = new SalaryStructure(0, a.getId(), null, new BigDecimal("25"), new BigDecimal("10"),
                new BigDecimal("12"), new BigDecimal("5"));
        employees.saveSalaryStructure(good);
        assertEquals(0, new BigDecimal("25").compareTo(employees.getSalaryStructure(a.getId()).hraPercent()));
        employees.saveSalaryStructure(good); // update path
        // restore defaults so payroll expectations stay simple
        employees.saveSalaryStructure(SalaryStructure.defaults(a.getId(), null));
    }

    @Test
    @Order(7)
    void attendanceMarking() {
        Employee a = asha();
        LocalDate day = ABSENCE_MONTH.atDay(1);
        attendance.markAttendance(a.getId(), day, Attendance.ABSENT);
        attendance.markAttendance(a.getId(), day, Attendance.ABSENT); // upsert, not duplicate
        attendance.markAttendance(a.getId(), day.plusDays(1), Attendance.ABSENT);
        attendance.markAttendance(a.getId(), day.plusDays(2), Attendance.LEAVE);
        assertEquals(2, attendance.countAbsences(a.getId(), ABSENCE_MONTH));
        assertEquals(3, attendance.getAttendance(a.getId(), ABSENCE_MONTH).size());
        assertThrows(ServiceException.class, () -> attendance.markAttendance(a.getId(), LocalDate.now().plusDays(1), Attendance.PRESENT));
        assertThrows(ServiceException.class, () -> attendance.markAttendance(a.getId(), day, "SICK"));

        attendance.markAllPresent(day.plusDays(5));
        long marked = attendance.dayView(day.plusDays(5)).stream().filter(r -> "PRESENT".equals(r[3])).count();
        assertEquals(5, marked);
    }

    @Test
    @Order(8)
    void runPayrollIsIdempotent() {
        PayrollService.RunSummary first = payroll.runPayroll(CLEAN_MONTH, PayrollService.MANUAL, "admin");
        assertEquals(5, first.created());
        assertTrue(first.problems().isEmpty());
        PayrollService.RunSummary second = payroll.runPayroll(CLEAN_MONTH, PayrollService.AUTO, "SYSTEM");
        assertEquals(0, second.created());
        assertEquals(5, second.skipped());
        assertEquals(5, payroll.getPayrolls(CLEAN_MONTH).size());

        PayrollService.Summary s = payroll.getSummary(CLEAN_MONTH);
        assertEquals(5, s.headcount());
        assertEquals(0, s.gross().subtract(s.deductions()).compareTo(s.net()));
        assertThrows(ServiceException.class, () -> payroll.runPayroll(YearMonth.now().plusMonths(1), PayrollService.MANUAL, "admin"));
    }

    @Test
    @Order(9)
    void absencesAffectPayrollAndRecalculateWorks() {
        Employee a = asha();
        payroll.runPayroll(ABSENCE_MONTH, PayrollService.MANUAL, "admin");
        Payroll p = payroll.getPayrolls(ABSENCE_MONTH).stream().filter(x -> x.empId() == a.getId()).findFirst().orElseThrow();
        assertEquals(2, p.absentDays());
        assertTrue(p.basic().compareTo(a.getBasicSalary()) < 0);

        // one more absence after generation -> recalculate picks it up
        attendance.markAttendance(a.getId(), ABSENCE_MONTH.atDay(1).plusDays(3), Attendance.ABSENT);
        payroll.recalculate(p.payrollId(), "admin");
        Payroll after = payroll.getPayrolls(ABSENCE_MONTH).stream().filter(x -> x.empId() == a.getId()).findFirst().orElseThrow();
        assertEquals(3, after.absentDays());
        assertTrue(after.netSalary().compareTo(p.netSalary()) < 0);
        assertEquals(PayrollStatus.GENERATED, after.status());
    }

    @Test
    @Order(10)
    void statusLifecycleAndAudit() {
        Payroll p = payroll.getPayrolls(CLEAN_MONTH).get(0);
        assertThrows(ServiceException.class, () -> payroll.markPaid(p.payrollId(), "admin")); // must verify first
        payroll.verify(p.payrollId(), "admin");
        assertThrows(ServiceException.class, () -> payroll.recalculate(p.payrollId(), "admin")); // verified rows are frozen
        payroll.markPaid(p.payrollId(), "admin");
        assertThrows(ServiceException.class, () -> payroll.cancel(p.payrollId(), "admin")); // paid is final

        Payroll q = payroll.getPayrolls(CLEAN_MONTH).get(1);
        payroll.verify(q.payrollId(), "admin");
        payroll.cancel(q.payrollId(), "admin");
        assertThrows(ServiceException.class, () -> payroll.verify(q.payrollId(), "admin"));
        payroll.reprocess(q.payrollId(), "admin");
        assertEquals(PayrollStatus.GENERATED, payroll.getPayrolls(CLEAN_MONTH).get(1).status());
        assertThrows(ServiceException.class, () -> payroll.reprocess(q.payrollId(), "admin"));

        List<PayrollAudit> log = reports.auditLog(CLEAN_MONTH.toString(), null, null);
        List<String> actions = log.stream().map(PayrollAudit::action).toList();
        assertTrue(actions.containsAll(List.of("GENERATED", "VERIFIED", "PAID", "CANCELLED", "REPROCESSED")));
        assertEquals(1, reports.auditLog(null, "PAID", null).size());
    }

    @Test
    @Order(11)
    void payslipsOnlyAfterVerification(@TempDir Path dir) throws IOException {
        List<Payroll> all = payroll.getPayrolls(CLEAN_MONTH);
        Payroll paid = all.stream().filter(p -> p.status() == PayrollStatus.PAID).findFirst().orElseThrow();
        Payroll generated = all.stream().filter(p -> p.status() == PayrollStatus.GENERATED).findFirst().orElseThrow();

        assertThrows(ServiceException.class, () -> payslips.getPayslip(generated.empId(), CLEAN_MONTH));
        assertTrue(payslips.availablePayslips(generated.empId()).isEmpty());

        Payslip slip = payslips.getPayslip(paid.empId(), CLEAN_MONTH);
        String text = payslips.toText(slip);
        assertTrue(text.contains("NET SALARY"));
        assertTrue(text.contains(slip.employee().getName()));

        Path pdf = dir.resolve("payslip.pdf");
        payslips.generatePdf(slip, pdf);
        byte[] head = Files.readAllBytes(pdf);
        assertTrue(head.length > 500);
        assertEquals("%PDF", new String(head, 0, 4, StandardCharsets.US_ASCII));
    }

    @Test
    @Order(12)
    void reportsAndCsv(@TempDir Path dir) throws IOException {
        TableData pr = reports.payrollReport(CLEAN_MONTH);
        assertEquals(5, pr.rows().size());
        assertEquals(pr.columns().size(), pr.rows().get(0).length);
        assertEquals(5, reports.attendanceReport(ABSENCE_MONTH).rows().size());
        assertEquals(5, reports.employeeReport(null, false).rows().size());
        assertEquals(6, reports.employeeReport(null, true).rows().size());
        assertFalse(reports.netSalaryByDepartment(CLEAN_MONTH).isEmpty());

        Path csv = dir.resolve("payroll.csv");
        CsvExporter.write(csv, pr);
        List<String> lines = Files.readAllLines(csv);
        assertEquals(6, lines.size());
        assertTrue(lines.get(0).startsWith("Employee,Month"));
    }

    @Test
    @Order(13)
    void schedulerTickIsSafe() {
        // On days other than the 1st this does nothing; on the 1st it must not duplicate rows.
        int before = payroll.getPayrolls(CLEAN_MONTH).size();
        new PayrollScheduler(payroll, null).checkNow();
        assertEquals(before, payroll.getPayrolls(CLEAN_MONTH).size());
    }

    @Test
    @Order(14)
    void failedRunRollsBack() {
        YearMonth month = YearMonth.now().minusMonths(3);
        int before = payroll.getPayrolls(month).size();
        assertThrows(RuntimeException.class, () -> com.payroll.db.DBConnection.inTransaction(() -> {
            payroll.runPayroll(month, PayrollService.MANUAL, "admin");
            throw new IllegalStateException("boom");
        }));
        assertEquals(before, payroll.getPayrolls(month).size());
    }
}
