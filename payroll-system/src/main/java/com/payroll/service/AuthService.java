package com.payroll.service;

import com.payroll.dao.UserDAO;
import com.payroll.model.Employee;
import com.payroll.model.Person;
import com.payroll.util.Validators;
import org.mindrot.jbcrypt.BCrypt;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class AuthService {
    static final int MAX_FAILED_ATTEMPTS = 5;
    static final Duration LOCK_TIME = Duration.ofMinutes(15);

    private final UserDAO userDao = new UserDAO();

    public String hashPassword(String password) {
        return BCrypt.hashpw(password, BCrypt.gensalt(10));
    }

    public boolean verifyPassword(String password, String hash) {
        try {
            return password != null && hash != null && BCrypt.checkpw(password, hash);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    /** Returns the logged-in Admin or Employee, or throws ServiceException with a user-facing reason. */
    public Person login(String username, String password) {
        Validators.required(username, "Username");
        Validators.required(password, "Password");
        Person p = userDao.findByUsername(username.trim());
        if (p == null) {
            throw new ServiceException("Invalid username or password");
        }
        LocalDateTime now = LocalDateTime.now();
        if (p.getLockedUntil() != null && p.getLockedUntil().isAfter(now)) {
            throw new ServiceException("Account locked after too many failed attempts. Try again after "
                    + p.getLockedUntil().format(DateTimeFormatter.ofPattern("HH:mm")));
        }
        if (!verifyPassword(password, p.getPasswordHash())) {
            int attempts = p.getFailedAttempts() + 1;
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                userDao.recordFailure(p.getId(), 0, now.plus(LOCK_TIME));
                throw new ServiceException("Too many failed attempts. Account locked for "
                        + LOCK_TIME.toMinutes() + " minutes");
            }
            userDao.recordFailure(p.getId(), attempts, null);
            throw new ServiceException("Invalid username or password");
        }
        if (p instanceof Employee e && !e.isActive()) {
            throw new ServiceException("This account has been deactivated. Contact HR");
        }
        if (p.getFailedAttempts() > 0 || p.getLockedUntil() != null) {
            userDao.resetFailures(p.getId());
        }
        return p;
    }

    public void changePassword(int userId, String currentPassword, String newPassword) {
        Person p = userDao.findById(userId);
        if (p == null || !verifyPassword(currentPassword, p.getPasswordHash())) {
            throw new ServiceException("Current password is incorrect");
        }
        Validators.password(newPassword);
        userDao.updatePasswordHash(userId, hashPassword(newPassword));
    }

    /** Admin-initiated reset, no current password needed. */
    public void resetPassword(int userId, String newPassword) {
        Validators.password(newPassword);
        userDao.updatePasswordHash(userId, hashPassword(newPassword));
    }
}
