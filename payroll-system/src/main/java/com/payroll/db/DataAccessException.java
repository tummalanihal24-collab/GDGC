package com.payroll.db;

import java.sql.SQLException;

public class DataAccessException extends RuntimeException {
    public DataAccessException(String message, Throwable cause) {
        super(message, cause);
    }

    /** True when the database rejected the statement because of a unique / foreign key / check constraint. */
    public boolean isConstraintViolation() {
        for (Throwable t = getCause(); t != null; t = t.getCause()) {
            if (t instanceof SQLException s && s.getSQLState() != null && s.getSQLState().startsWith("23")) {
                return true;
            }
        }
        return false;
    }
}
