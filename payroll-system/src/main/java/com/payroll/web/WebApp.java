package com.payroll.web;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.payroll.db.DBConnection;
import com.payroll.db.DataAccessException;
import com.payroll.db.DatabaseInitializer;
import com.payroll.service.PayrollScheduler;
import com.payroll.service.ServiceException;
import io.javalin.Javalin;
import io.javalin.http.HttpResponseException;
import io.javalin.http.HttpStatus;
import io.javalin.json.JavalinJackson;
import io.javalin.http.staticfiles.Location;
import org.eclipse.jetty.http.HttpCookie;
import org.eclipse.jetty.server.session.SessionHandler;

import java.util.Map;

/** Entry point: starts the REST API and serves the browser front end from /public. */
public final class WebApp {
    private WebApp() {
    }

    public static void main(String[] args) {
        System.setProperty("org.slf4j.simpleLogger.defaultLogLevel", "warn");
        DBConnection.init();
        DatabaseInitializer.run();

        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        String host = System.getenv().getOrDefault("PAYROLL_HOST", "127.0.0.1");
        Javalin app = create().start(host, port);

        PayrollScheduler scheduler = new PayrollScheduler(Svc.payroll,
                r -> System.out.println("Scheduled payroll " + r.month() + ": " + r.created() + " created"));
        scheduler.start();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            scheduler.stop();
            app.stop();
            DBConnection.close();
        }));
        System.out.println("Payroll Management System is running at http://" + (host.equals("0.0.0.0") ? "localhost" : host) + ":" + port);
    }

    static ObjectMapper mapper() {
        return new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .enable(JsonGenerator.Feature.WRITE_BIGDECIMAL_AS_PLAIN)
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
    }

    /** Builds the app without starting it, so tests can start it on a free port. */
    public static Javalin create() {
        Javalin app = Javalin.create(config -> {
            config.jsonMapper(new JavalinJackson(mapper(), false));
            config.staticFiles.add(f -> {
                f.directory = "/public";
                f.location = Location.CLASSPATH;
                f.headers = Map.of("Cache-Control", "no-cache");
            });
            config.jetty.modifyServletContextHandler(h -> {
                SessionHandler sh = h.getSessionHandler();
                if (sh != null) {
                    sh.setHttpOnly(true);
                    sh.setSameSite(HttpCookie.SameSite.STRICT);
                    sh.setMaxInactiveInterval(8 * 3600);
                    sh.setSessionCookie("PAYROLLSESSION");
                }
            });
        });

        // Security headers on every response (the front end uses no inline script or style).
        app.after(ctx -> {
            ctx.header("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
            ctx.header("X-Content-Type-Options", "nosniff");
            ctx.header("Referrer-Policy", "same-origin");
            ctx.header("X-Frame-Options", "DENY");
        });

        Api.register(app);
        AdminApi.register(app);

        app.exception(ServiceException.class, (e, ctx) -> ctx.status(400).json(Map.of("error", e.getMessage())));
        app.exception(HttpResponseException.class, (e, ctx) -> ctx.status(e.getStatus()).json(Map.of("error", e.getMessage())));
        app.exception(DataAccessException.class, (e, ctx) -> {
            e.printStackTrace();
            ctx.status(500).json(Map.of("error", "Database problem. See the server log."));
        });
        app.exception(Exception.class, (e, ctx) -> {
            e.printStackTrace();
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of("error", "Unexpected server error."));
        });
        return app;
    }
}
