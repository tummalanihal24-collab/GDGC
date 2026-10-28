package com.payroll.ui;

import com.payroll.model.Person;
import com.payroll.model.Role;
import com.payroll.service.AuthService;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JPasswordField;
import javax.swing.JTextField;
import javax.swing.SwingConstants;
import java.awt.Color;
import java.awt.Font;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;

public class LoginFrame extends JFrame {
    private final AuthService auth = new AuthService();
    private final JTextField usernameField = new JTextField(20);
    private final JPasswordField passwordField = new JPasswordField(20);
    private final JLabel messageLabel = new JLabel(" ", SwingConstants.CENTER);
    private final JButton loginButton = new JButton("Login");

    public LoginFrame() {
        super("Payroll Management System - Login");
        setDefaultCloseOperation(EXIT_ON_CLOSE);

        JPanel form = new JPanel(new GridBagLayout());
        form.setBorder(BorderFactory.createEmptyBorder(24, 32, 24, 32));
        GridBagConstraints c = new GridBagConstraints();
        c.insets = new Insets(6, 6, 6, 6);
        c.fill = GridBagConstraints.HORIZONTAL;
        c.gridwidth = 2;

        JLabel title = new JLabel("Payroll Management System", SwingConstants.CENTER);
        title.setFont(title.getFont().deriveFont(Font.BOLD, 20f));
        c.gridy = 0;
        form.add(title, c);
        JLabel sub = new JLabel("Sign in to continue", SwingConstants.CENTER);
        sub.setForeground(Color.GRAY);
        c.gridy = 1;
        form.add(sub, c);

        c.gridwidth = 1;
        c.gridy = 2;
        c.gridx = 0;
        form.add(new JLabel("Username"), c);
        c.gridx = 1;
        form.add(usernameField, c);
        c.gridy = 3;
        c.gridx = 0;
        form.add(new JLabel("Password"), c);
        c.gridx = 1;
        form.add(passwordField, c);

        c.gridx = 0;
        c.gridy = 4;
        c.gridwidth = 2;
        form.add(loginButton, c);
        messageLabel.setForeground(new Color(0xB00020));
        c.gridy = 5;
        form.add(messageLabel, c);

        loginButton.addActionListener(e -> doLogin());
        passwordField.addActionListener(e -> doLogin());
        usernameField.addActionListener(e -> passwordField.requestFocusInWindow());
        getRootPane().setDefaultButton(loginButton);

        setContentPane(form);
        pack();
        setMinimumSize(getSize());
        setLocationRelativeTo(null);
    }

    public void clear() {
        usernameField.setText("");
        passwordField.setText("");
        messageLabel.setText(" ");
        usernameField.requestFocusInWindow();
    }

    private void doLogin() {
        String user = usernameField.getText();
        String pass = new String(passwordField.getPassword());
        loginButton.setEnabled(false);
        messageLabel.setText("Signing in...");
        Ui.async(this, () -> auth.login(user, pass), person -> {
            passwordField.setText("");
            messageLabel.setText(" ");
            open(person);
        }, () -> {
            loginButton.setEnabled(true);
            messageLabel.setText(" ");
        });
    }

    private void open(Person person) {
        setVisible(false);
        if (Role.ADMIN.equals(person.getRole())) {
            new AdminDashboard(person, this).setVisible(true);
        } else {
            new EmployeePortal(person, this).setVisible(true);
        }
    }
}
