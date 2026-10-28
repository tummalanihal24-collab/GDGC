package com.payroll.ui;

import com.payroll.model.Department;
import com.payroll.model.Employee;
import com.payroll.service.DepartmentService;
import com.payroll.service.AuthService;
import com.payroll.service.EmployeeService;
import com.payroll.service.ServiceException;
import com.payroll.util.Money;
import com.payroll.util.Validators;

import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JComponent;
import javax.swing.JPanel;
import javax.swing.JPasswordField;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.ArrayList;
import java.util.List;

/** Add / edit / deactivate employees, filter by department, search. */
class EmployeePanel extends JPanel implements Refreshable {
    private static final String ALL = "All departments";

    private final EmployeeService employees = new EmployeeService();
    private final DepartmentService departments = new DepartmentService();
    private final DefaultTableModel model = Ui.model("ID", "Name", "Username", "Email", "Designation",
            "Department", "Joined", "Basic Salary", "Status");
    private final JTable table = Ui.table(model);
    private final JTextField search = new JTextField(16);
    private final JComboBox<Object> deptFilter = new JComboBox<>();
    private final JCheckBox showInactive = new JCheckBox("Show inactive");
    private List<Employee> current = new ArrayList<>();
    private boolean loadingFilter;

    EmployeePanel() {
        super(new BorderLayout());
        search.putClientProperty("JTextField.placeholderText", "Search name, username, email...");
        search.addActionListener(e -> refresh());
        deptFilter.addActionListener(e -> {
            if (!loadingFilter) {
                refresh();
            }
        });
        showInactive.addActionListener(e -> refresh());
        add(Ui.flow(search, deptFilter, showInactive, Ui.button("Search", this::refresh)), BorderLayout.NORTH);
        add(new JScrollPane(table), BorderLayout.CENTER);
        add(Ui.flow(Ui.button("Add Employee", () -> edit(null)),
                Ui.button("Edit", this::editSelected),
                Ui.button("Activate / Deactivate", this::toggleActive),
                Ui.button("Reset Password", this::resetPassword)), BorderLayout.SOUTH);
        table.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                if (e.getClickCount() == 2) {
                    editSelected();
                }
            }
        });
    }

    @Override
    public void refresh() {
        Object sel = deptFilter.getSelectedItem();
        Integer deptId = sel instanceof Department d ? d.deptId() : null;
        Ui.async(this, () -> new Object[]{departments.getAll(),
                employees.search(deptId, showInactive.isSelected(), search.getText())}, r -> {
            @SuppressWarnings("unchecked") List<Department> depts = (List<Department>) r[0];
            @SuppressWarnings("unchecked") List<Employee> list = (List<Employee>) r[1];
            loadingFilter = true;
            deptFilter.removeAllItems();
            deptFilter.addItem(ALL);
            depts.forEach(deptFilter::addItem);
            if (sel instanceof Department d) {
                depts.stream().filter(x -> x.deptId() == d.deptId()).findFirst().ifPresent(deptFilter::setSelectedItem);
            }
            loadingFilter = false;
            current = list;
            model.setRowCount(0);
            for (Employee e : list) {
                model.addRow(new Object[]{e.getId(), e.getName(), e.getUsername(), e.getEmail(), e.getDesignation(),
                        e.getDeptName() == null ? "" : e.getDeptName(), e.getJoiningDate(),
                        Money.fmt(e.getBasicSalary()), e.isActive() ? "Active" : "Inactive"});
            }
        });
    }

    private Employee selected() {
        int[] rows = Ui.selectedRows(table);
        if (rows.length == 0) {
            Ui.info(this, "Select an employee first");
            return null;
        }
        return current.get(rows[0]);
    }

    private void editSelected() {
        Employee e = selected();
        if (e != null) {
            edit(e);
        }
    }

    private void edit(Employee existing) {
        boolean adding = existing == null;
        JTextField name = new JTextField(existing == null ? "" : existing.getName(), 20);
        JTextField email = new JTextField(existing == null ? "" : existing.getEmail());
        JTextField username = new JTextField(existing == null ? "" : existing.getUsername());
        username.setEditable(adding);
        JPasswordField password = new JPasswordField();
        JTextField designation = new JTextField(existing == null ? "" : existing.getDesignation());
        JTextField joined = new JTextField(existing == null ? java.time.LocalDate.now().toString() : existing.getJoiningDate().toString());
        JTextField salary = new JTextField(existing == null ? "" : existing.getBasicSalary().toPlainString());
        JComboBox<Object> dept = new JComboBox<>();
        dept.addItem("(none)");
        List<Department> all = departments.getAll();
        all.forEach(dept::addItem);
        if (existing != null && existing.getDeptId() != null) {
            all.stream().filter(d -> d.deptId() == existing.getDeptId()).findFirst().ifPresent(dept::setSelectedItem);
        }

        List<String> labels = new ArrayList<>(List.of("Name", "Email", "Username"));
        List<JComponent> fields = new ArrayList<>(List.of(name, email, username));
        if (adding) {
            labels.add("Initial password");
            fields.add(password);
        }
        labels.addAll(List.of("Designation", "Joining date (yyyy-MM-dd)", "Basic salary", "Department"));
        fields.addAll(List.of(designation, joined, salary, dept));

        while (Ui.form(this, adding ? "Add employee" : "Edit employee", labels.toArray(new String[0]),
                fields.toArray(new JComponent[0]))) {
            try {
                Employee e = adding ? new Employee() : existing;
                e.setName(name.getText());
                e.setEmail(email.getText());
                e.setUsername(username.getText());
                e.setDesignation(designation.getText());
                e.setJoiningDate(Validators.date(joined.getText(), "Joining date"));
                e.setBasicSalary(Money.parse(salary.getText(), "Basic salary"));
                e.setDeptId(dept.getSelectedItem() instanceof Department d ? d.deptId() : null);
                if (adding) {
                    employees.addEmployee(e, new String(password.getPassword()));
                } else {
                    employees.updateEmployee(e);
                }
                refresh();
                return;
            } catch (RuntimeException ex) {
                Ui.showError(this, ex);
            }
        }
    }

    private void toggleActive() {
        Employee e = selected();
        if (e == null) {
            return;
        }
        boolean activate = !e.isActive();
        if (Ui.confirm(this, (activate ? "Reactivate " : "Deactivate ") + e.getName() + "?"
                + (activate ? "" : "\nThey will no longer be able to log in or be included in payroll runs."))) {
            Ui.async(this, () -> employees.setActive(e.getId(), activate), this::refresh);
        }
    }

    private void resetPassword() {
        Employee e = selected();
        if (e == null) {
            return;
        }
        JPasswordField pw = new JPasswordField(16);
        while (Ui.form(this, "Reset password for " + e.getUsername(), new String[]{"New password"}, new JComponent[]{pw})) {
            try {
                new AuthService().resetPassword(e.getId(), new String(pw.getPassword()));
                Ui.info(this, "Password updated");
                return;
            } catch (ServiceException ex) {
                Ui.showError(this, ex);
            }
        }
    }
}
