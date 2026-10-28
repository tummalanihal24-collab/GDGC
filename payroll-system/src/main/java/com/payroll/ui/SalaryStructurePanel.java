package com.payroll.ui;

import com.payroll.model.SalaryStructure;
import com.payroll.service.EmployeeService;
import com.payroll.util.Money;

import javax.swing.JComponent;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.ArrayList;
import java.util.List;

/** HRA / DA / PF / tax percentages per employee. */
class SalaryStructurePanel extends JPanel implements Refreshable {
    private final EmployeeService service = new EmployeeService();
    private final DefaultTableModel model = Ui.model("Emp ID", "Employee", "HRA %", "DA %", "PF %", "Tax %");
    private final JTable table = Ui.table(model);
    private List<SalaryStructure> current = new ArrayList<>();

    SalaryStructurePanel() {
        super(new BorderLayout());
        add(new JScrollPane(table), BorderLayout.CENTER);
        add(Ui.flow(Ui.button("Edit Selected", this::editSelected),
                Ui.button("Reset Selected to Defaults", this::resetSelected)), BorderLayout.SOUTH);
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
        Ui.async(this, service::listSalaryStructures, list -> {
            current = list;
            model.setRowCount(0);
            for (SalaryStructure s : list) {
                model.addRow(new Object[]{s.empId(), s.empName(), s.hraPercent(), s.daPercent(), s.pfPercent(), s.taxPercent()});
            }
        });
    }

    private SalaryStructure selected() {
        int[] rows = Ui.selectedRows(table);
        if (rows.length == 0) {
            Ui.info(this, "Select an employee first");
            return null;
        }
        return current.get(rows[0]);
    }

    private void editSelected() {
        SalaryStructure s = selected();
        if (s == null) {
            return;
        }
        JTextField hra = new JTextField(s.hraPercent().toPlainString(), 8);
        JTextField da = new JTextField(s.daPercent().toPlainString());
        JTextField pf = new JTextField(s.pfPercent().toPlainString());
        JTextField tax = new JTextField(s.taxPercent().toPlainString());
        while (Ui.form(this, "Salary structure - " + s.empName(),
                new String[]{"HRA % of basic", "DA % of basic", "PF % of basic", "Tax % of gross"},
                new JComponent[]{hra, da, pf, tax})) {
            try {
                service.saveSalaryStructure(new SalaryStructure(s.structId(), s.empId(), s.empName(),
                        Money.parse(hra.getText(), "HRA %"), Money.parse(da.getText(), "DA %"),
                        Money.parse(pf.getText(), "PF %"), Money.parse(tax.getText(), "Tax %")));
                refresh();
                return;
            } catch (RuntimeException e) {
                Ui.showError(this, e);
            }
        }
    }

    private void resetSelected() {
        int[] rows = Ui.selectedRows(table);
        if (rows.length == 0) {
            Ui.info(this, "Select one or more employees first");
            return;
        }
        List<SalaryStructure> targets = new ArrayList<>();
        for (int r : rows) {
            targets.add(current.get(r));
        }
        if (Ui.confirm(this, "Reset " + targets.size() + " employee(s) to the default structure (20 / 10 / 12 / 5)?")) {
            Ui.async(this, () -> targets.forEach(t ->
                    service.saveSalaryStructure(SalaryStructure.defaults(t.empId(), t.empName()))), this::refresh);
        }
    }

}
