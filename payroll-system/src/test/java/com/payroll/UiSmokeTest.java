package com.payroll;

import com.payroll.db.DBConnection;
import com.payroll.db.DatabaseInitializer;
import com.payroll.model.Attendance;
import com.payroll.model.Employee;
import com.payroll.model.Payroll;
import com.payroll.model.Person;
import com.payroll.service.AttendanceService;
import com.payroll.service.AuthService;
import com.payroll.service.EmployeeService;
import com.payroll.service.PayrollService;
import com.payroll.ui.AdminDashboard;
import com.payroll.ui.EmployeePortal;
import com.payroll.ui.LoginFrame;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import javax.swing.JFrame;
import javax.swing.JTabbedPane;
import javax.swing.SwingUtilities;
import java.awt.Component;
import java.awt.Container;
import java.awt.GraphicsEnvironment;
import java.awt.image.BufferedImage;
import java.io.File;
import java.time.YearMonth;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Builds every window against an in-memory database and saves a screenshot of each tab to
 * target/screenshots. Needs a display (run under xvfb-run); skipped on headless machines.
 */
class UiSmokeTest {
    @Test
    void everyScreenOpensAndRenders() throws Exception {
        Assumptions.assumeFalse(GraphicsEnvironment.isHeadless(), "needs a display");
        com.formdev.flatlaf.FlatLightLaf.setup();
        DBConnection.configure("jdbc:h2:mem:ui_smoke;MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        DatabaseInitializer.run();

        YearMonth month = YearMonth.now().minusMonths(1);
        AttendanceService attendance = new AttendanceService();
        Employee asha = new EmployeeService().search(null, false, "asha").get(0);
        attendance.markAttendance(asha.getId(), month.atDay(3), Attendance.ABSENT);
        attendance.markAllPresent(YearMonth.now().atDay(1));
        PayrollService payroll = new PayrollService();
        payroll.runPayroll(month, PayrollService.MANUAL, "admin");
        for (Payroll p : payroll.getPayrolls(month)) {
            payroll.verify(p.payrollId(), "admin");
        }
        payroll.markPaid(payroll.getPayrolls(month).get(0).payrollId(), "admin");

        File out = new File("target/screenshots");
        out.mkdirs();

        LoginFrame login = onEdt(LoginFrame::new);
        show(login);
        shot(login, new File(out, "01-login.png"));

        Person admin = new AuthService().login("admin", "admin123");
        AdminDashboard dash = onEdt(() -> new AdminDashboard(admin, login));
        show(dash);
        JTabbedPane tabs = find(dash, JTabbedPane.class);
        for (int i = 0; i < tabs.getTabCount(); i++) {
            int idx = i;
            SwingUtilities.invokeAndWait(() -> tabs.setSelectedIndex(idx));
            Thread.sleep(1200);
            shot(dash, new File(out, String.format("02-admin-%d-%s.png", i, tabs.getTitleAt(i).toLowerCase().replace(' ', '-'))));
        }
        dispose(dash);

        Person emp = new AuthService().login("asha", "emp123");
        EmployeePortal portal = onEdt(() -> new EmployeePortal(emp, login));
        show(portal);
        JTabbedPane etabs = find(portal, JTabbedPane.class);
        for (int i = 0; i < etabs.getTabCount(); i++) {
            int idx = i;
            SwingUtilities.invokeAndWait(() -> etabs.setSelectedIndex(idx));
            Thread.sleep(1500);
            shot(portal, new File(out, String.format("03-employee-%d.png", i)));
        }
        dispose(portal);
        dispose(login);
        assertTrue(out.listFiles().length >= 12);
    }

    private static <T> T onEdt(java.util.concurrent.Callable<T> c) throws Exception {
        Object[] box = new Object[1];
        SwingUtilities.invokeAndWait(() -> {
            try {
                box[0] = c.call();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        @SuppressWarnings("unchecked") T t = (T) box[0];
        return t;
    }

    private static void show(JFrame f) throws Exception {
        SwingUtilities.invokeAndWait(() -> f.setVisible(true));
        Thread.sleep(800);
    }

    private static void dispose(JFrame f) throws Exception {
        SwingUtilities.invokeAndWait(f::dispose);
    }

    private static void shot(JFrame f, File file) throws Exception {
        SwingUtilities.invokeAndWait(() -> {
            try {
                BufferedImage img = new BufferedImage(f.getWidth(), f.getHeight(), BufferedImage.TYPE_INT_RGB);
                f.paint(img.getGraphics());
                ImageIO.write(img, "png", file);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
    }

    private static <T extends Component> T find(Container root, Class<T> type) {
        for (Component c : root.getComponents()) {
            if (type.isInstance(c)) {
                return type.cast(c);
            }
            if (c instanceof Container k) {
                T t = find(k, type);
                if (t != null) {
                    return t;
                }
            }
        }
        return null;
    }
}
