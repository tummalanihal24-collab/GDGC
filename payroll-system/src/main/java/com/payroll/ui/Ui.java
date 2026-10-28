package com.payroll.ui;

import com.payroll.db.DataAccessException;
import com.payroll.service.ServiceException;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JTable;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.table.DefaultTableModel;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.FlowLayout;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.awt.Window;
import java.util.concurrent.ExecutionException;
import java.util.function.Consumer;
import java.util.function.Supplier;

/** Shared Swing helpers so panels stay short. */
public final class Ui {
    private Ui() {
    }

    public static DefaultTableModel model(String... columns) {
        return new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };
    }

    public static JTable table(DefaultTableModel model) {
        JTable t = new JTable(model);
        t.setAutoCreateRowSorter(true);
        t.setRowHeight(26);
        t.setFillsViewportHeight(true);
        t.getTableHeader().setReorderingAllowed(false);
        return t;
    }

    public static JButton button(String text, Runnable action) {
        JButton b = new JButton(text);
        b.addActionListener(e -> action.run());
        return b;
    }

    public static JPanel flow(Component... parts) {
        JPanel p = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 6));
        for (Component c : parts) {
            p.add(c);
        }
        return p;
    }

    /** Selected rows converted to model indexes (the table may be sorted). */
    public static int[] selectedRows(JTable t) {
        int[] rows = t.getSelectedRows();
        for (int i = 0; i < rows.length; i++) {
            rows[i] = t.convertRowIndexToModel(rows[i]);
        }
        return rows;
    }

    public static void info(Component parent, String message) {
        JOptionPane.showMessageDialog(parent, message, "Payroll", JOptionPane.INFORMATION_MESSAGE);
    }

    public static boolean confirm(Component parent, String message) {
        return JOptionPane.showConfirmDialog(parent, message, "Please confirm", JOptionPane.YES_NO_OPTION,
                JOptionPane.QUESTION_MESSAGE) == JOptionPane.YES_OPTION;
    }

    public static void showError(Component parent, Throwable t) {
        String msg;
        if (t instanceof ServiceException) {
            msg = t.getMessage();
        } else if (t instanceof DataAccessException) {
            t.printStackTrace();
            msg = "Database problem: " + t.getMessage();
        } else {
            t.printStackTrace();
            msg = "Unexpected error: " + t.getMessage();
        }
        JOptionPane.showMessageDialog(parent, msg, "Payroll", JOptionPane.ERROR_MESSAGE);
    }

    /** Runs {@code work} off the Swing thread, then {@code done} (or the error dialog) back on it. */
    public static <T> void async(Component owner, Supplier<T> work, Consumer<T> done) {
        async(owner, work, done, () -> { });
    }

    /** Same, plus {@code always} which runs after success or failure (e.g. to re-enable a button). */
    public static <T> void async(Component owner, Supplier<T> work, Consumer<T> done, Runnable always) {
        Window w = owner == null ? null : SwingUtilities.getWindowAncestor(owner);
        if (w != null) {
            w.setCursor(Cursor.getPredefinedCursor(Cursor.WAIT_CURSOR));
        }
        new SwingWorker<T, Void>() {
            @Override
            protected T doInBackground() {
                return work.get();
            }

            @Override
            protected void done() {
                if (w != null) {
                    w.setCursor(Cursor.getDefaultCursor());
                }
                try {
                    done.accept(get());
                } catch (ExecutionException e) {
                    showError(owner, e.getCause());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (RuntimeException e) {
                    showError(owner, e);
                } finally {
                    always.run();
                }
            }
        }.execute();
    }

    public static void async(Component owner, Runnable work, Runnable done) {
        async(owner, () -> {
            work.run();
            return null;
        }, r -> done.run());
    }

    /** Shows a label/field form in a modal OK/Cancel dialog. Returns true when OK was pressed. */
    public static boolean form(Component parent, String title, String[] labels, JComponent[] fields) {
        JPanel p = new JPanel(new GridBagLayout());
        p.setBorder(BorderFactory.createEmptyBorder(4, 4, 4, 4));
        GridBagConstraints c = new GridBagConstraints();
        c.insets = new Insets(4, 4, 4, 4);
        c.anchor = GridBagConstraints.WEST;
        for (int i = 0; i < labels.length; i++) {
            c.gridx = 0;
            c.gridy = i;
            c.weightx = 0;
            c.fill = GridBagConstraints.NONE;
            p.add(new JLabel(labels[i]), c);
            c.gridx = 1;
            c.weightx = 1;
            c.fill = GridBagConstraints.HORIZONTAL;
            p.add(fields[i], c);
        }
        return JOptionPane.showConfirmDialog(parent, p, title, JOptionPane.OK_CANCEL_OPTION,
                JOptionPane.PLAIN_MESSAGE) == JOptionPane.OK_OPTION;
    }
}
