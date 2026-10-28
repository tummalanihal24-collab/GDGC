package com.payroll.dao;

import com.payroll.model.Employee;

import java.util.ArrayList;
import java.util.List;

public class EmployeeDAO {
    private static final String SELECT = """
            SELECT u.id, u.name, u.email, u.username, u.password_hash, u.role,
                   e.designation, e.joining_date, e.basic_salary, e.dept_id, d.dept_name, e.is_active
            FROM employee e
            JOIN users u ON u.id = e.emp_id
            LEFT JOIN department d ON d.dept_id = e.dept_id
            """;

    /** The user row must already exist (its id is the employee id). */
    public void addEmployee(Employee e) {
        Sql.update("INSERT INTO employee (emp_id, designation, joining_date, basic_salary, dept_id, is_active) VALUES (?, ?, ?, ?, ?, ?)",
                e.getId(), e.getDesignation(), e.getJoiningDate(), e.getBasicSalary(), e.getDeptId(), e.isActive());
    }

    public void updateEmployee(Employee e) {
        Sql.update("UPDATE employee SET designation = ?, joining_date = ?, basic_salary = ?, dept_id = ? WHERE emp_id = ?",
                e.getDesignation(), e.getJoiningDate(), e.getBasicSalary(), e.getDeptId(), e.getId());
    }

    /** Soft delete: payroll history must stay intact. */
    public void setActive(int empId, boolean active) {
        Sql.update("UPDATE employee SET is_active = ? WHERE emp_id = ?", active, empId);
    }

    public Employee findById(int empId) {
        return Sql.queryOne(SELECT + " WHERE e.emp_id = ?", EmployeeDAO::map, empId);
    }

    /**
     * @param deptId      only this department, or null for all
     * @param activeOnly  hide deactivated employees
     * @param keyword     matches name, username, email or designation, or null
     */
    public List<Employee> getEmployees(Integer deptId, boolean activeOnly, String keyword) {
        StringBuilder sql = new StringBuilder(SELECT).append(" WHERE 1 = 1");
        List<Object> params = new ArrayList<>();
        if (deptId != null) {
            sql.append(" AND e.dept_id = ?");
            params.add(deptId);
        }
        if (activeOnly) {
            sql.append(" AND e.is_active = TRUE");
        }
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (LOWER(u.name) LIKE ? OR LOWER(u.username) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(e.designation) LIKE ?)");
            String like = "%" + keyword.trim().toLowerCase() + "%";
            for (int i = 0; i < 4; i++) {
                params.add(like);
            }
        }
        sql.append(" ORDER BY u.name");
        return Sql.query(sql.toString(), EmployeeDAO::map, params.toArray());
    }

    public int countInDepartment(int deptId) {
        return Sql.queryOne("SELECT COUNT(*) FROM employee WHERE dept_id = ?", rs -> rs.getInt(1), deptId);
    }

    private static Employee map(java.sql.ResultSet rs) throws java.sql.SQLException {
        Employee e = new Employee();
        e.setId(rs.getInt("id"));
        e.setName(rs.getString("name"));
        e.setEmail(rs.getString("email"));
        e.setUsername(rs.getString("username"));
        e.setPasswordHash(rs.getString("password_hash"));
        e.setDesignation(rs.getString("designation"));
        e.setJoiningDate(Sql.date(rs, "joining_date"));
        e.setBasicSalary(rs.getBigDecimal("basic_salary"));
        int dept = rs.getInt("dept_id");
        e.setDeptId(rs.wasNull() ? null : dept);
        e.setDeptName(rs.getString("dept_name"));
        e.setActive(rs.getBoolean("is_active"));
        return e;
    }
}
