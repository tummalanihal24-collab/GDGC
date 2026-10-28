package com.payroll.service;

import com.payroll.dao.EmployeeDAO;
import com.payroll.dao.SalaryStructureDAO;
import com.payroll.dao.UserDAO;
import com.payroll.db.DBConnection;
import com.payroll.db.DataAccessException;
import com.payroll.model.Employee;
import com.payroll.model.Person;
import com.payroll.model.SalaryStructure;
import com.payroll.util.Validators;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EmployeeService {
    private final UserDAO userDao = new UserDAO();
    private final EmployeeDAO employeeDao = new EmployeeDAO();
    private final SalaryStructureDAO structureDao = new SalaryStructureDAO();
    private final AuthService auth = new AuthService();

    public Employee addEmployee(Employee e, String rawPassword) {
        validate(e);
        Validators.username(e.getUsername());
        Validators.password(rawPassword);
        e.setUsername(e.getUsername().trim());
        e.setPasswordHash(auth.hashPassword(rawPassword));
        try {
            DBConnection.inTransaction(() -> {
                userDao.insert(e);
                employeeDao.addEmployee(e);
                structureDao.setStructure(SalaryStructure.defaults(e.getId(), e.getName()));
            });
        } catch (DataAccessException ex) {
            throw ex.isConstraintViolation() ? new ServiceException("Username or email already exists") : ex;
        }
        return e;
    }

    public void updateEmployee(Employee e) {
        validate(e);
        try {
            DBConnection.inTransaction(() -> {
                userDao.updateProfile(e.getId(), e.getName(), e.getEmail());
                employeeDao.updateEmployee(e);
            });
        } catch (DataAccessException ex) {
            throw ex.isConstraintViolation() ? new ServiceException("Email already exists") : ex;
        }
    }

    public void setActive(int empId, boolean active) {
        employeeDao.setActive(empId, active);
    }

    public Employee get(int empId) {
        return employeeDao.findById(empId);
    }

    public List<Employee> search(Integer deptId, boolean includeInactive, String keyword) {
        return employeeDao.getEmployees(deptId, !includeInactive, keyword);
    }

    /** Self-service profile edit for any account type. */
    public void updateProfile(Person p, String name, String email) {
        String n = Validators.required(name, "Name");
        String m = Validators.email(email);
        try {
            userDao.updateProfile(p.getId(), n, m);
        } catch (DataAccessException ex) {
            throw ex.isConstraintViolation() ? new ServiceException("Email already exists") : ex;
        }
        p.setName(n);
        p.setEmail(m);
    }

    public SalaryStructure getSalaryStructure(int empId) {
        SalaryStructure s = structureDao.getStructure(empId);
        return s != null ? s : SalaryStructure.defaults(empId, null);
    }

    /** Structure of every active employee (defaults where none is stored), with names filled in. */
    public List<SalaryStructure> listSalaryStructures() {
        Map<Integer, SalaryStructure> stored = new HashMap<>();
        structureDao.getAll().forEach(s -> stored.put(s.empId(), s));
        return employeeDao.getEmployees(null, true, null).stream().map(e -> {
            SalaryStructure s = stored.getOrDefault(e.getId(), SalaryStructure.defaults(e.getId(), e.getName()));
            return new SalaryStructure(s.structId(), e.getId(), e.getName(),
                    s.hraPercent(), s.daPercent(), s.pfPercent(), s.taxPercent());
        }).toList();
    }

    public void saveSalaryStructure(SalaryStructure s) {
        Validators.percent(s.hraPercent(), "HRA %");
        Validators.percent(s.daPercent(), "DA %");
        Validators.percent(s.pfPercent(), "PF %");
        Validators.percent(s.taxPercent(), "Tax %");
        structureDao.setStructure(s);
    }

    private void validate(Employee e) {
        e.setName(Validators.required(e.getName(), "Name"));
        e.setEmail(Validators.email(e.getEmail()));
        Validators.required(e.getDesignation(), "Designation");
        if (e.getJoiningDate() == null) {
            throw new ServiceException("Joining date is required");
        }
        if (e.getBasicSalary() == null || e.getBasicSalary().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ServiceException("Basic salary must be greater than zero");
        }
    }
}
