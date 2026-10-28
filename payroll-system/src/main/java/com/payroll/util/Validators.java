package com.payroll.util;

import com.payroll.service.ServiceException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.regex.Pattern;

public final class Validators {
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern USERNAME = Pattern.compile("^[A-Za-z0-9._-]{3,30}$");

    private Validators() {
    }

    public static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new ServiceException(field + " is required");
        }
        return value.trim();
    }

    public static String email(String value) {
        String v = required(value, "Email");
        if (!EMAIL.matcher(v).matches()) {
            throw new ServiceException("Email is not valid");
        }
        return v;
    }

    public static String username(String value) {
        String v = required(value, "Username");
        if (!USERNAME.matcher(v).matches()) {
            throw new ServiceException("Username must be 3-30 letters, digits, '.', '_' or '-'");
        }
        return v;
    }

    public static String password(String value) {
        if (value == null || value.length() < 6) {
            throw new ServiceException("Password must be at least 6 characters");
        }
        return value;
    }

    public static BigDecimal percent(BigDecimal value, String field) {
        if (value == null || value.signum() < 0 || value.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ServiceException(field + " must be between 0 and 100");
        }
        return value;
    }

    public static LocalDate date(String text, String field) {
        try {
            return LocalDate.parse(required(text, field));
        } catch (DateTimeParseException e) {
            throw new ServiceException(field + " must be a date in yyyy-MM-dd format");
        }
    }

    public static YearMonth month(String text) {
        try {
            return YearMonth.parse(required(text, "Month"));
        } catch (DateTimeParseException e) {
            throw new ServiceException("Month must be in yyyy-MM format");
        }
    }
}
