package com.payroll.dao;

import com.payroll.model.Admin;
import com.payroll.model.Employee;
import com.payroll.model.Person;
import com.payroll.model.Role;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;

/** Accounts (users table): login data shared by Admin and Employee. */
public class UserDAO {
    private static final String SELECT = """
            SELECT u.id, u.name, u.email, u.username, u.password_hash, u.role, u.failed_attempts, u.locked_until,
                   e.designation, e.joining_date, e.basic_salary, e.dept_id, e.is_active, d.dept_name
            FROM users u
            LEFT JOIN employee e ON e.emp_id = u.id
            LEFT JOIN department d ON d.dept_id = e.dept_id
            """;

    public Person findByUsername(String username) {
        return Sql.queryOne(SELECT + " WHERE u.username = ?", UserDAO::map, username);
    }

    public Person findById(int id) {
        return Sql.queryOne(SELECT + " WHERE u.id = ?", UserDAO::map, id);
    }

    public int count() {
        return Sql.queryOne("SELECT COUNT(*) FROM users", rs -> rs.getInt(1));
    }

    /** Inserts the account row and sets the generated id on the person. */
    public int insert(Person p) {
        int id = Sql.insert("INSERT INTO users (name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?)",
                p.getName(), p.getEmail(), p.getUsername(), p.getPasswordHash(), p.getRole());
        p.setId(id);
        return id;
    }

    public void updateProfile(int id, String name, String email) {
        Sql.update("UPDATE users SET name = ?, email = ? WHERE id = ?", name, email, id);
    }

    public void updatePasswordHash(int id, String hash) {
        Sql.update("UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?", hash, id);
    }

    public void recordFailure(int id, int attempts, LocalDateTime lockedUntil) {
        Sql.update("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?", attempts, lockedUntil, id);
    }

    public void resetFailures(int id) {
        Sql.update("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?", id);
    }

    private static Person map(ResultSet rs) throws SQLException {
        Person p;
        if (Role.ADMIN.equals(rs.getString("role"))) {
            p = new Admin();
        } else {
            Employee e = new Employee();
            e.setDesignation(rs.getString("designation"));
            e.setJoiningDate(Sql.date(rs, "joining_date"));
            e.setBasicSalary(rs.getBigDecimal("basic_salary"));
            int dept = rs.getInt("dept_id");
            e.setDeptId(rs.wasNull() ? null : dept);
            e.setDeptName(rs.getString("dept_name"));
            e.setActive(rs.getBoolean("is_active"));
            p = e;
        }
        p.setId(rs.getInt("id"));
        p.setName(rs.getString("name"));
        p.setEmail(rs.getString("email"));
        p.setUsername(rs.getString("username"));
        p.setPasswordHash(rs.getString("password_hash"));
        p.setRole(rs.getString("role"));
        p.setFailedAttempts(rs.getInt("failed_attempts"));
        p.setLockedUntil(Sql.dateTime(rs, "locked_until"));
        return p;
    }
}
