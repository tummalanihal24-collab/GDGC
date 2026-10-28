package com.payroll.web;

import com.payroll.model.Department;
import com.payroll.model.Employee;
import com.payroll.model.Payroll;
import com.payroll.model.PayrollStatus;
import com.payroll.model.SalaryStructure;
import com.payroll.model.TableData;
import com.payroll.service.PayrollCalculator;
import com.payroll.service.PayrollService;
import com.payroll.util.CsvExporter;
import com.payroll.util.Validators;
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.NotFoundResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.payroll.web.Api.map;
import static com.payroll.web.Api.month;
import static com.payroll.web.Api.user;

/** Everything under /api/admin: master data, attendance, payroll, reports, audit. Role is checked in Api.register. */
final class AdminApi {
    private AdminApi() {
    }

    private static int id(Context ctx, String name) {
        try {
            return Integer.parseInt(ctx.pathParam(name));
        } catch (NumberFormatException e) {
            throw new NotFoundResponse("Not found");
        }
    }

    private static Map<String, Object> employeeRow(Employee e) {
        return map("id", e.getId(), "name", e.getName(), "username", e.getUsername(), "email", e.getEmail(),
                "designation", e.getDesignation(), "deptId", e.getDeptId(), "deptName", e.getDeptName(),
                "joiningDate", e.getJoiningDate(), "basicSalary", e.getBasicSalary(), "active", e.isActive());
    }

    private static Employee fill(Employee e, Dto.EmployeeReq r) {
        e.setName(r.name());
        e.setEmail(r.email());
        e.setDesignation(r.designation());
        e.setJoiningDate(Validators.date(r.joiningDate(), "Joining date"));
        e.setBasicSalary(r.basicSalary());
        e.setDeptId(r.deptId());
        return e;
    }

    private static Map<String, Object> structureRow(SalaryStructure s, Employee e) {
        BigDecimal net = PayrollCalculator.calculate(e, s, YearMonth.now(), 0, PayrollService.MANUAL, "preview").netSalary();
        return map("empId", s.empId(), "name", e.getName(), "basicSalary", e.getBasicSalary(), "hra", s.hraPercent(),
                "da", s.daPercent(), "pf", s.pfPercent(), "tax", s.taxPercent(), "netFullMonth", net);
    }

    private static Map<String, Object> payrollView(YearMonth m) {
        List<Payroll> list = Svc.payroll.getPayrolls(m);
        Map<PayrollStatus, Integer> counts = new EnumMap<>(PayrollStatus.class);
        for (PayrollStatus s : PayrollStatus.values()) {
            counts.put(s, 0);
        }
        list.forEach(p -> counts.merge(p.status(), 1, Integer::sum));
        PayrollService.Summary s = Svc.payroll.getSummary(m);
        return map("month", m.toString(), "payrolls", list, "counts", counts, "summary", s);
    }

    static void register(Javalin app) {
        // ---------------------------------------------------------------- overview
        app.get("/api/admin/overview", ctx -> {
            YearMonth last = YearMonth.now().minusMonths(1);
            Map<String, Object> pv = payrollView(last);
            List<Map<String, Object>> byDept = new ArrayList<>();
            Svc.reports.netSalaryByDepartment(last).forEach((k, v) -> byDept.add(map("name", k, "net", v)));
            List<Map<String, Object>> trend = new ArrayList<>();
            for (Object[] t : Svc.reports.netTrend(last, 6)) {
                trend.add(map("month", t[0], "headcount", t[1], "net", t[2]));
            }
            @SuppressWarnings("unchecked") Map<PayrollStatus, Integer> counts = (Map<PayrollStatus, Integer>) pv.get("counts");
            ctx.json(map("month", last.toString(),
                    "activeEmployees", Svc.employees.search(null, false, null).size(),
                    "departments", Svc.departments.getAll().size(),
                    "summary", pv.get("summary"), "counts", counts, "awaiting", counts.get(PayrollStatus.GENERATED),
                    "trend", trend, "byDepartment", byDept,
                    "recentAudit", Svc.reports.auditLog(null, null, null).stream().limit(8).toList()));
        });

        // ---------------------------------------------------------------- employees
        app.get("/api/admin/employees", ctx -> {
            String dept = ctx.queryParam("dept");
            boolean inactive = "true".equals(ctx.queryParam("inactive"));
            List<Employee> list = Svc.employees.search(dept == null || dept.isBlank() ? null : Integer.valueOf(dept), inactive, ctx.queryParam("q"));
            ctx.json(map("employees", list.stream().map(AdminApi::employeeRow).toList()));
        });
        app.post("/api/admin/employees", ctx -> {
            Dto.EmployeeReq r = ctx.bodyAsClass(Dto.EmployeeReq.class);
            Employee e = fill(new Employee(), r);
            e.setUsername(r.username());
            ctx.status(201).json(employeeRow(Svc.employees.addEmployee(e, r.password())));
        });
        app.put("/api/admin/employees/{id}", ctx -> {
            Employee e = Svc.employees.get(id(ctx, "id"));
            if (e == null) {
                throw new NotFoundResponse("Employee not found");
            }
            Svc.employees.updateEmployee(fill(e, ctx.bodyAsClass(Dto.EmployeeReq.class)));
            ctx.json(employeeRow(Svc.employees.get(e.getId())));
        });
        app.post("/api/admin/employees/{id}/active", ctx -> {
            Svc.employees.setActive(id(ctx, "id"), ctx.bodyAsClass(Dto.ActiveReq.class).active());
            ctx.status(204);
        });
        app.post("/api/admin/employees/{id}/password", ctx -> {
            Svc.auth.resetPassword(id(ctx, "id"), ctx.bodyAsClass(Dto.ResetReq.class).password());
            ctx.status(204);
        });

        // ---------------------------------------------------------------- departments
        app.get("/api/admin/departments", ctx -> {
            List<Map<String, Object>> rows = new ArrayList<>();
            for (Department d : Svc.departments.getAll()) {
                rows.add(map("id", d.deptId(), "name", d.deptName(), "location", d.location(), "employees", Svc.departments.employeeCount(d.deptId())));
            }
            ctx.json(map("departments", rows));
        });
        app.post("/api/admin/departments", ctx -> {
            Dto.DeptReq r = ctx.bodyAsClass(Dto.DeptReq.class);
            Department d = Svc.departments.add(r.name(), r.location());
            ctx.status(201).json(map("id", d.deptId(), "name", d.deptName(), "location", d.location()));
        });
        app.put("/api/admin/departments/{id}", ctx -> {
            Dto.DeptReq r = ctx.bodyAsClass(Dto.DeptReq.class);
            Svc.departments.update(id(ctx, "id"), r.name(), r.location());
            ctx.status(204);
        });
        app.delete("/api/admin/departments/{id}", ctx -> {
            Svc.departments.delete(id(ctx, "id"));
            ctx.status(204);
        });

        // ---------------------------------------------------------------- salary structure
        app.get("/api/admin/salary-structures", ctx -> {
            Map<Integer, Employee> emps = new LinkedHashMap<>();
            Svc.employees.search(null, false, null).forEach(e -> emps.put(e.getId(), e));
            List<Map<String, Object>> rows = new ArrayList<>();
            for (SalaryStructure s : Svc.employees.listSalaryStructures()) {
                rows.add(structureRow(s, emps.get(s.empId())));
            }
            ctx.json(map("structures", rows));
        });
        app.put("/api/admin/salary-structures/{empId}", ctx -> {
            int empId = id(ctx, "empId");
            Dto.StructReq r = ctx.bodyAsClass(Dto.StructReq.class);
            Svc.employees.saveSalaryStructure(new SalaryStructure(0, empId, null, r.hra(), r.da(), r.pf(), r.tax()));
            ctx.json(structureRow(Svc.employees.getSalaryStructure(empId), Svc.employees.get(empId)));
        });
        app.post("/api/admin/salary-structures/{empId}/reset", ctx -> {
            int empId = id(ctx, "empId");
            Svc.employees.saveSalaryStructure(SalaryStructure.defaults(empId, null));
            ctx.json(structureRow(Svc.employees.getSalaryStructure(empId), Svc.employees.get(empId)));
        });

        // ---------------------------------------------------------------- attendance register
        app.get("/api/admin/attendance", ctx -> ctx.json(Svc.attendance.monthRegister(month(ctx, YearMonth.now()))));
        app.put("/api/admin/attendance", ctx -> {
            Dto.MarkReq r = ctx.bodyAsClass(Dto.MarkReq.class);
            LocalDate d = Validators.date(r.date(), "Date");
            if (r.status() == null || r.status().isBlank()) {
                Svc.attendance.clearAttendance(r.empId(), d);
            } else {
                Svc.attendance.markAttendance(r.empId(), d, r.status());
            }
            ctx.status(204);
        });
        app.post("/api/admin/attendance/all-present", ctx -> {
            Svc.attendance.markAllPresent(Validators.date(ctx.bodyAsClass(Dto.DayReq.class).date(), "Date"));
            ctx.status(204);
        });

        // ---------------------------------------------------------------- payroll
        app.get("/api/admin/payroll", ctx -> ctx.json(payrollView(month(ctx, YearMonth.now().minusMonths(1)))));
        app.post("/api/admin/payroll/run", ctx -> {
            YearMonth m = Validators.month(ctx.bodyAsClass(Dto.RunReq.class).month());
            ctx.json(Svc.payroll.runPayroll(m, PayrollService.MANUAL, user(ctx).getUsername()));
        });
        app.post("/api/admin/payroll/bulk", ctx -> {
            Dto.BulkReq r = ctx.bodyAsClass(Dto.BulkReq.class);
            List<String> failures = new ArrayList<>();
            int done = 0;
            for (int pid : r.ids() == null ? List.<Integer>of() : r.ids()) {
                try {
                    act(r.action(), pid, user(ctx).getUsername());
                    done++;
                } catch (RuntimeException e) {
                    failures.add(e.getMessage());
                }
            }
            ctx.json(map("done", done, "failures", failures));
        });
        app.post("/api/admin/payroll/{id}/{action}", ctx -> {
            act(ctx.pathParam("action"), id(ctx, "id"), user(ctx).getUsername());
            ctx.status(204);
        });

        // ---------------------------------------------------------------- reports
        app.get("/api/admin/reports/{type}", ctx -> {
            YearMonth m = month(ctx, YearMonth.now().minusMonths(1));
            String type = ctx.pathParam("type");
            TableData t = switch (type) {
                case "payroll" -> Svc.reports.payrollReport(m);
                case "attendance" -> Svc.reports.attendanceReport(m);
                case "employees" -> Svc.reports.employeeReport(null, "true".equals(ctx.queryParam("inactive")));
                default -> throw new NotFoundResponse("Unknown report");
            };
            if ("csv".equals(ctx.queryParam("format"))) {
                ctx.contentType("text/csv; charset=utf-8");
                ctx.header("Content-Disposition", "attachment; filename=\"" + type + ("employees".equals(type) ? "" : "-" + m) + ".csv\"");
                ctx.result(CsvExporter.toCsv(t));
                return;
            }
            ctx.json(t);
        });
        app.get("/api/admin/reports-dept-salary", ctx -> {
            List<Map<String, Object>> rows = new ArrayList<>();
            Svc.reports.netSalaryByDepartment(month(ctx, YearMonth.now().minusMonths(1)))
                    .forEach((k, v) -> rows.add(map("name", k, "net", v)));
            ctx.json(map("rows", rows));
        });

        // ---------------------------------------------------------------- audit
        app.get("/api/admin/audit", ctx -> {
            String m = ctx.queryParam("month");
            if (m != null && !m.isBlank()) {
                Validators.month(m);
            }
            ctx.json(map("entries", Svc.reports.auditLog(m, ctx.queryParam("action"), ctx.queryParam("q"))));
        });
    }

    private static void act(String action, int payrollId, String by) {
        switch (action) {
            case "verify" -> Svc.payroll.verify(payrollId, by);
            case "pay" -> Svc.payroll.markPaid(payrollId, by);
            case "cancel" -> Svc.payroll.cancel(payrollId, by);
            case "reprocess" -> Svc.payroll.reprocess(payrollId, by);
            case "recalculate" -> Svc.payroll.recalculate(payrollId, by);
            default -> throw new NotFoundResponse("Unknown action");
        }
    }

}
