package com.payroll.ui;

import com.payroll.model.TableData;
import com.payroll.service.ReportService;
import com.payroll.util.CsvExporter;
import com.payroll.util.Money;
import com.payroll.util.Validators;

import javax.swing.JComboBox;
import javax.swing.JFileChooser;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSplitPane;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.Map;

/** Payroll / attendance / employee reports with CSV export, plus the department salary chart. */
class ReportsPanel extends JPanel implements Refreshable {
    private static final String PAYROLL = "Payroll report";
    private static final String ATTENDANCE = "Attendance report";
    private static final String EMPLOYEE = "Employee report";

    private final ReportService service = new ReportService();
    private final JComboBox<String> type = new JComboBox<>(new String[]{PAYROLL, ATTENDANCE, EMPLOYEE});
    private final JTextField monthField = new JTextField(YearMonth.now().minusMonths(1).toString(), 8);
    private final JTable table = new JTable();
    private final BarChart chart = new BarChart();
    private TableData shown;

    ReportsPanel() {
        super(new BorderLayout());
        table.setRowHeight(26);
        table.setAutoCreateRowSorter(true);
        table.setFillsViewportHeight(true);
        add(Ui.flow(new JLabel("Report:"), type, new JLabel("Month (yyyy-MM):"), monthField,
                Ui.button("Generate", this::refresh), Ui.button("Export CSV", this::export)), BorderLayout.NORTH);
        JSplitPane split = new JSplitPane(JSplitPane.VERTICAL_SPLIT, new JScrollPane(table), chart);
        split.setResizeWeight(0.65);
        add(split, BorderLayout.CENTER);
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
        String kind = (String) type.getSelectedItem();
        Ui.async(this, () -> {
            TableData data = switch (kind) {
                case ATTENDANCE -> service.attendanceReport(m);
                case EMPLOYEE -> service.employeeReport(null, false);
                default -> service.payrollReport(m);
            };
            return new Object[]{data, service.netSalaryByDepartment(m)};
        }, r -> {
            shown = (TableData) r[0];
            DefaultTableModel model = Ui.model(shown.columns().toArray(new String[0]));
            for (Object[] row : shown.rows()) {
                Object[] cells = row.clone();
                for (int i = 0; i < cells.length; i++) {
                    if (cells[i] instanceof BigDecimal b) {
                        cells[i] = Money.fmt(b);
                    }
                }
                model.addRow(cells);
            }
            table.setModel(model);
            @SuppressWarnings("unchecked") Map<String, BigDecimal> byDept = (Map<String, BigDecimal>) r[1];
            chart.setData("Net salary by department - " + m, byDept);
        });
    }

    private void export() {
        if (shown == null) {
            Ui.info(this, "Generate a report first");
            return;
        }
        JFileChooser fc = new JFileChooser();
        fc.setSelectedFile(new File(((String) type.getSelectedItem()).toLowerCase().replace(' ', '-') + "-"
                + monthField.getText().trim() + ".csv"));
        if (fc.showSaveDialog(this) == JFileChooser.APPROVE_OPTION) {
            try {
                CsvExporter.write(fc.getSelectedFile().toPath(), shown);
                Ui.info(this, "Saved " + fc.getSelectedFile().getName());
            } catch (IOException e) {
                Ui.showError(this, e);
            }
        }
    }
}
