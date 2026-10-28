package com.payroll.dao;

import com.payroll.model.Department;

import java.util.List;

public class DepartmentDAO {
    public int addDepartment(String name, String location) {
        return Sql.insert("INSERT INTO department (dept_name, location) VALUES (?, ?)", name, location);
    }

    public void updateDepartment(Department d) {
        Sql.update("UPDATE department SET dept_name = ?, location = ? WHERE dept_id = ?",
                d.deptName(), d.location(), d.deptId());
    }

    public void deleteDepartment(int deptId) {
        Sql.update("DELETE FROM department WHERE dept_id = ?", deptId);
    }

    public Department getDepartment(int deptId) {
        return Sql.queryOne("SELECT dept_id, dept_name, location FROM department WHERE dept_id = ?",
                rs -> new Department(rs.getInt(1), rs.getString(2), rs.getString(3)), deptId);
    }

    public List<Department> getAll() {
        return Sql.query("SELECT dept_id, dept_name, location FROM department ORDER BY dept_name",
                rs -> new Department(rs.getInt(1), rs.getString(2), rs.getString(3)));
    }
}
