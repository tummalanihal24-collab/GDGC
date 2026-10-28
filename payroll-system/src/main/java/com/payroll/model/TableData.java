package com.payroll.model;

import java.util.List;

/** Generic tabular result used by reports (on screen and for CSV export). */
public record TableData(List<String> columns, List<Object[]> rows) {
}
