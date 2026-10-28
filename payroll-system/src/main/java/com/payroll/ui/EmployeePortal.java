package com.payroll.ui;

import com.payroll.model.Attendance;
import com.payroll.model.Payroll;
import com.payroll.model.Payslip;
import com.payroll.model.Person;
import com.payroll.service.AttendanceService;
import com.payroll.service.EmployeeService;
import com.payroll.service.PayslipService;
import com.payroll.util.Money;
import com.payroll.util.Validators;

import javax.swing.BorderFactory;
import javax.swing.DefaultListModel;
import javax.swing.JComponent;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSplitPane;
import javax.swing.JTabbedPane;
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.ListSelectionModel;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GridLayout;
import java.io.File;
import java.time.YearMonth;
import java.util.List;

/** Self-service window for the Employee role: profile, own attendance, own payslips. */
public class EmployeePortal extends JFrame {
    private final Person user;
    private final EmployeeService employees = new EmployeeService();
    private final AttendanceService attendance = new AttendanceService();
    private final PayslipService payslips = new PayslipService();

    public EmployeePortal(Person user, LoginFrame loginFrame) {
        super("Payroll Management System - Employee Portal");
        this.user = user;
        setDefaultCloseOperation(EXIT_ON_CLOSE);

        ProfileTab profile = new ProfileTab();
        AttendanceTab att = new AttendanceTab();
        PayslipTab slips = new PayslipTab();
        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("My Profile", profile);
        tabs.addTab("My Attendance", att);
        tabs.addTab("My Payslips", slips);
        tabs.addChangeListener(e -> ((Refreshable) tabs.getSelectedComponent()).refresh());

        JPanel header = new JPanel(new BorderLayout());
        header.setBorder(BorderFactory.createEmptyBorder(8, 12, 8, 12));
        JLabel hello = new JLabel("Welcome, " + user.getName());
        hello.setFont(hello.getFont().deriveFont(Font.BOLD));
        header.add(hello, BorderLayout.WEST);
        JPanel actions = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        actions.add(Ui.button("Change Password", () -> ChangePasswordDialog.show(this, user)));
        actions.add(Ui.button("Logout", () -> {
            dispose();
            loginFrame.clear();
            loginFrame.setVisible(true);
        }));
        header.add(actions, BorderLayout.EAST);

        add(header, BorderLayout.NORTH);
        add(tabs, BorderLayout.CENTER);
        setPreferredSize(new Dimension(900, 600));
        pack();
        setLocationRelativeTo(null);
        profile.refresh();
    }

    private class ProfileTab extends JPanel implements Refreshable {
        private final JLabel[] values = new JLabel[7];

        ProfileTab() {
            super(new BorderLayout());
            setBorder(BorderFactory.createEmptyBorder(16, 16, 16, 16));
            String[] labels = {"Name", "Email", "Username", "Designation", "Department", "Joining date", "Basic salary"};
            JPanel grid = new JPanel(new GridLayout(labels.length, 2, 8, 10));
            for (int i = 0; i < labels.length; i++) {
                grid.add(new JLabel(labels[i] + ":"));
                values[i] = new JLabel("-");
                grid.add(values[i]);
            }
            add(grid, BorderLayout.NORTH);
            add(Ui.flow(Ui.button("Edit Name / Email", this::edit)), BorderLayout.SOUTH);
        }

        @Override
        public void refresh() {
            Ui.async(this, () -> employees.get(user.getId()), e -> {
                values[0].setText(e.getName());
                values[1].setText(e.getEmail());
                values[2].setText(e.getUsername());
                values[3].setText(String.valueOf(e.getDesignation()));
                values[4].setText(e.getDeptName() == null ? "-" : e.getDeptName());
                values[5].setText(String.valueOf(e.getJoiningDate()));
                values[6].setText(Money.fmt(e.getBasicSalary()));
            });
        }

        private void edit() {
            JTextField name = new JTextField(user.getName(), 20);
            JTextField email = new JTextField(user.getEmail());
            while (Ui.form(this, "Edit profile", new String[]{"Name", "Email"}, new JComponent[]{name, email})) {
                try {
                    employees.updateProfile(user, name.getText(), email.getText());
                    refresh();
                    return;
                } catch (RuntimeException e) {
                    Ui.showError(this, e);
                }
            }
        }
    }

    private class AttendanceTab extends JPanel implements Refreshable {
        private final DefaultTableModel model = Ui.model("Date", "Status");
        private final JTextField monthField = new JTextField(YearMonth.now().toString(), 8);
        private final JLabel totals = new JLabel(" ");

        AttendanceTab() {
            super(new BorderLayout());
            monthField.addActionListener(e -> refresh());
            add(Ui.flow(new JLabel("Month (yyyy-MM):"), monthField, Ui.button("Show", this::refresh)), BorderLayout.NORTH);
            add(new JScrollPane(Ui.table(model)), BorderLayout.CENTER);
            totals.setBorder(BorderFactory.createEmptyBorder(6, 10, 6, 10));
            add(totals, BorderLayout.SOUTH);
        }

        @Override
        public void refresh() {
            YearMonth m;
            try {
                m = Validators.month(monthField.getText());
            } catch (RuntimeException e) {
                Ui.showError(this, e);
                return;
            }
            Ui.async(this, () -> new Object[]{attendance.getAttendance(user.getId(), m),
                    attendance.countAbsences(user.getId(), m), attendance.count(user.getId(), m, Attendance.LEAVE)}, r -> {
                @SuppressWarnings("unchecked") List<Attendance> rows = (List<Attendance>) r[0];
                model.setRowCount(0);
                rows.forEach(a -> model.addRow(new Object[]{a.date(), a.status()}));
                totals.setText("Marked days: " + rows.size() + "   |   Absent: " + r[1] + "   |   Leave: " + r[2]
                        + "   (days with no record count as present)");
            });
        }
    }

    private class PayslipTab extends JPanel implements Refreshable {
        private final DefaultListModel<Payroll> list = new DefaultListModel<>();
        private final JList<Payroll> months = new JList<>(list);
        private final JTextArea view = new JTextArea();
        private Payslip shown;

        PayslipTab() {
            super(new BorderLayout());
            months.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
            months.setCellRenderer((l, p, i, sel, focus) -> {
                JLabel c = new JLabel(p.payMonth() + "  -  net " + Money.fmt(p.netSalary()) + "  [" + p.status() + "]");
                c.setOpaque(true);
                c.setBorder(BorderFactory.createEmptyBorder(6, 8, 6, 8));
                c.setBackground(sel ? l.getSelectionBackground() : l.getBackground());
                c.setForeground(sel ? l.getSelectionForeground() : l.getForeground());
                return c;
            });
            months.addListSelectionListener(e -> {
                if (!e.getValueIsAdjusting() && months.getSelectedValue() != null) {
                    show(months.getSelectedValue());
                }
            });
            view.setEditable(false);
            view.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
            view.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
            JScrollPane left = new JScrollPane(months);
            left.setPreferredSize(new Dimension(300, 100));
            add(new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, left, new JScrollPane(view)), BorderLayout.CENTER);
            add(Ui.flow(Ui.button("Download PDF", this::download)), BorderLayout.SOUTH);
        }

        @Override
        public void refresh() {
            Ui.async(this, () -> payslips.availablePayslips(user.getId()), rows -> {
                list.clear();
                rows.forEach(list::addElement);
                shown = null;
                view.setText(rows.isEmpty() ? "No payslips are available yet.\nPayslips appear here once HR verifies the month's payroll."
                        : "Select a month on the left.");
                if (!rows.isEmpty()) {
                    months.setSelectedIndex(0);
                }
            });
        }

        private void show(Payroll p) {
            Ui.async(this, () -> {
                Payslip s = payslips.getPayslip(user.getId(), YearMonth.parse(p.payMonth()));
                return new Object[]{s, payslips.toText(s)};
            }, r -> {
                shown = (Payslip) r[0];
                view.setText((String) r[1]);
                view.setCaretPosition(0);
            });
        }

        private void download() {
            if (shown == null) {
                Ui.info(this, "Select a payslip first");
                return;
            }
            JFileChooser fc = new JFileChooser();
            fc.setSelectedFile(new File("payslip-" + shown.payroll().payMonth() + ".pdf"));
            if (fc.showSaveDialog(this) == JFileChooser.APPROVE_OPTION) {
                Payslip s = shown;
                File f = fc.getSelectedFile();
                Ui.async(this, () -> payslips.generatePdf(s, f.toPath()), () -> Ui.info(this, "Saved " + f.getName()));
            }
        }
    }

}
