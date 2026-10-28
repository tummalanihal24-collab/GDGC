package com.payroll.dao;

import com.payroll.model.SalaryStructure;

import java.util.List;

public class SalaryStructureDAO {
    private static final String SELECT =
            "SELECT struct_id, emp_id, hra_percent, da_percent, pf_percent, tax_percent FROM salary_structure";

    public SalaryStructure getStructure(int empId) {
        return Sql.queryOne(SELECT + " WHERE emp_id = ?", SalaryStructureDAO::map, empId);
    }

    public List<SalaryStructure> getAll() {
        return Sql.query(SELECT, SalaryStructureDAO::map);
    }

    public void setStructure(SalaryStructure s) {
        int updated = Sql.update("UPDATE salary_structure SET hra_percent = ?, da_percent = ?, pf_percent = ?, tax_percent = ? WHERE emp_id = ?",
                s.hraPercent(), s.daPercent(), s.pfPercent(), s.taxPercent(), s.empId());
        if (updated == 0) {
            Sql.insert("INSERT INTO salary_structure (emp_id, hra_percent, da_percent, pf_percent, tax_percent) VALUES (?, ?, ?, ?, ?)",
                    s.empId(), s.hraPercent(), s.daPercent(), s.pfPercent(), s.taxPercent());
        }
    }

    private static SalaryStructure map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new SalaryStructure(rs.getInt("struct_id"), rs.getInt("emp_id"), null,
                rs.getBigDecimal("hra_percent"), rs.getBigDecimal("da_percent"),
                rs.getBigDecimal("pf_percent"), rs.getBigDecimal("tax_percent"));
    }
}
