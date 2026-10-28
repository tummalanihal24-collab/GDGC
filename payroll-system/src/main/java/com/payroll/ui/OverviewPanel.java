package com.payroll.ui;

import com.payroll.model.Payroll;
import com.payroll.model.PayrollStatus;
import com.payroll.service.DepartmentService;
import com.payroll.service.EmployeeService;
import com.payroll.service.PayrollService;
import com.payroll.util.Money;

import javax.swing.BorderFactory;
import javax.swing.JLabel;
import javax.swing.JPanel;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Font;
import java.awt.GridLayout;
import java.time.YearMonth;
import java.util.List;

/** Landing tab: headline numbers for the last closed month. */
class OverviewPanel extends JPanel implements Refreshable {
    private final EmployeeService employees = new EmployeeService();
    private final DepartmentService departments = new DepartmentService();
    private final PayrollService payroll = new PayrollService();
    private final JLabel employeesValue = value();
    private final JLabel departmentsValue = value();
    private final JLabel netValue = value();
    private final JLabel pendingValue = value();
    private final JLabel monthLabel = new JLabel(" ");

    OverviewPanel() {
        super(new BorderLayout());
        setBorder(BorderFactory.createEmptyBorder(16, 16, 16, 16));
        monthLabel.setFont(monthLabel.getFont().deriveFont(Font.BOLD, 15f));
        add(monthLabel, BorderLayout.NORTH);
        JPanel cards = new JPanel(new GridLayout(2, 2, 16, 16));
        cards.setBorder(BorderFactory.createEmptyBorder(16, 0, 0, 0));
        cards.add(card("Active employees", employeesValue));
        cards.add(card("Departments", departmentsValue));
        cards.add(card("Net payroll (last month)", netValue));
        cards.add(card("Awaiting verification", pendingValue));
        add(cards, BorderLayout.CENTER);
    }

    private static JLabel value() {
        JLabel l = new JLabel("-");
        l.setFont(l.getFont().deriveFont(Font.BOLD, 28f));
        return l;
    }

    private static JPanel card(String title, JLabel value) {
        JPanel p = new JPanel(new BorderLayout());
        p.setBorder(BorderFactory.createCompoundBorder(BorderFactory.createLineBorder(new Color(0xCCCCCC)),
                BorderFactory.createEmptyBorder(16, 20, 16, 20)));
        JLabel t = new JLabel(title);
        t.setForeground(Color.GRAY);
        p.add(t, BorderLayout.NORTH);
        p.add(value, BorderLayout.CENTER);
        return p;
    }

    @Override
    public void refresh() {
        YearMonth last = YearMonth.now().minusMonths(1);
        Ui.async(this, () -> {
            List<Payroll> payrolls = payroll.getPayrolls(last);
            long pending = payrolls.stream().filter(p -> p.status() == PayrollStatus.GENERATED).count();
            return new Object[]{employees.search(null, false, null).size(), departments.getAll().size(),
                    payroll.getSummary(last), pending};
        }, r -> {
            employeesValue.setText(String.valueOf(r[0]));
            departmentsValue.setText(String.valueOf(r[1]));
            netValue.setText(Money.fmt(((PayrollService.Summary) r[2]).net()));
            pendingValue.setText(String.valueOf(r[3]));
            monthLabel.setText("Overview - payroll month " + last);
        });
    }
}
