package com.payroll.ui;

import com.payroll.model.Payroll;
import com.payroll.model.PayrollStatus;
import com.payroll.service.PayrollService;
import com.payroll.util.Money;
import com.payroll.util.Validators;

import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiConsumer;

/** Run payroll for a month and move each record through verify, pay, cancel, recalculate, reprocess. */
class PayrollPanel extends JPanel implements Refreshable {
    private final PayrollService service = new PayrollService();
    private final String adminName;
    private final DefaultTableModel model = Ui.model("ID", "Employee", "Month", "Working", "Absent", "Basic", "HRA",
            "DA", "Gross", "PF", "Tax", "Deductions", "Net", "Status", "Mode");
    private final JTable table = Ui.table(model);
    private final JTextField monthField = new JTextField(YearMonth.now().minusMonths(1).toString(), 8);
    private final JLabel summary = new JLabel(" ");
    private final JProgressBar progress = new JProgressBar();
    private final JButton runButton = new JButton("Run Payroll");
    private List<Payroll> current = new ArrayList<>();

    PayrollPanel(String adminName) {
        super(new BorderLayout());
        this.adminName = adminName;
        progress.setIndeterminate(true);
        progress.setVisible(false);
        monthField.addActionListener(e -> refresh());
        runButton.addActionListener(e -> run());

        JPanel top = new JPanel(new BorderLayout());
        top.add(Ui.flow(new JLabel("Month (yyyy-MM):"), monthField, Ui.button("Load", this::refresh), runButton, progress),
                BorderLayout.NORTH);
        top.add(summary, BorderLayout.SOUTH);
        summary.setBorder(javax.swing.BorderFactory.createEmptyBorder(0, 10, 6, 10));
        add(top, BorderLayout.NORTH);
        table.getColumnModel().getColumn(0).setMaxWidth(50);
        table.getColumnModel().getColumn(1).setPreferredWidth(150);
        add(new JScrollPane(table), BorderLayout.CENTER);
        add(Ui.flow(Ui.button("Recalculate", () -> act("recalculate", service::recalculate)),
                Ui.button("Verify", () -> act("verify", service::verify)),
                Ui.button("Mark Paid", () -> act("mark as paid", service::markPaid)),
                Ui.button("Cancel", () -> act("cancel", service::cancel)),
                Ui.button("Reprocess", () -> act("reprocess", service::reprocess)),
                Ui.button("Verify ALL generated", this::verifyAll)), BorderLayout.SOUTH);
    }

    private YearMonth month() {
        return Validators.month(monthField.getText());
    }

    @Override
    public void refresh() {
        YearMonth m;
        try {
            m = month();
        } catch (RuntimeException e) {
            Ui.showError(this, e);
            return;
        }
        Ui.async(this, () -> new Object[]{service.getPayrolls(m), service.getSummary(m)}, r -> {
            @SuppressWarnings("unchecked") List<Payroll> list = (List<Payroll>) r[0];
            PayrollService.Summary s = (PayrollService.Summary) r[1];
            current = list;
            model.setRowCount(0);
            for (Payroll p : list) {
                model.addRow(new Object[]{p.payrollId(), p.empName(), p.payMonth(), p.workingDays(), p.absentDays(),
                        Money.fmt(p.basic()), Money.fmt(p.hra()), Money.fmt(p.da()), Money.fmt(p.grossSalary()),
                        Money.fmt(p.pf()), Money.fmt(p.tax()), Money.fmt(p.deductions()), Money.fmt(p.netSalary()),
                        p.status(), p.mode()});
            }
            summary.setText(String.format("%s: %d payroll(s) | Gross %s | Deductions %s | Net %s  (cancelled records excluded)",
                    m, s.headcount(), Money.fmt(s.gross()), Money.fmt(s.deductions()), Money.fmt(s.net())));
        });
    }

    private void run() {
        YearMonth m;
        try {
            m = month();
        } catch (RuntimeException e) {
            Ui.showError(this, e);
            return;
        }
        if (!Ui.confirm(this, "Run payroll for " + m + "?\nEmployees who already have a payroll for this month are skipped.")) {
            return;
        }
        runButton.setEnabled(false);
        progress.setVisible(true);
        Ui.async(this, () -> service.runPayroll(m, PayrollService.MANUAL, adminName), r -> {
            StringBuilder msg = new StringBuilder(String.format("Payroll %s complete.%nCreated: %d%nSkipped (already done / not yet joined): %d%nTotal net: %s",
                    r.month(), r.created(), r.skipped(), Money.fmt(r.totalNet())));
            if (!r.problems().isEmpty()) {
                msg.append("\n\nNot processed:\n - ").append(String.join("\n - ", r.problems()));
            }
            Ui.info(this, msg.toString());
            refresh();
        }, () -> {
            runButton.setEnabled(true);
            progress.setVisible(false);
        });
    }

    private void act(String verb, BiConsumer<Integer, String> action) {
        int[] rows = Ui.selectedRows(table);
        if (rows.length == 0) {
            Ui.info(this, "Select one or more payroll rows first");
            return;
        }
        List<Payroll> targets = new ArrayList<>();
        for (int r : rows) {
            targets.add(current.get(r));
        }
        if (!Ui.confirm(this, "Do you want to " + verb + " " + targets.size() + " selected payroll record(s)?")) {
            return;
        }
        Ui.async(this, () -> {
            List<String> failures = new ArrayList<>();
            for (Payroll p : targets) {
                try {
                    action.accept(p.payrollId(), adminName);
                } catch (RuntimeException e) {
                    failures.add(p.empName() + ": " + e.getMessage());
                }
            }
            return failures;
        }, failures -> {
            if (!failures.isEmpty()) {
                Ui.info(this, "Some records were not changed:\n - " + String.join("\n - ", failures));
            }
            refresh();
        });
    }

    private void verifyAll() {
        List<Payroll> generated = current.stream().filter(p -> p.status() == PayrollStatus.GENERATED).toList();
        if (generated.isEmpty()) {
            Ui.info(this, "No GENERATED payrolls in this view");
            return;
        }
        if (Ui.confirm(this, "Verify all " + generated.size() + " generated payroll(s)? Verified payslips become visible to employees.")) {
            Ui.async(this, () -> generated.forEach(p -> service.verify(p.payrollId(), adminName)), this::refresh);
        }
    }
}
