package com.payroll.db;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Properties;
import java.util.function.Supplier;

/**
 * Pooled JDBC access. Inside {@link #inTransaction(Supplier)} every DAO call on the same thread
 * shares one connection, so a multi-step operation commits or rolls back as a unit.
 */
public final class DBConnection {
    private static HikariDataSource dataSource;
    private static final ThreadLocal<Connection> TX = new ThreadLocal<>();

    private DBConnection() {
    }

    /** Reads db.properties (see README for lookup order) and starts the pool. */
    public static synchronized void init() {
        if (dataSource != null) {
            return;
        }
        Properties p = loadProperties();
        configure(env("PAYROLL_DB_URL", p.getProperty("db.url")),
                env("PAYROLL_DB_USER", p.getProperty("db.user")),
                env("PAYROLL_DB_PASSWORD", p.getProperty("db.password", "")));
    }

    public static synchronized void configure(String url, String user, String password) {
        close();
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl(url);
        cfg.setUsername(user);
        cfg.setPassword(password);
        cfg.setMaximumPoolSize(8);
        cfg.setConnectionTimeout(8000);
        dataSource = new HikariDataSource(cfg);
    }

    public static synchronized void close() {
        if (dataSource != null) {
            dataSource.close();
            dataSource = null;
        }
    }

    public static Connection getConnection() throws SQLException {
        Connection tx = TX.get();
        if (tx != null) {
            return nonClosing(tx);
        }
        if (dataSource == null) {
            init();
        }
        return dataSource.getConnection();
    }

    public static <T> T inTransaction(Supplier<T> work) {
        if (TX.get() != null) {
            return work.get();
        }
        try (Connection c = getConnection()) {
            c.setAutoCommit(false);
            TX.set(c);
            try {
                T result = work.get();
                c.commit();
                return result;
            } catch (RuntimeException | Error e) {
                c.rollback();
                throw e;
            } finally {
                TX.remove();
                c.setAutoCommit(true);
            }
        } catch (SQLException e) {
            throw new DataAccessException("Transaction failed: " + e.getMessage(), e);
        }
    }

    public static void inTransaction(Runnable work) {
        inTransaction(() -> {
            work.run();
            return null;
        });
    }

    private static Connection nonClosing(Connection real) {
        InvocationHandler h = (proxy, method, args) -> {
            if (method.getName().equals("close")) {
                return null;
            }
            try {
                return method.invoke(real, args);
            } catch (InvocationTargetException e) {
                throw e.getCause();
            }
        };
        return (Connection) Proxy.newProxyInstance(Connection.class.getClassLoader(), new Class<?>[]{Connection.class}, h);
    }

    private static String env(String name, String fallback) {
        String v = System.getenv(name);
        return v != null && !v.isBlank() ? v : fallback;
    }

    private static Properties loadProperties() {
        Properties p = new Properties();
        String explicit = System.getProperty("payroll.config");
        Path[] candidates = {
                explicit == null ? null : Path.of(explicit),
                Path.of("config", "db.properties")
        };
        for (Path c : candidates) {
            if (c != null && Files.isReadable(c)) {
                try (InputStream in = Files.newInputStream(c)) {
                    p.load(in);
                    return p;
                } catch (IOException e) {
                    throw new DataAccessException("Cannot read " + c, e);
                }
            }
        }
        try (InputStream in = DBConnection.class.getResourceAsStream("/db.properties")) {
            if (in != null) {
                p.load(in);
            }
        } catch (IOException e) {
            throw new DataAccessException("Cannot read bundled db.properties", e);
        }
        return p;
    }
}
