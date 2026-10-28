package com.payroll.ui;

import com.payroll.model.Person;

import javax.swing.BorderFactory;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTabbedPane;
import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;

/** Main window for the Admin / HR role. */
public class AdminDashboard extends JFrame {
    public AdminDashboard(Person admin, LoginFrame loginFrame) {
        super("Payroll Management System - Admin");
        setDefaultCloseOperation(EXIT_ON_CLOSE);

        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Overview", new OverviewPanel());
        tabs.addTab("Employees", new EmployeePanel());
        tabs.addTab("Departments", new DepartmentPanel());
        tabs.addTab("Salary Structure", new SalaryStructurePanel());
        tabs.addTab("Attendance", new AttendancePanel());
        tabs.addTab("Run Payroll", new PayrollPanel(admin.getUsername()));
        tabs.addTab("Reports", new ReportsPanel());
        tabs.addTab("Audit Log", new AuditPanel());
        tabs.addChangeListener(e -> {
            Component c = tabs.getSelectedComponent();
            if (c instanceof Refreshable r) {
                r.refresh();
            }
        });

        JPanel header = new JPanel(new BorderLayout());
        header.setBorder(BorderFactory.createEmptyBorder(8, 12, 8, 12));
        JLabel hello = new JLabel("Signed in as " + admin.getName() + " (Admin)");
        hello.setFont(hello.getFont().deriveFont(Font.BOLD));
        header.add(hello, BorderLayout.WEST);
        JPanel actions = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        actions.add(Ui.button("Change Password", () -> ChangePasswordDialog.show(this, admin)));
        actions.add(Ui.button("Logout", () -> {
            dispose();
            loginFrame.clear();
            loginFrame.setVisible(true);
        }));
        header.add(actions, BorderLayout.EAST);

        add(header, BorderLayout.NORTH);
        add(tabs, BorderLayout.CENTER);
        setPreferredSize(new Dimension(1180, 720));
        pack();
        setLocationRelativeTo(null);
        ((Refreshable) tabs.getComponentAt(0)).refresh();
    }
}
