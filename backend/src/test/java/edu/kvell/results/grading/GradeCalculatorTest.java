package edu.kvell.results.grading;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * The grading rules: every grade boundary, the pass mark, rounding and the 100 cap, the better-choice rule for
 * Parts B + C, credit-weighted GPA (arrears count as 0 points) and the marksheet classification.
 */
class GradeCalculatorTest {

    @ParameterizedTest(name = "A {0} + BC {1} -> {2} {3}")
    @CsvSource({
            "20, 80, 100, O, 10, true",
            "10, 80, 90, O, 10, true",
            "9.5, 80, 90, O, 10, true",     // 89.5 rounds up to 90
            "9, 80, 89, A+, 9, true",
            "0, 80, 80, A+, 9, true",
            "0, 79, 79, A, 8, true",
            "0, 70, 70, A, 8, true",
            "0, 69, 69, B+, 7, true",
            "0, 60, 60, B+, 7, true",
            "0, 59, 59, B, 6, true",
            "0, 50, 50, B, 6, true",
            "0, 49, 49, C, 5, true",
            "0, 45, 45, C, 5, true",        // the pass mark itself passes
            "0, 44.4, 44, F, 0, false",     // 44.4 rounds down: fail
            "0, 44.5, 45, C, 5, true",      // 44.5 rounds up: pass
            "0, 40, 40, F, 0, false",       // 40 no longer passes
            "0, 0, 0, F, 0, false",
            "20, 96, 100, O, 10, true",     // capped at 100
    })
    void gradeBoundaries(double a, double bc, int total, String letter, int points, boolean passed) {
        GradeCalculator.Grade g = GradeCalculator.grade(a, bc);
        assertEquals(total, g.total());
        assertEquals(letter, g.letter());
        assertEquals(points, g.points());
        assertEquals(passed, g.passed());
    }

    @Test
    void questionScoresTheBetterChoice() {
        assertEquals(15, GradeCalculator.questionTotal(new double[] {5, 5, 5}, new double[] {4, 4, 4}));
        assertEquals(16, GradeCalculator.questionTotal(new double[] {0, 0, 0}, new double[] {16, 0, 0}));
        assertEquals(0, GradeCalculator.questionTotal(new double[] {0, 0, 0}, new double[] {0, 0, 0}));
    }

    @Test
    void gpaIsCreditWeightedWithArrearsAsZero() {
        // 4 x 10 + 3 x 8 + 3 x 0 = 64 points over 10 credits = 6.40
        BigDecimal gpa = GradeCalculator.gpa(List.of(new GradeCalculator.CreditPoints(4, 10),
                new GradeCalculator.CreditPoints(3, 8), new GradeCalculator.CreditPoints(3, 0)));
        assertEquals(new BigDecimal("6.40"), gpa);
    }

    @Test
    void gpaRoundsHalfUpToTwoDecimals() {
        // (4 x 9 + 3 x 8) / 7 = 60 / 7 = 8.5714... -> 8.57
        assertEquals(new BigDecimal("8.57"), GradeCalculator.gpa(List.of(
                new GradeCalculator.CreditPoints(4, 9), new GradeCalculator.CreditPoints(3, 8))));
    }

    @Test
    void gpaWithNoCreditsIsZero() {
        assertEquals(new BigDecimal("0.00"), GradeCalculator.gpa(List.of()));
    }

    @Test
    void classification() {
        assertEquals("FAIL", GradeCalculator.classification(new BigDecimal("9.10"), true));
        assertEquals("PASS - DISTINCTION", GradeCalculator.classification(new BigDecimal("8.50"), false));
        assertEquals("FIRST CLASS", GradeCalculator.classification(new BigDecimal("8.49"), false));
        assertEquals("FIRST CLASS", GradeCalculator.classification(new BigDecimal("6.50"), false));
        assertEquals("PASS", GradeCalculator.classification(new BigDecimal("6.49"), false));
    }

    @Test
    void passMarkIsForty() {
        assertTrue(GradeCalculator.grade(0, 45).passed());
        assertFalse(GradeCalculator.grade(0, 44).passed());
    }
}
