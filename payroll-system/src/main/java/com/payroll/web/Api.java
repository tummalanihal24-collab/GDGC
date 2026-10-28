package com.payroll.web;

import com.payroll.model.Attendance;
import com.payroll.model.Employee;
import com.payroll.model.Payroll;
import com.payroll.model.Person;
import com.payroll.model.Role;
import com.payroll.util.Validators;
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.ForbiddenResponse;
import io.javalin.http.UnauthorizedResponse;

import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Login, logout and everything a signed-in person can do with their own account. */
final class Api {
    private Api() {
    }

    // ------------------------------------------------------------ helpers shared by all routes
    static Person user(Context ctx) {
        Person cached = ctx.attribute("user");
        if (cached != null) {
            return cached;
        }
        Integer uid = ctx.sessionAttribute("uid");
        if (uid == null) {
            throw new UnauthorizedResponse("Please sign in");
        }
        Person p = Svc.employees.getAccount(uid);
        if (p == null || (p instanceof Employee e && !e.isActive())) {
            ctx.req().getSession().invalidate();
            throw new UnauthorizedResponse("Please sign in");
        }
        ctx.attribute("user", p);
        return p;
    }

    static Employee employee(Context ctx) {
        if (user(ctx) instanceof Employee e) {
            return e;
        }
        throw new ForbiddenResponse("Employees only");
    }

    static YearMonth month(Context ctx, YearMonth fallback) {
        String m = ctx.queryParam("month");
        return m == null || m.isBlank() ? fallback : Validators.month(m);
    }

    static Map<String, Object> map(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put((String) kv[i], kv[i + 1]);
        }
        return m;
    }

    // ------------------------------------------------------------ routes
    static void register(Javalin app) {
        // Browsers cannot add this header on a cross-site form post, so requiring it blocks CSRF (cookie is also SameSite=Strict).
        app.before("/api/*", ctx -> {
            String method = ctx.method().name();
            boolean mutating = !(method.equals("GET") || method.equals("HEAD") || method.equals("OPTIONS"));
            if (mutating && !"XMLHttpRequest".equals(ctx.header("X-Requested-With"))) {
                throw new ForbiddenResponse("Missing X-Requested-With header");
            }
        });
        app.before("/api/admin/*", ctx -> {
            if (!Role.ADMIN.equals(user(ctx).getRole())) {
                throw new ForbiddenResponse("Admins only");
            }
        });
        app.before("/api/me", Api::user);
        app.before("/api/me/*", Api::user);

        app.post("/api/login", ctx -> {
            Dto.LoginReq r = ctx.bodyAsClass(Dto.LoginReq.class);
            Person p = Svc.auth.login(r.username(), r.password());
            ctx.req().getSession(true);
            ctx.req().changeSessionId(); // new session id on login
            ctx.sessionAttribute("uid", p.getId());
            ctx.json(map("user", Dto.user(p)));
        });
        app.post("/api/logout", ctx -> {
            if (ctx.req().getSession(false) != null) {
                ctx.req().getSession().invalidate();
            }
            ctx.status(204);
        });

        // Used on page load: answers 200 with user=null when nobody is signed in, so the console stays free of 401 noise.
        app.get("/api/session", ctx -> {
            try {
                ctx.json(map("user", Dto.user(user(ctx))));
            } catch (UnauthorizedResponse e) {
                ctx.json(map("user", null));
            }
        });
        app.get("/api/me", ctx -> ctx.json(map("user", Dto.user(user(ctx)))));
        app.put("/api/me/profile", ctx -> {
            Dto.ProfileReq r = ctx.bodyAsClass(Dto.ProfileReq.class);
            Person p = user(ctx);
            Svc.employees.updateProfile(p, r.name(), r.email());
            ctx.json(map("user", Dto.user(Svc.employees.getAccount(p.getId()))));
        });
        app.post("/api/me/password", ctx -> {
            Dto.PasswordReq r = ctx.bodyAsClass(Dto.PasswordReq.class);
            Svc.auth.changePassword(user(ctx).getId(), r.current(), r.next());
            ctx.status(204);
        });

        // ---- employee self-service
        app.get("/api/me/overview", ctx -> {
            Employee me = employee(ctx);
            YearMonth now = YearMonth.now();
            List<Payroll> slips = Svc.payslips.availablePayslips(me.getId());
            List<Map<String, String>> marks = Svc.attendance.getAttendance(me.getId(), now).stream()
                    .map(a -> Map.of("date", a.date().toString(), "status", a.status())).toList();
            ctx.json(map(
                    "user", Dto.user(Svc.employees.get(me.getId())),
                    "month", now.toString(),
                    "latest", slips.isEmpty() ? null : slips.get(0),
                    "payslipCount", slips.size(),
                    "recent", slips.stream().limit(6).toList(),
                    "absent", Svc.attendance.countAbsences(me.getId(), now),
                    "leave", Svc.attendance.count(me.getId(), now, Attendance.LEAVE),
                    "marks", marks));
        });
        app.get("/api/me/attendance", ctx -> {
            Employee me = employee(ctx);
            YearMonth m = month(ctx, YearMonth.now());
            List<Map<String, String>> marks = Svc.attendance.getAttendance(me.getId(), m).stream()
                    .map(a -> Map.of("date", a.date().toString(), "status", a.status())).toList();
            ctx.json(map("month", m.toString(), "marks", marks,
                    "absent", Svc.attendance.countAbsences(me.getId(), m),
                    "leave", Svc.attendance.count(me.getId(), m, Attendance.LEAVE)));
        });
        app.get("/api/me/payslips", ctx -> ctx.json(map("payslips", Svc.payslips.availablePayslips(employee(ctx).getId()))));
        app.get("/api/me/payslips/{month}", ctx -> {
            YearMonth m = Validators.month(ctx.pathParam("month"));
            ctx.json(Dto.payslip(Svc.payslips.getPayslip(employee(ctx).getId(), m)));
        });
        app.get("/api/me/payslips/{month}/pdf", ctx -> {
            YearMonth m = Validators.month(ctx.pathParam("month"));
            byte[] pdf = Svc.payslips.pdfBytes(Svc.payslips.getPayslip(employee(ctx).getId(), m));
            ctx.contentType("application/pdf");
            ctx.header("Content-Disposition", "attachment; filename=\"payslip-" + m + ".pdf\"");
            ctx.result(pdf);
        });
    }

}
