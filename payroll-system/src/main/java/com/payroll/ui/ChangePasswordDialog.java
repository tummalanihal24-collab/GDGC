package com.payroll.ui;

import com.payroll.model.Person;
import com.payroll.service.AuthService;
import com.payroll.service.ServiceException;

import javax.swing.JComponent;
import javax.swing.JPasswordField;
import java.awt.Component;

final class ChangePasswordDialog {
    private ChangePasswordDialog() {
    }

    static void show(Component parent, Person user) {
        JPasswordField current = new JPasswordField(18);
        JPasswordField next = new JPasswordField(18);
        JPasswordField confirm = new JPasswordField(18);
        while (Ui.form(parent, "Change password", new String[]{"Current password", "New password", "Confirm new password"},
                new JComponent[]{current, next, confirm})) {
            try {
                String n = new String(next.getPassword());
                if (!n.equals(new String(confirm.getPassword()))) {
                    throw new ServiceException("New passwords do not match");
                }
                new AuthService().changePassword(user.getId(), new String(current.getPassword()), n);
                Ui.info(parent, "Password changed");
                return;
            } catch (RuntimeException e) {
                Ui.showError(parent, e);
            }
        }
    }
}
