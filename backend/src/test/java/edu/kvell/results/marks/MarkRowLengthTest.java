package edu.kvell.results.marks;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** A stored mark row of the wrong length (the FUY / Pharmacy Mark Entry crash of 17 Oct 2026) reads safely. */
class MarkRowLengthTest {

    @Test
    void shortRowIsPaddedWithZeros() {
        List<Double> stored = Arrays.asList(7.0, 4.0, 0.0, 0.0, 0.0, 0.0, 4.0, 5.0, 0.0, 7.0, 0.0, 0.0, 4.0, 4.0, 0.0, 0.0);
        List<Double> fixed = MarkService.fixedLength(stored, 36);
        assertEquals(36, fixed.size());
        assertEquals(stored, fixed.subList(0, 16));
        assertEquals(0.0, fixed.get(35));
    }

    @Test
    void longRowIsCutAndNullsReadAsZero() {
        List<Double> fixed = MarkService.fixedLength(Arrays.asList(1.0, null, 2.0, 3.0), 3);
        assertEquals(List.of(1.0, 0.0, 2.0), fixed);
    }
}
