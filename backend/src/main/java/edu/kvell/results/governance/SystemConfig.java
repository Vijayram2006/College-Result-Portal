package edu.kvell.results.governance;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Portal gateways, college locks and session details set by the Super Admin. Same JSON shape as the admin panel's
 * SystemConfig (utils/systemConfig.ts), so the panel can send and read it as is.
 */
public record SystemConfig(String systemMode, String lastUpdated, String updatedBy, AcademicSession academicSession,
                           Gateways gateways, Map<String, CollegeLock> institutionalLocks,
                           GradingRegulations gradingRegulations, MarkApproval markApproval) {

    /**
     * Approvals forwarded marks need before the college COE may publish them: the department's HOD, then the
     * college's Associate Dean. Both off (the default) keeps the original Faculty -> COE flow.
     */
    public record MarkApproval(boolean hodApproval, boolean deanApproval) {
    }

    /** OPERATIONAL, MAINTENANCE (student portal closed) or EMERGENCY_LOCK (every portal and COE change closed). */
    public static final java.util.Set<String> MODES = java.util.Set.of("OPERATIONAL", "MAINTENANCE", "EMERGENCY_LOCK");

    public record AcademicSession(String academicYear, String semesterTerm, String sessionStatus) {
    }

    public record Gateways(StudentGateway studentResultPortal, FacultyGateway facultyMarkEntry,
                           RevaluationGateway revaluationWindow) {
    }

    /** withholdResults: students sign in but see no marks. allowGradeDownload: the grade sheet download button. */
    public record StudentGateway(boolean enabled, String announcement, boolean allowGradeDownload,
                                 boolean withholdResults) {
    }

    /** submissionDeadline: local date-time (yyyy-MM-ddTHH:mm[:ss], India time); empty means no deadline. */
    public record FacultyGateway(boolean enabled, String submissionDeadline, String lockNotice,
                                 boolean allowInternalMarkEdit, boolean allowExternalMarkEdit) {
    }

    public record RevaluationGateway(boolean enabled, String deadline, int feePerCourse) {
    }

    /** locked / freezeSubmissions: the college's COE cannot change anything. resultsLive: students see results. */
    public record CollegeLock(boolean locked, boolean resultsLive, boolean freezeSubmissions) {
    }

    public record GradingRegulations(Regulation engineering, Regulation nursing, Regulation pharmacy,
                                     Moderation moderation) {
    }

    public record Regulation(String regulation, int passMinInternal, int passMinExternal, int passMinTotal,
                             String scaleDescription) {
    }

    public record Moderation(int maxGraceMarks, boolean enableCondonation, int attendanceThreshold) {
    }

    /**
     * The grading the server actually applies (GradeCalculator): the same for every college, pass at 40 of 100, no
     * grace marks. Shown read-only until the college confirms its pass rules; a saved configuration cannot change it.
     */
    public static GradingRegulations actualGrading() {
        Regulation current = new Regulation("KVELL current grading (pass rules to be confirmed by the college)", 0, 0,
                40, "10-point grading: O >= 90 (10), A+ >= 80 (9), A >= 70 (8), B+ >= 60 (7), B >= 50 (6), "
                        + "C >= 45 (5), F < 45 (0). Pass: total of 45 or more out of 100.");
        return new GradingRegulations(current, current, current, new Moderation(0, false, 0));
    }

    public static SystemConfig defaults() {
        Map<String, CollegeLock> locks = new LinkedHashMap<>();
        for (String college : new String[] {"engineering", "nursing", "pharmacy"}) {
            locks.put(college, new CollegeLock(false, true, false));
        }
        return new SystemConfig("OPERATIONAL", null, "System default",
                new AcademicSession("2026 - 2027", "ODD", "ACTIVE"),
                new Gateways(
                        new StudentGateway(true, "", true, false),
                        new FacultyGateway(true, "", "Mark submission window is open for the current evaluation.",
                                true, true),
                        new RevaluationGateway(false, "", 400)),
                locks, actualGrading(), new MarkApproval(false, false));
    }
}
