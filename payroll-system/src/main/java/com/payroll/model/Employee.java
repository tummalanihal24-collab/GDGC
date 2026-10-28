package com.payroll.model;

import java.math.BigDecimal;
import java.time.LocalDate;

public class Employee extends Person {
    private String designation;
    private LocalDate joiningDate;
    private BigDecimal basicSalary = BigDecimal.ZERO;
    private Integer deptId;
    private String deptName;
    private boolean active = true;

    public Employee() {
        setRole(Role.EMPLOYEE);
    }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }
    public LocalDate getJoiningDate() { return joiningDate; }
    public void setJoiningDate(LocalDate joiningDate) { this.joiningDate = joiningDate; }
    public BigDecimal getBasicSalary() { return basicSalary; }
    public void setBasicSalary(BigDecimal basicSalary) { this.basicSalary = basicSalary; }
    public Integer getDeptId() { return deptId; }
    public void setDeptId(Integer deptId) { this.deptId = deptId; }
    public String getDeptName() { return deptName; }
    public void setDeptName(String deptName) { this.deptName = deptName; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
