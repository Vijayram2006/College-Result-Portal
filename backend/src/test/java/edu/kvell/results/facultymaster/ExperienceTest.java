package edu.kvell.results.facultymaster;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Faculty experience: joining date to today, blank To = till date, overlapping periods counted once. */
class ExperienceTest {

    @Test
    void experienceCountsOverlapsOnceAndTillDate() {
        LocalDate today = LocalDate.of(2026, 10, 17);
        var current = new FacultyMasterController.Employment("ENGINEERING", "AP", "Here", "Madurai", "2020-06-01", "");
        var earlier = new FacultyMasterController.Employment("INDUSTRIAL", "Eng", "Co", "Chennai", "2016-01-01", "2018-12-31");
        // 2016-01-01..2018-12-31 = 36 months; 2020-06-01..2026-10-17 = 76 months; the current job overlaps service here
        assertEquals(36 + 76, FacultyMasterController.overallMonths(List.of(current, earlier), LocalDate.of(2020, 6, 1), today));
        assertEquals(76, FacultyMasterController.overallMonths(List.of(), LocalDate.of(2020, 6, 1), today));
        var exp = FacultyMasterController.experience(List.of(current, earlier), LocalDate.of(2020, 6, 1), today);
        assertEquals("THIS_COLLEGE", exp.get(3).section());
        assertEquals(6, exp.get(3).years());
        assertEquals(4, exp.get(3).months());
    }
}
