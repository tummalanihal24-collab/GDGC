package com.payroll.ui;

import com.payroll.model.PayrollAudit;
import com.payroll.service.ReportService;
import com.payroll.util.Validators;

import javax.swing.JComboBox;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.time.format.DateTimeFormatter;

/** Read-only view of payroll_audit, newest first. */
class AuditPanel extends JPanel implements Refreshable {
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ReportService service = new ReportService();
    private final DefaultTableModel model = Ui.model("#", "When", "Employee", "Month", "Action", "By", "Details");
    private final JTable table = Ui.table(model);
    private final JTextField monthField = new JTextField(8);
    private final JComboBox<String> action = new JComboBox<>(new String[]{"All actions", "GENERATED", "RECALCULATED",
            "VERIFIED", "PAID", "CANCELLED", "REPROCESSED"});
    private final JTextField keyword = new JTextField(14);

    AuditPanel() {
        super(new BorderLayout());
        keyword.addActionListener(e -> refresh());
        monthField.addActionListener(e -> refresh());
        add(Ui.flow(new JLabel("Month (yyyy-MM, optional):"), monthField, action, new JLabel("Search:"), keyword,
                Ui.button("Apply", this::refresh)), BorderLayout.NORTH);
        add(new JScrollPane(table), BorderLayout.CENTER);
        table.getColumnModel().getColumn(0).setMaxWidth(60);
    }

    @Override
    public void refresh() {
        String month = monthField.getText().trim();
        try {
            if (!month.isEmpty()) {
                Validators.month(month);
            }
        } catch (RuntimeException e) {
            Ui.showError(this, e);
            return;
        }
        String act = action.getSelectedIndex() == 0 ? null : (String) action.getSelectedItem();
        Ui.async(this, () -> service.auditLog(month, act, keyword.getText()), rows -> {
            model.setRowCount(0);
            for (PayrollAudit a : rows) {
                model.addRow(new Object[]{a.auditId(), a.actionTime().format(STAMP), a.empName(), a.payMonth(),
                        a.action(), a.actionBy(), a.details()});
            }
        });
    }
}
