package com.payroll.db;

import com.payroll.dao.UserDAO;
import com.payroll.model.Admin;
import com.payroll.model.Department;
import com.payroll.model.Employee;
import com.payroll.service.AuthService;
import com.payroll.service.DepartmentService;
import com.payroll.service.EmployeeService;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.List;

/** Creates missing tables and, on a brand-new database, inserts demo data. */
public final class DatabaseInitializer {
    private DatabaseInitializer() {
    }

    public static void run() {
        createSchema();
        seedIfEmpty();
    }

    public static void createSchema() {
        try (Connection c = DBConnection.getConnection(); Statement st = c.createStatement()) {
            for (String sql : loadSchemaStatements()) {
                st.execute(sql);
            }
        } catch (SQLException e) {
            throw new DataAccessException("Could not create schema: " + e.getMessage(), e);
        }
    }

    static List<String> loadSchemaStatements() {
        try (InputStream in = DatabaseInitializer.class.getResourceAsStream("/schema.sql")) {
            if (in == null) {
                throw new DataAccessException("schema.sql not found on classpath", null);
            }
            String text = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            StringBuilder cleaned = new StringBuilder();
            for (String line : text.split("\n")) {
                int c = line.indexOf("--");
                cleaned.append(c >= 0 ? line.substring(0, c) : line).append('\n');
            }
            return java.util.Arrays.stream(cleaned.toString().split(";"))
                    .map(String::trim).filter(s -> !s.isEmpty()).toList();
        } catch (IOException e) {
            throw new DataAccessException("Cannot read schema.sql", e);
        }
    }

    public static void seedIfEmpty() {
        UserDAO users = new UserDAO();
        if (users.count() > 0) {
            return;
        }
        AuthService auth = new AuthService();
        DepartmentService depts = new DepartmentService();
        EmployeeService employees = new EmployeeService();

        Admin admin = new Admin();
        admin.setName("HR Admin");
        admin.setEmail("admin@company.com");
        admin.setUsername("admin");
        admin.setPasswordHash(auth.hashPassword("admin123"));
        users.insert(admin);

        Department eng = depts.add("Engineering", "Head Office");
        Department hr = depts.add("Human Resources", "Head Office");
        Department fin = depts.add("Finance", "Annex");
        Department sales = depts.add("Sales", "Regional Office");

        Object[][] demo = {
                {"Asha Verma", "asha", "Software Engineer", eng, "60000"},
                {"Rohan Mehta", "rohan", "Senior Engineer", eng, "85000"},
                {"Priya Nair", "priya", "HR Executive", hr, "45000"},
                {"Karan Shah", "karan", "Accountant", fin, "50000"},
                {"Neha Gupta", "neha", "Sales Manager", sales, "70000"}
        };
        for (Object[] d : demo) {
            Employee e = new Employee();
            e.setName((String) d[0]);
            e.setUsername((String) d[1]);
            e.setEmail(d[1] + "@company.com");
            e.setDesignation((String) d[2]);
            e.setDeptId(((Department) d[3]).deptId());
            e.setBasicSalary(new BigDecimal((String) d[4]));
            e.setJoiningDate(LocalDate.now().minusYears(1).withDayOfMonth(1));
            employees.addEmployee(e, "emp123");
        }
    }
}
