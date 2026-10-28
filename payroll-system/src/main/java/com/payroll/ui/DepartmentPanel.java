package com.payroll.ui;

import com.payroll.model.Department;
import com.payroll.service.DepartmentService;

import javax.swing.JComponent;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.util.ArrayList;
import java.util.List;

class DepartmentPanel extends JPanel implements Refreshable {
    private final DepartmentService service = new DepartmentService();
    private final DefaultTableModel model = Ui.model("ID", "Department", "Location", "Employees");
    private final JTable table = Ui.table(model);
    private List<Department> current = new ArrayList<>();

    DepartmentPanel() {
        super(new BorderLayout());
        add(new JScrollPane(table), BorderLayout.CENTER);
        add(Ui.flow(Ui.button("Add", () -> edit(null)), Ui.button("Edit", this::editSelected),
                Ui.button("Delete", this::deleteSelected)), BorderLayout.SOUTH);
    }

    @Override
    public void refresh() {
        Ui.async(this, () -> {
            List<Department> list = service.getAll();
            List<Object[]> rows = new ArrayList<>();
            for (Department d : list) {
                rows.add(new Object[]{d.deptId(), d.deptName(), d.location(), service.employeeCount(d.deptId())});
            }
            current = list;
            return rows;
        }, rows -> {
            model.setRowCount(0);
            rows.forEach(model::addRow);
        });
    }

    private Department selected() {
        int[] rows = Ui.selectedRows(table);
        if (rows.length == 0) {
            Ui.info(this, "Select a department first");
            return null;
        }
        return current.get(rows[0]);
    }

    private void editSelected() {
        Department d = selected();
        if (d != null) {
            edit(d);
        }
    }

    private void edit(Department existing) {
        JTextField name = new JTextField(existing == null ? "" : existing.deptName(), 18);
        JTextField location = new JTextField(existing == null ? "" : existing.location());
        while (Ui.form(this, existing == null ? "Add department" : "Edit department",
                new String[]{"Name", "Location"}, new JComponent[]{name, location})) {
            try {
                if (existing == null) {
                    service.add(name.getText(), location.getText());
                } else {
                    service.update(existing.deptId(), name.getText(), location.getText());
                }
                refresh();
                return;
            } catch (RuntimeException e) {
                Ui.showError(this, e);
            }
        }
    }

    private void deleteSelected() {
        Department d = selected();
        if (d != null && Ui.confirm(this, "Delete department '" + d.deptName() + "'?")) {
            Ui.async(this, () -> service.delete(d.deptId()), this::refresh);
        }
    }
}
