package edu.kvell.results.common;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public final class Semesters {

    private static final String[] ROMAN = {"I", "II", "III", "IV", "V", "VI", "VII", "VIII"};
    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DISPLAY = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private Semesters() {
    }

    /** 2 -> "Semester II". */
    public static String label(int semester) {
        return "Semester " + ROMAN[semester - 1];
    }

    /** "Semester I", "I", "1" or "Sem 1" -> 1. */
    public static int parse(String value) {
        if (value == null) throw ApiException.badRequest("Semester is required");
        String v = value.trim().toUpperCase(java.util.Locale.ROOT).replaceFirst("^(SEMESTER|SEM)\\s*", "");
        for (int i = 0; i < ROMAN.length; i++) {
            if (ROMAN[i].equals(v) || String.valueOf(i + 1).equals(v)) return i + 1;
        }
        throw ApiException.badRequest("Unknown semester: " + value);
    }

    /** Timestamp shown in the UI, in college local time. */
    public static String display(OffsetDateTime time) {
        return time == null ? null : time.atZoneSameInstant(IST).format(DISPLAY);
    }
}
