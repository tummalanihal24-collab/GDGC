package com.payroll.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * The "System (Scheduler)" lane of the activity diagram. While the app is running it checks hourly;
 * on the 1st of a month it runs payroll for the previous month. Runs are idempotent, so repeated
 * checks on that day (or a manual run beforehand) never create duplicates.
 */
public class PayrollScheduler {
    private final PayrollService payrollService;
    private final Consumer<PayrollService.RunSummary> onRun;
    private ScheduledExecutorService executor;

    public PayrollScheduler(PayrollService payrollService, Consumer<PayrollService.RunSummary> onRun) {
        this.payrollService = payrollService;
        this.onRun = onRun;
    }

    public synchronized void start() {
        if (executor != null) {
            return;
        }
        executor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "payroll-scheduler");
            t.setDaemon(true);
            return t;
        });
        executor.scheduleWithFixedDelay(this::checkNow, 1, 60, TimeUnit.MINUTES);
    }

    public synchronized void stop() {
        if (executor != null) {
            executor.shutdownNow();
            executor = null;
        }
    }

    /** One scheduler tick; public so it can be tested without waiting. */
    public void checkNow() {
        try {
            LocalDate today = LocalDate.now();
            if (today.getDayOfMonth() == 1) {
                PayrollService.RunSummary r = payrollService.runPayroll(
                        YearMonth.from(today).minusMonths(1), PayrollService.AUTO, "SYSTEM");
                if (onRun != null && r.created() > 0) {
                    onRun.accept(r);
                }
            }
        } catch (RuntimeException e) {
            System.err.println("Scheduled payroll failed: " + e.getMessage());
        }
    }
}
