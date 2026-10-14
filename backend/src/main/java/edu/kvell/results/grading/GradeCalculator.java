package edu.kvell.results.grading;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Exam paper scoring, matching the admin panel's Mark Entry form.
 * Part A: questions 1-10, 0-2 marks each. Parts B + C: questions 11-16, each answered as choice (a) or (b),
 * and each choice has subdivisions i, ii, iii worth 0-16 marks. A question scores the better of its two choices.
 * The grand total is A + B + C, rounded and capped at 100. A total of {@link #PASS_MARK} or more passes.
 */
public final class GradeCalculator {

    public static final int PART_A_QUESTIONS = 10;
    public static final double PART_A_MAX = 2;
    public static final int FIRST_BC_QUESTION = 11;
    public static final int LAST_BC_QUESTION = 16;
    public static final double SUBDIVISION_MAX = 16;
    public static final int PASS_MARK = 40;

    public record Grade(int total, String letter, int points, boolean passed) {
    }

    /** One graded course, used for SGPA/CGPA. */
    public record CreditPoints(int credits, int gradePoints) {
    }

    private GradeCalculator() {
    }

    /** Better of choice (a) and (b), each being the sum of its subdivisions. */
    public static double questionTotal(double[] choiceA, double[] choiceB) {
        return Math.max(sum(choiceA), sum(choiceB));
    }

    public static Grade grade(double partATotal, double partBCTotal) {
        int total = (int) Math.min(100, Math.round(partATotal + partBCTotal));
        if (total >= 90) return new Grade(total, "O", 10, true);
        if (total >= 80) return new Grade(total, "A+", 9, true);
        if (total >= 70) return new Grade(total, "A", 8, true);
        if (total >= 60) return new Grade(total, "B+", 7, true);
        if (total >= 50) return new Grade(total, "B", 6, true);
        if (total >= PASS_MARK) return new Grade(total, "C", 5, true);
        return new Grade(total, "F", 0, false);
    }

    /** Credit-weighted grade point average, 2 decimals; failed courses count as 0 points. */
    public static BigDecimal gpa(List<CreditPoints> courses) {
        int credits = courses.stream().mapToInt(CreditPoints::credits).sum();
        if (credits == 0) return BigDecimal.ZERO.setScale(2);
        int weighted = courses.stream().mapToInt(c -> c.credits() * c.gradePoints()).sum();
        return BigDecimal.valueOf(weighted).divide(BigDecimal.valueOf(credits), 2, RoundingMode.HALF_UP);
    }

    /** Overall classification shown on the marksheet. */
    public static String classification(BigDecimal cgpa, boolean hasArrears) {
        if (hasArrears) return "FAIL";
        if (cgpa.compareTo(BigDecimal.valueOf(8.5)) >= 0) return "PASS - DISTINCTION";
        if (cgpa.compareTo(BigDecimal.valueOf(6.5)) >= 0) return "FIRST CLASS";
        return "PASS";
    }

    private static double sum(double[] values) {
        double total = 0;
        for (double v : values) total += v;
        return total;
    }
}
