package com.payroll.model;

import java.time.LocalDateTime;

public record PayrollAudit(int auditId, int payrollId, String empName, String payMonth,
                           String action, String actionBy, LocalDateTime actionTime, String details) {
}
