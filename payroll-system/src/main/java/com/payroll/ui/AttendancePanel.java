package com.payroll.ui;

import com.payroll.model.Attendance;
import com.payroll.service.AttendanceService;
import com.payroll.util.Validators;

import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Mark attendance one day at a time. Unmarked days are treated as present when payroll runs. */
class AttendancePanel extends JPanel implements Refreshable {
    private final AttendanceService service = new AttendanceService();
    private final DefaultTableModel model = Ui.model("Emp ID", "Employee", "Department", "Status");
    private final JTable table = Ui.table(model);
    private final JTextField dateField = new JTextField(LocalDate.now().toString(), 10);

    AttendancePanel() {
        super(new BorderLayout());
        dateField.addActionListener(e -> refresh());
        add(Ui.flow(new JLabel("Date (yyyy-MM-dd):"), dateField,
                Ui.button("<", () -> shift(-1)), Ui.button("Today", () -> {
                    dateField.setText(LocalDate.now().toString());
                    refresh();
                }), Ui.button(">", () -> shift(1)), Ui.button("Load", this::refresh)), BorderLayout.NORTH);
        add(new JScrollPane(table), BorderLayout.CENTER);
        add(Ui.flow(new JLabel("Set selected as:"),
                Ui.button("Present", () -> mark(Attendance.PRESENT)),
                Ui.button("Absent", () -> mark(Attendance.ABSENT)),
                Ui.button("Leave", () -> mark(Attendance.LEAVE)),
                Ui.button("Mark ALL present", this::markAll)), BorderLayout.SOUTH);
    }

    private LocalDate date() {
        return Validators.date(dateField.getText(), "Date");
    }

    private void shift(int days) {
        try {
            dateField.setText(date().plusDays(days).toString());
            refresh();
        } catch (RuntimeException e) {
            Ui.showError(this, e);
        }
    }

    @Override
    public void refresh() {
        LocalDate d;
        try {
            d = date();
        } catch (RuntimeException e) {
            Ui.showError(this, e);
            return;
        }
        Ui.async(this, () -> service.dayView(d), rows -> {
            model.setRowCount(0);
            for (Object[] r : rows) {
                model.addRow(new Object[]{r[0], r[1], r[2] == null ? "" : r[2], r[3] == null ? "- not marked -" : r[3]});
            }
        });
    }

    private void mark(String status) {
        int[] rows = Ui.selectedRows(table);
        if (rows.length == 0) {
            Ui.info(this, "Select one or more employees first");
            return;
        }
        List<Integer> ids = new ArrayList<>();
        for (int r : rows) {
            ids.add((Integer) model.getValueAt(r, 0));
        }
        LocalDate d;
        try {
            d = date();
        } catch (RuntimeException e) {
            Ui.showError(this, e);
            return;
        }
        Ui.async(this, () -> ids.forEach(id -> service.markAttendance(id, d, status)), this::refresh);
    }

    private void markAll() {
        LocalDate d;
        try {
            d = date();
        } catch (RuntimeException e) {
            Ui.showError(this, e);
            return;
        }
        if (Ui.confirm(this, "Mark every active employee PRESENT on " + d + "? Existing records for that day are overwritten.")) {
            Ui.async(this, () -> service.markAllPresent(d), this::refresh);
        }
    }
}
