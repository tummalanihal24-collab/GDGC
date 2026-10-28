package com.payroll.service;

import com.payroll.dao.DepartmentDAO;
import com.payroll.dao.EmployeeDAO;
import com.payroll.db.DataAccessException;
import com.payroll.model.Department;
import com.payroll.util.Validators;

import java.util.List;

public class DepartmentService {
    private final DepartmentDAO deptDao = new DepartmentDAO();
    private final EmployeeDAO employeeDao = new EmployeeDAO();

    public List<Department> getAll() {
        return deptDao.getAll();
    }

    public Department add(String name, String location) {
        String n = Validators.required(name, "Department name");
        String loc = location == null ? "" : location.trim();
        try {
            int id = deptDao.addDepartment(n, loc);
            return new Department(id, n, loc);
        } catch (DataAccessException e) {
            throw duplicate(e, n);
        }
    }

    public void update(int deptId, String name, String location) {
        String n = Validators.required(name, "Department name");
        try {
            deptDao.updateDepartment(new Department(deptId, n, location == null ? "" : location.trim()));
        } catch (DataAccessException e) {
            throw duplicate(e, n);
        }
    }

    public void delete(int deptId) {
        int members = employeeDao.countInDepartment(deptId);
        if (members > 0) {
            throw new ServiceException("Cannot delete: " + members + " employee(s) still belong to this department");
        }
        deptDao.deleteDepartment(deptId);
    }

    public int employeeCount(int deptId) {
        return employeeDao.countInDepartment(deptId);
    }

    private static RuntimeException duplicate(DataAccessException e, String name) {
        return e.isConstraintViolation() ? new ServiceException("Department '" + name + "' already exists") : e;
    }
}
