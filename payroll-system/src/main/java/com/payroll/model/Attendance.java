package com.payroll.model;

import java.time.LocalDate;
import java.util.List;

public record Attendance(int attendanceId, int empId, String empName, LocalDate date, String status) {
    public static final String PRESENT = "PRESENT";
    public static final String ABSENT = "ABSENT";
    public static final String LEAVE = "LEAVE";
    public static final List<String> STATUSES = List.of(PRESENT, ABSENT, LEAVE);
}
