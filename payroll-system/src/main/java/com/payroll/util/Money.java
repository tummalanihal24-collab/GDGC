package com.payroll.util;

import com.payroll.service.ServiceException;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class Money {
    private Money() {
    }

    public static BigDecimal round(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal percentOf(BigDecimal amount, BigDecimal percent) {
        return round(amount.multiply(percent).divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
    }

    public static BigDecimal parse(String text, String field) {
        try {
            BigDecimal v = new BigDecimal(text.trim().replace(",", ""));
            if (v.signum() < 0) {
                throw new ServiceException(field + " cannot be negative");
            }
            return round(v);
        } catch (NumberFormatException | NullPointerException e) {
            throw new ServiceException(field + " must be a number");
        }
    }

    public static String fmt(BigDecimal v) {
        return v == null ? "" : String.format("%,.2f", v);
    }
}
