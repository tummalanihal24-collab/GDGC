package com.payroll.ui;

import com.formdev.flatlaf.FlatLightLaf;
import com.payroll.db.DBConnection;
import com.payroll.db.DatabaseInitializer;
import com.payroll.service.PayrollScheduler;
import com.payroll.service.PayrollService;

import javax.swing.JOptionPane;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;

public class PayrollApp {
    private static PayrollScheduler scheduler;

    public static void main(String[] args) {
        FlatLightLaf.setup();
        SwingUtilities.invokeLater(PayrollApp::launchLogin);
    }

    /** Connects to the database (creating tables/demo data on first run), then shows the login window. */
    static void launchLogin() {
        new SwingWorker<Void, Void>() {
            @Override
            protected Void doInBackground() {
                DBConnection.init();
                DatabaseInitializer.run();
                return null;
            }

            @Override
            protected void done() {
                try {
                    get();
                } catch (Exception e) {
                    Throwable cause = e.getCause() != null ? e.getCause() : e;
                    JOptionPane.showMessageDialog(null,
                            "Could not connect to the database:\n" + cause.getMessage()
                                    + "\n\nCheck config/db.properties (see README) and that MySQL is running.",
                            "Payroll - startup error", JOptionPane.ERROR_MESSAGE);
                    System.exit(1);
                    return;
                }
                scheduler = new PayrollScheduler(new PayrollService(),
                        r -> System.out.println("Scheduled payroll " + r.month() + ": " + r.created() + " created"));
                scheduler.start();
                Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                    scheduler.stop();
                    DBConnection.close();
                }));
                new LoginFrame().setVisible(true);
            }
        }.execute();
    }
}
