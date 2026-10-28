package com.payroll.util;

import com.payroll.model.TableData;

import java.io.IOException;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;

public final class CsvExporter {
    private CsvExporter() {
    }

    public static void write(Path file, TableData data) throws IOException {
        try (Writer w = Files.newBufferedWriter(file, StandardCharsets.UTF_8)) {
            w.write(line(data.columns()));
            for (Object[] row : data.rows()) {
                w.write(line(java.util.Arrays.asList(row)));
            }
        }
    }

    private static String line(List<?> cells) {
        return cells.stream().map(CsvExporter::cell).collect(Collectors.joining(",")) + "\n";
    }

    private static String cell(Object o) {
        String s = o == null ? "" : o.toString();
        // Prefix formula-looking text so spreadsheets do not execute it
        if (!s.isEmpty() && "=+-@".indexOf(s.charAt(0)) >= 0 && !s.matches("-?[0-9.,]+")) {
            s = "'" + s;
        }
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            s = "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }
}
