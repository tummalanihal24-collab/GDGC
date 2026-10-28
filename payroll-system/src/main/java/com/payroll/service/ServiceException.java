package com.payroll.service;

/** A problem the user can fix (validation, business rule). The message is safe to show on screen. */
public class ServiceException extends RuntimeException {
    public ServiceException(String message) {
        super(message);
    }
}
