package com.payroll.model;

public record Department(int deptId, String deptName, String location) {
    @Override
    public String toString() {
        return deptName;
    }
}
