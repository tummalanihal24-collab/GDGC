package com.payroll.ui;

import com.payroll.util.Money;

import javax.swing.JPanel;
import javax.swing.UIManager;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.FontMetrics;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/** Minimal vertical bar chart for "net salary by department". */
class BarChart extends JPanel {
    private Map<String, BigDecimal> data = new LinkedHashMap<>();
    private String title = "";

    BarChart() {
        setPreferredSize(new Dimension(400, 220));
    }

    void setData(String title, Map<String, BigDecimal> data) {
        this.title = title;
        this.data = data;
        repaint();
    }

    @Override
    protected void paintComponent(Graphics g0) {
        super.paintComponent(g0);
        Graphics2D g = (Graphics2D) g0.create();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        Color fg = UIManager.getColor("Label.foreground");
        Color bar = UIManager.getColor("Component.accentColor");
        g.setColor(fg == null ? Color.DARK_GRAY : fg);
        FontMetrics fm = g.getFontMetrics();
        g.drawString(title, 12, fm.getAscent() + 6);

        if (data.isEmpty()) {
            g.drawString("No payroll data for this month", 12, getHeight() / 2);
            g.dispose();
            return;
        }
        BigDecimal max = data.values().stream().max(BigDecimal::compareTo).orElse(BigDecimal.ONE);
        if (max.signum() == 0) {
            max = BigDecimal.ONE;
        }
        int left = 12;
        int top = fm.getHeight() + 28;
        int bottom = getHeight() - fm.getHeight() - 10;
        int chartH = Math.max(20, bottom - top);
        int slot = Math.max(40, (getWidth() - 2 * left) / data.size());
        int barW = Math.min(80, slot - 16);
        int i = 0;
        for (Map.Entry<String, BigDecimal> e : data.entrySet()) {
            int h = (int) (chartH * e.getValue().doubleValue() / max.doubleValue());
            int x = left + i * slot + (slot - barW) / 2;
            g.setColor(bar == null ? new Color(0x2D7FF9) : bar);
            g.fillRoundRect(x, bottom - h, barW, h, 6, 6);
            g.setColor(fg == null ? Color.DARK_GRAY : fg);
            String value = Money.fmt(e.getValue());
            g.drawString(value, x + (barW - fm.stringWidth(value)) / 2, bottom - h - 4);
            String label = e.getKey();
            while (fm.stringWidth(label) > slot - 4 && label.length() > 3) {
                label = label.substring(0, label.length() - 2);
            }
            g.drawString(label, left + i * slot + (slot - fm.stringWidth(label)) / 2, bottom + fm.getAscent() + 3);
            i++;
        }
        g.dispose();
    }
}
