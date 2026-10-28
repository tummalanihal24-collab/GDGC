package com.payroll;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.payroll.db.DBConnection;
import com.payroll.db.DatabaseInitializer;
import com.payroll.web.WebApp;
import io.javalin.Javalin;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import java.net.CookieManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.YearMonth;

import static org.junit.jupiter.api.Assertions.*;

/** Drives the real HTTP API (Javalin on a free port, H2 in MySQL mode) the way the browser does. */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class WebApiTest {
    private static Javalin app;
    private static String base;
    private static final ObjectMapper json = new ObjectMapper();
    private static final String MONTH = YearMonth.now().minusMonths(1).toString();

    /** One browser: its own cookie jar. */
    static final class Browser {
        final HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();

        HttpResponse<byte[]> call(String method, String path, String body, boolean xhr) throws Exception {
            HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(base + path));
            if (body != null) {
                b.header("Content-Type", "application/json");
            }
            if (xhr) {
                b.header("X-Requested-With", "XMLHttpRequest");
            }
            b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
            return http.send(b.build(), HttpResponse.BodyHandlers.ofByteArray());
        }

        HttpResponse<byte[]> get(String path) throws Exception {
            return call("GET", path, null, false);
        }

        HttpResponse<byte[]> post(String path, String body) throws Exception {
            return call("POST", path, body, true);
        }

        HttpResponse<byte[]> put(String path, String body) throws Exception {
            return call("PUT", path, body, true);
        }
    }

    private static final Browser admin = new Browser();
    private static final Browser asha = new Browser();

    private static String text(HttpResponse<byte[]> r) {
        return new String(r.body(), StandardCharsets.UTF_8);
    }

    private static JsonNode body(HttpResponse<byte[]> r) throws Exception {
        return json.readTree(r.body());
    }

    @BeforeAll
    static void start() {
        DBConnection.configure("jdbc:h2:mem:web_test;MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        DatabaseInitializer.run();
        app = WebApp.create().start(0);
        base = "http://localhost:" + app.port();
    }

    @AfterAll
    static void stop() {
        app.stop();
    }

    @Test
    @Order(1)
    void anonymousIsRejectedAndHeadersAreSet() throws Exception {
        Browser anon = new Browser();
        assertEquals(401, anon.get("/api/me").statusCode());
        assertEquals(401, anon.get("/api/admin/overview").statusCode());
        HttpResponse<byte[]> session = anon.get("/api/session");
        assertEquals(200, session.statusCode());
        assertTrue(body(session).get("user").isNull());
        HttpResponse<byte[]> page = anon.get("/");
        assertEquals(200, page.statusCode());
        assertTrue(page.headers().firstValue("Content-Security-Policy").orElse("").contains("default-src 'self'"));
        assertEquals("nosniff", page.headers().firstValue("X-Content-Type-Options").orElse(""));
    }

    @Test
    @Order(2)
    void loginRules() throws Exception {
        Browser b = new Browser();
        String creds = "{\"username\":\"admin\",\"password\":\"admin123\"}";
        assertEquals(403, b.call("POST", "/api/login", creds, false).statusCode(), "needs X-Requested-With");
        HttpResponse<byte[]> bad = b.post("/api/login", "{\"username\":\"admin\",\"password\":\"nope\"}");
        assertEquals(400, bad.statusCode());
        assertTrue(body(bad).get("error").asText().contains("Invalid"));

        HttpResponse<byte[]> ok = admin.post("/api/login", creds);
        assertEquals(200, ok.statusCode());
        assertEquals("ADMIN", body(ok).at("/user/role").asText());
        assertFalse(text(ok).toLowerCase().contains("hash"));
        assertEquals("admin", body(admin.get("/api/me")).at("/user/username").asText());
        assertEquals("admin", body(admin.get("/api/session")).at("/user/username").asText());
        String cookie = ok.headers().allValues("Set-Cookie").toString();
        assertTrue(cookie.contains("HttpOnly") && cookie.contains("SameSite=Strict"), cookie);
    }

    @Test
    @Order(3)
    void employeesCannotUseAdminApi() throws Exception {
        assertEquals(200, asha.post("/api/login", "{\"username\":\"asha\",\"password\":\"emp123\"}").statusCode());
        assertEquals(403, asha.get("/api/admin/employees").statusCode());
        assertEquals(403, asha.post("/api/admin/payroll/run", "{\"month\":\"" + MONTH + "\"}").statusCode());
        assertEquals(200, asha.get("/api/me/overview").statusCode());
        assertEquals(403, admin.get("/api/me/overview").statusCode(), "admins have no payslips");
    }

    @Test
    @Order(4)
    void adminManagesEmployees() throws Exception {
        String req = "{\"name\":\"Web Tester\",\"email\":\"web@company.com\",\"username\":\"webtester\",\"password\":\"secret1\","
                + "\"designation\":\"QA\",\"joiningDate\":\"2024-01-01\",\"basicSalary\":42000,\"deptId\":null}";
        HttpResponse<byte[]> created = admin.post("/api/admin/employees", req);
        assertEquals(201, created.statusCode(), text(created));
        assertFalse(text(created).toLowerCase().contains("hash"));
        int id = body(created).get("id").asInt();
        assertEquals(400, admin.post("/api/admin/employees", req).statusCode(), "duplicate username/email");

        JsonNode list = body(admin.get("/api/admin/employees?q=web+tester"));
        assertEquals(1, list.get("employees").size());
        assertEquals(200, admin.put("/api/admin/employees/" + id, req.replace("QA", "Senior QA")).statusCode());
        assertEquals(204, admin.post("/api/admin/employees/" + id + "/active", "{\"active\":false}").statusCode());
        assertEquals(0, body(admin.get("/api/admin/employees?q=webtester")).get("employees").size());
        assertEquals(1, body(admin.get("/api/admin/employees?q=webtester&inactive=true")).get("employees").size());
        assertEquals(400, new Browser().post("/api/login", "{\"username\":\"webtester\",\"password\":\"secret1\"}").statusCode(), "deactivated");
    }

    @Test
    @Order(5)
    void attendanceRegister() throws Exception {
        String day = YearMonth.now().minusMonths(2).atDay(3).toString();
        int ashaId = body(admin.get("/api/admin/employees?q=asha")).at("/employees/0/id").asInt();
        assertEquals(204, admin.put("/api/admin/attendance", "{\"empId\":" + ashaId + ",\"date\":\"" + day + "\",\"status\":\"ABSENT\"}").statusCode());
        String m = day.substring(0, 7);
        JsonNode reg = body(admin.get("/api/admin/attendance?month=" + m));
        boolean found = false;
        for (JsonNode row : reg.get("rows")) {
            if (row.get("empId").asInt() == ashaId) {
                assertEquals("ABSENT", row.at("/marks/" + day).asText());
                found = true;
            }
        }
        assertTrue(found);
        assertEquals(204, admin.put("/api/admin/attendance", "{\"empId\":" + ashaId + ",\"date\":\"" + day + "\",\"status\":null}").statusCode());
        assertEquals(400, admin.put("/api/admin/attendance", "{\"empId\":" + ashaId + ",\"date\":\"" + day + "\",\"status\":\"SICK\"}").statusCode());
    }

    @Test
    @Order(6)
    void payrollRunToPayslip() throws Exception {
        assertEquals(0, body(asha.get("/api/me/payslips")).get("payslips").size());

        HttpResponse<byte[]> run = admin.post("/api/admin/payroll/run", "{\"month\":\"" + MONTH + "\"}");
        assertEquals(200, run.statusCode(), text(run));
        assertEquals(5, body(run).get("created").asInt());
        assertEquals(0, body(admin.post("/api/admin/payroll/run", "{\"month\":\"" + MONTH + "\"}")).get("created").asInt(), "idempotent");

        JsonNode view = body(admin.get("/api/admin/payroll?month=" + MONTH));
        assertEquals(5, view.get("payrolls").size());
        assertEquals(5, view.at("/counts/GENERATED").asInt());

        assertEquals(0, body(asha.get("/api/me/payslips")).get("payslips").size(), "hidden until verified");
        assertEquals(400, asha.get("/api/me/payslips/" + MONTH).statusCode());

        StringBuilder ids = new StringBuilder();
        for (JsonNode p : view.get("payrolls")) {
            ids.append(ids.length() == 0 ? "" : ",").append(p.get("payrollId").asInt());
        }
        JsonNode bulk = body(admin.post("/api/admin/payroll/bulk", "{\"ids\":[" + ids + "],\"action\":\"verify\"}"));
        assertEquals(5, bulk.get("done").asInt());
        assertEquals(0, bulk.get("failures").size());

        JsonNode slips = body(asha.get("/api/me/payslips")).get("payslips");
        assertEquals(1, slips.size());
        HttpResponse<byte[]> slip = asha.get("/api/me/payslips/" + MONTH);
        assertEquals(200, slip.statusCode());
        assertEquals("Asha Verma", body(slip).get("employeeName").asText());
        assertFalse(text(slip).toLowerCase().contains("hash"));
        HttpResponse<byte[]> pdf = asha.get("/api/me/payslips/" + MONTH + "/pdf");
        assertEquals(200, pdf.statusCode());
        assertEquals("%PDF", new String(pdf.body(), 0, 4, StandardCharsets.US_ASCII));

        int firstId = view.at("/payrolls/0/payrollId").asInt();
        assertEquals(204, admin.post("/api/admin/payroll/" + firstId + "/pay", "").statusCode());
        assertEquals(400, admin.post("/api/admin/payroll/" + firstId + "/cancel", "").statusCode(), "paid is final");
        assertEquals(404, admin.post("/api/admin/payroll/" + firstId + "/explode", "").statusCode());
    }

    @Test
    @Order(7)
    void reportsOverviewAndAudit() throws Exception {
        HttpResponse<byte[]> csv = admin.get("/api/admin/reports/payroll?month=" + MONTH + "&format=csv");
        assertEquals(200, csv.statusCode());
        assertTrue(csv.headers().firstValue("Content-Type").orElse("").startsWith("text/csv"));
        assertTrue(text(csv).startsWith("Employee,Month"));
        assertEquals(5, body(admin.get("/api/admin/reports/payroll?month=" + MONTH)).get("rows").size());
        assertEquals(404, admin.get("/api/admin/reports/nothing").statusCode());

        JsonNode ov = body(admin.get("/api/admin/overview"));
        assertEquals(5, ov.get("activeEmployees").asInt());
        assertEquals(6, ov.get("trend").size());
        assertTrue(ov.get("byDepartment").size() > 0);
        assertTrue(body(admin.get("/api/admin/audit?action=PAID")).get("entries").size() >= 1);
        assertEquals(400, admin.get("/api/admin/audit?month=garbage").statusCode());
    }

    @Test
    @Order(8)
    void logoutEndsTheSession() throws Exception {
        assertEquals(204, asha.post("/api/logout", "").statusCode());
        assertEquals(401, asha.get("/api/me").statusCode());
    }
}
