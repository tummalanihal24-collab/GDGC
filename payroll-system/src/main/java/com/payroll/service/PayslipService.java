package com.payroll.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.payroll.dao.EmployeeDAO;
import com.payroll.dao.PayrollDAO;
import com.payroll.model.Employee;
import com.payroll.model.Payroll;
import com.payroll.model.PayrollStatus;
import com.payroll.model.Payslip;
import com.payroll.util.Money;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

/** Payslips are visible to the employee once the payroll is VERIFIED (or PAID). */
public class PayslipService {
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final PayrollDAO payrollDao = new PayrollDAO();
    private final EmployeeDAO employeeDao = new EmployeeDAO();

    public List<Payroll> availablePayslips(int empId) {
        return payrollDao.getByEmployee(empId).stream().filter(PayslipService::released).toList();
    }

    public Payslip getPayslip(int empId, YearMonth month) {
        Payroll p = payrollDao.findByEmployeeAndMonth(empId, month.toString());
        if (p == null || !released(p)) {
            throw new ServiceException("No payslip is available for " + month + " yet");
        }
        Employee e = employeeDao.findById(empId);
        return new Payslip(e, p);
    }

    public String toText(Payslip s) {
        Payroll p = s.payroll();
        Employee e = s.employee();
        StringBuilder sb = new StringBuilder();
        sb.append("PAYSLIP - ").append(p.payMonth()).append("\n");
        sb.append("=".repeat(44)).append("\n");
        sb.append(String.format("Employee      : %s (ID %d)%n", e.getName(), e.getId()));
        sb.append(String.format("Designation   : %s%n", nz(e.getDesignation())));
        sb.append(String.format("Department    : %s%n", nz(e.getDeptName())));
        sb.append(String.format("Working days  : %d   Absent: %d%n", p.workingDays(), p.absentDays()));
        sb.append("-".repeat(44)).append("\n");
        sb.append(line("Basic (pro-rated)", p.basic()));
        sb.append(line("HRA", p.hra()));
        sb.append(line("DA", p.da()));
        sb.append(line("Gross salary", p.grossSalary()));
        sb.append("-".repeat(44)).append("\n");
        sb.append(line("PF", p.pf()));
        sb.append(line("Tax", p.tax()));
        sb.append(line("Total deductions", p.deductions()));
        sb.append("=".repeat(44)).append("\n");
        sb.append(line("NET SALARY", p.netSalary()));
        sb.append("\nStatus: ").append(p.status()).append("\n");
        sb.append("Generated on ").append(p.generatedOn().format(STAMP)).append(" by ").append(p.generatedBy()).append("\n");
        return sb.toString();
    }

    public void generatePdf(Payslip s, Path file) {
        try (OutputStream out = Files.newOutputStream(file)) {
            writePdf(s, out);
        } catch (IOException | DocumentException e) {
            throw new ServiceException("Could not write PDF: " + e.getMessage());
        }
    }

    public byte[] pdfBytes(Payslip s) {
        try (java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            writePdf(s, out);
            return out.toByteArray();
        } catch (IOException | DocumentException e) {
            throw new ServiceException("Could not build PDF: " + e.getMessage());
        }
    }

    void writePdf(Payslip s, OutputStream out) throws DocumentException {
        Payroll p = s.payroll();
        Employee e = s.employee();
        Font title = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
        Font bold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
        Font normal = FontFactory.getFont(FontFactory.HELVETICA, 11);

        Document doc = new Document(PageSize.A4, 48, 48, 48, 48);
        PdfWriter.getInstance(doc, out);
        doc.open();
        Paragraph head = new Paragraph("Payslip - " + p.payMonth(), title);
        head.setAlignment(Element.ALIGN_CENTER);
        head.setSpacingAfter(16);
        doc.add(head);

        PdfPTable info = new PdfPTable(2);
        info.setWidthPercentage(100);
        info.setSpacingAfter(14);
        row(info, "Employee", e.getName() + " (ID " + e.getId() + ")", bold, normal, false);
        row(info, "Designation", nz(e.getDesignation()), bold, normal, false);
        row(info, "Department", nz(e.getDeptName()), bold, normal, false);
        row(info, "Pay month", p.payMonth(), bold, normal, false);
        row(info, "Working days / Absent", p.workingDays() + " / " + p.absentDays(), bold, normal, false);
        doc.add(info);

        PdfPTable pay = new PdfPTable(2);
        pay.setWidthPercentage(100);
        pay.setSpacingAfter(14);
        row(pay, "Basic (pro-rated)", Money.fmt(p.basic()), bold, normal, true);
        row(pay, "HRA", Money.fmt(p.hra()), bold, normal, true);
        row(pay, "DA", Money.fmt(p.da()), bold, normal, true);
        row(pay, "Gross salary", Money.fmt(p.grossSalary()), bold, bold, true);
        row(pay, "PF", Money.fmt(p.pf()), bold, normal, true);
        row(pay, "Tax", Money.fmt(p.tax()), bold, normal, true);
        row(pay, "Total deductions", Money.fmt(p.deductions()), bold, bold, true);
        row(pay, "NET SALARY", Money.fmt(p.netSalary()), bold, bold, true);
        doc.add(pay);

        doc.add(new Paragraph("Generated on " + p.generatedOn().format(STAMP) + " by " + p.generatedBy()
                + "   |   Status: " + p.status(), FontFactory.getFont(FontFactory.HELVETICA, 9)));
        doc.close();
    }

    private static void row(PdfPTable t, String label, String value, Font lf, Font vf, boolean boxed) {
        PdfPCell a = new PdfPCell(new Phrase(label, lf));
        PdfPCell b = new PdfPCell(new Phrase(value, vf));
        b.setHorizontalAlignment(boxed ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
        for (PdfPCell c : new PdfPCell[]{a, b}) {
            c.setPadding(6);
            if (!boxed) {
                c.setBorder(PdfPCell.NO_BORDER);
            }
            t.addCell(c);
        }
    }

    private static boolean released(Payroll p) {
        return p.status() == PayrollStatus.VERIFIED || p.status() == PayrollStatus.PAID;
    }

    private static String line(String label, java.math.BigDecimal v) {
        return String.format("%-26s %15s%n", label, Money.fmt(v));
    }

    private static String nz(String s) {
        return s == null ? "-" : s;
    }
}
