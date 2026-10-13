import { aidsSem1Students } from "./aidsStudents";

export interface StudentProfile {
  regNo: string;
  name: string;
  dob: string;
  email: string;
  deptKey: string;
  deptName: string;
  section: string;
  category: "regular" | "lateral";
}

// 20 Dummy Students for Computer Science and Engineering (CSE)
export const cseSem1Students: StudentProfile[] = [
  { regNo: "20260110201001", name: "AARAV S", dob: "2005-03-12", email: "20260110201001@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201002", name: "ANANYA R", dob: "2005-04-18", email: "20260110201002@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201003", name: "DEEPAK M", dob: "2005-05-22", email: "20260110201003@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201004", name: "HARINI K", dob: "2005-06-15", email: "20260110201004@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201005", name: "KARTHIK V", dob: "2005-07-09", email: "20260110201005@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201006", name: "KEERTHANA S", dob: "2005-08-14", email: "20260110201006@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201007", name: "MANOJ KUMAR R", dob: "2005-09-25", email: "20260110201007@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201008", name: "NAVEEN PRASAD P", dob: "2005-10-11", email: "20260110201008@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201009", name: "PAVITHRA M", dob: "2005-11-04", email: "20260110201009@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201010", name: "PRANAV G", dob: "2005-12-19", email: "20260110201010@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201011", name: "PRIYA DHARSHINI T", dob: "2005-01-28", email: "20260110201011@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201012", name: "RAHUL S", dob: "2005-02-17", email: "20260110201012@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201013", name: "ROHITH B", dob: "2005-03-30", email: "20260110201013@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201014", name: "SANJAY RAM K", dob: "2005-04-05", email: "20260110201014@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201015", name: "SNEHA R", dob: "2005-05-16", email: "20260110201015@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201016", name: "SURYA NARAYANAN S", dob: "2005-06-21", email: "20260110201016@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201017", name: "SWETHA M", dob: "2005-07-27", email: "20260110201017@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201018", name: "VIGNESH W", dob: "2005-08-31", email: "20260110201018@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201019", name: "VIKRAM A", dob: "2005-09-08", email: "20260110201019@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
  { regNo: "20260110201020", name: "YOGESHWARAN N", dob: "2005-10-24", email: "20260110201020@students.kvell.edu", deptKey: "cse", deptName: "Computer Science and Engineering", section: "A", category: "regular" },
];

// 15 Dummy Students for Biomedical Engineering (BME)
export const bmeSem1Students: StudentProfile[] = [
  { regNo: "20260110204001", name: "ABINAYA S", dob: "2005-02-14", email: "20260110204001@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204002", name: "BALAJI R", dob: "2005-03-19", email: "20260110204002@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204003", name: "CHANDRU M", dob: "2005-04-26", email: "20260110204003@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204004", name: "DHARANI K", dob: "2005-05-15", email: "20260110204004@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204005", name: "ELANGOVAN T", dob: "2005-06-03", email: "20260110204005@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204006", name: "GAYATHRI V", dob: "2005-07-18", email: "20260110204006@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204007", name: "HEMALATHA P", dob: "2005-08-21", email: "20260110204007@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204008", name: "ISWARYA R", dob: "2005-09-12", email: "20260110204008@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204009", name: "JEEVITHA S", dob: "2005-10-05", email: "20260110204009@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204010", name: "KAVIN KUMAR N", dob: "2005-11-17", email: "20260110204010@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204011", name: "LOGESHWARAN M", dob: "2005-12-08", email: "20260110204011@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204012", name: "MEENA S", dob: "2005-01-23", email: "20260110204012@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204013", name: "NIVEDHA B", dob: "2005-02-27", email: "20260110204013@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204014", name: "PRAVEEN RAJ G", dob: "2005-03-14", email: "20260110204014@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
  { regNo: "20260110204015", name: "RESHMA M", dob: "2005-04-11", email: "20260110204015@students.kvell.edu", deptKey: "bme", deptName: "Biomedical Engineering", section: "A", category: "regular" },
];

// AIDS 50 Students profile mapping
export const aidsProfiles: StudentProfile[] = aidsSem1Students.map((s, idx) => ({
  regNo: s.regNo,
  name: s.name,
  dob: "2005-06-15",
  email: `${s.regNo.toLowerCase()}@students.kvell.edu`,
  deptKey: "aids",
  deptName: "Artificial Intelligence & Data Science",
  section: "A",
  category: idx >= 45 ? "lateral" : "regular",
}));

// Generates question-wise marks consistent with the ResultsValidation form structure
export function generateStudentMarkDetail(
  regNo: string,
  name: string,
  seedOffset: number,
  assessmentType: "IA1" | "IA2" | "End Semester" = "End Semester"
) {
  // Deterministic score generation based on regNo and seed offset
  const hash = regNo.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + seedOffset;
  
  // Base score range between 68 and 96 (with an occasional 42 for realistic distributions)
  const isFail = (hash % 23) === 0;
  let targetGrandTotal = isFail ? 42 + (hash % 6) : 65 + (hash % 32);

  // Progressive scores: IA1 slightly lower, IA2 higher, End Semester highest
  if (assessmentType === "IA1") {
    targetGrandTotal = Math.max(38, Math.min(94, targetGrandTotal - (hash % 7) - 4));
  } else if (assessmentType === "IA2") {
    targetGrandTotal = Math.max(40, Math.min(97, targetGrandTotal - (hash % 4) - 1));
  }

  // Distribute Part A (out of 20, max 2 marks each for 10 questions)
  const partARatio = targetGrandTotal / 100;
  const partA: number[] = Array(10).fill(0).map((_, qIdx) => {
    const qHash = (hash + qIdx * 7) % 10;
    if (partARatio > 0.85) return 2;
    if (partARatio > 0.7) return qHash > 3 ? 2 : 1;
    if (partARatio > 0.5) return qHash > 6 ? 2 : 1;
    return qHash > 7 ? 1 : 0;
  });
  const partATotal = partA.reduce((sum, v) => sum + v, 0);

  // Distribute Part B + C (Questions 11 to 16, total out of 80)
  const targetBCTotal = Math.max(0, targetGrandTotal - partATotal);
  const avgPerQuestion = targetBCTotal / 6;

  const partBC: Record<number, { a: { i: number; ii: number; iii: number }; b: { i: number; ii: number; iii: number } }> = {};
  let accumulatedBC = 0;

  for (let q = 11; q <= 16; q++) {
    const qWeight = q === 16 ? targetBCTotal - accumulatedBC : Math.min(16, Math.max(0, Math.round(avgPerQuestion + ((hash + q) % 5) - 2)));
    accumulatedBC += qWeight;
    const iVal = Math.round(qWeight * 0.4);
    const iiVal = Math.round(qWeight * 0.4);
    const iiiVal = Math.max(0, qWeight - iVal - iiVal);

    partBC[q] = {
      a: { i: iVal, ii: iiVal, iii: iiiVal },
      b: { i: 0, ii: 0, iii: 0 },
    };
  }

  const partBCTotal = Object.values(partBC).reduce(
    (sum, q) => sum + Math.max(q.a.i + q.a.ii + q.a.iii, q.b.i + q.b.ii + q.b.iii),
    0
  );

  const grandTotal = partATotal + partBCTotal;
  const grade =
    grandTotal >= 90 ? "O" :
    grandTotal >= 80 ? "A+" :
    grandTotal >= 70 ? "A" :
    grandTotal >= 60 ? "B+" :
    grandTotal >= 50 ? "B" : "RA";

  const gradePoints =
    grade === "O" ? 10 :
    grade === "A+" ? 9 :
    grade === "A" ? 8 :
    grade === "B+" ? 7 :
    grade === "B" ? 6 : 0;

  const resultStatus: "PASS" | "FAIL" = grandTotal >= 40 ? "PASS" : "FAIL";

  return {
    regNo,
    name,
    studentName: name,
    hasMarks: true,
    partATotal,
    partBCTotal,
    grandTotal,
    totalMarks: grandTotal,
    grade,
    gradePoints,
    resultStatus,
    partA,
    partBC,
    assessmentType,
  };
}

import { departmentSubjectsCatalog } from "./curriculumSubjects";

/**
 * Seeds dummy marks for CSE, ADS, and BME across all their Semester I courses into localStorage.
 */
export function seedDummyMarksForDepts() {
  if (typeof window === "undefined" || !window.localStorage) return;

  const deptsConfig = [
    {
      deptKey: "aids",
      deptName: "Artificial Intelligence & Data Science",
      students: aidsProfiles,
      subjects: departmentSubjectsCatalog.aids?.subjects || [
        { code: "UC26C01T", title: "Induction & Professional English" },
        { code: "MA26C01T", title: "Matrices and Calculus" },
        { code: "CY26C01I", title: "Engineering Chemistry" },
        { code: "CS26C02T", title: "Programming in C" },
        { code: "CS26N01I", title: "Programming Laboratory" },
        { code: "ME26C02P", title: "Engineering Practices Laboratory" },
        { code: "UC26C02P", title: "Physics & Chemistry Laboratory" },
        { code: "UC26C03P", title: "Professional Communication Laboratory" },
      ],
    },
    {
      deptKey: "cse",
      deptName: "Computer Science and Engineering",
      students: cseSem1Students,
      subjects: departmentSubjectsCatalog.cse?.subjects || [
        { code: "UC26C01T", title: "Induction & Professional English" },
        { code: "MA26C01T", title: "Matrices and Calculus" },
        { code: "CY26C01I", title: "Engineering Chemistry" },
        { code: "CS26C02T", title: "Programming in C" },
        { code: "CS26N01I", title: "Programming Laboratory" },
        { code: "ME26C02P", title: "Engineering Practices Laboratory" },
        { code: "UC26C02P", title: "Physics & Chemistry Laboratory" },
        { code: "UC26C03P", title: "Professional Communication Laboratory" },
      ],
    },
    {
      deptKey: "bme",
      deptName: "Biomedical Engineering",
      students: bmeSem1Students,
      subjects: departmentSubjectsCatalog.bme?.subjects || [
        { code: "EN26C01T", title: "Professional English" },
        { code: "MA26C01T", title: "Matrices and Calculus" },
        { code: "PH26C01I", title: "Engineering Physics" },
        { code: "EE26C01T", title: "Basic Electrical and Electronics Engineering" },
        { code: "CS26C01I", title: "Problem Solving and Python Programming" },
        { code: "ME26C02P", title: "Engineering Practices Laboratory" },
        { code: "UC26C02P", title: "Physics & Chemistry Laboratory" },
        { code: "UC26C03P", title: "Professional Communication Laboratory" },
      ],
    },
  ];

  const batchesList: any[] = [];
  const allStoredStudents: any[] = [];

  deptsConfig.forEach((dept, dIdx) => {
    // 1. Store dept-specific roster into kvell_dept_students_${deptKey}
    const studentListPayload = dept.students.map((s) => ({
      "Register Number": s.regNo,
      Name: s.name,
      DOB: s.dob,
      Department: dept.deptName,
      Category: s.category,
      Year: "1st Year",
      regNo: s.regNo,
      studentName: s.name,
      dob: s.dob,
      dept: dept.deptName,
      deptKey: dept.deptKey,
      category: s.category,
      year: "1st Year",
    }));

    try {
      localStorage.setItem(`kvell_dept_students_${dept.deptKey}`, JSON.stringify(studentListPayload));
      sessionStorage.setItem(`kvell_dept_students_${dept.deptKey}`, JSON.stringify(studentListPayload));
      if (dept.deptKey === "aids") {
        localStorage.setItem("kvell_dept_students_ads", JSON.stringify(studentListPayload));
        sessionStorage.setItem("kvell_dept_students_ads", JSON.stringify(studentListPayload));
      }
    } catch (e) {
      console.error(e);
    }

    // Calculate overall SGPA per student across the subjects
    const studentSgpaMap = new Map<string, { totalPoints: number; count: number }>();

    dept.subjects.forEach((sub, sIdx) => {
      const storageKey = `kvell_marks_${dept.deptKey}_Semester I_${sub.code}`;
      const marksMap: Record<string, any> = {};
      const batchRecords: any[] = [];

      const ia1MarksMap: Record<string, any> = {};
      const ia2MarksMap: Record<string, any> = {};

      dept.students.forEach((student) => {
        const ia1Detail = generateStudentMarkDetail(student.regNo, student.name, (dIdx + 1) * 37 + sIdx * 19 + 7, "IA1");
        const ia2Detail = generateStudentMarkDetail(student.regNo, student.name, (dIdx + 1) * 37 + sIdx * 19 + 13, "IA2");
        const endSemDetail = generateStudentMarkDetail(student.regNo, student.name, (dIdx + 1) * 37 + sIdx * 19, "End Semester");

        const fullStudentDetail = {
          ...endSemDetail,
          regNo: student.regNo,
          name: student.name,
          studentName: student.name,
          dob: student.dob,
          deptKey: dept.deptKey,
          deptName: dept.deptName,
          semester: "Semester I",
          subjectCode: sub.code,
          subjectTitle: sub.title,
          ia1Total: ia1Detail.grandTotal,
          ia2Total: ia2Detail.grandTotal,
        };

        marksMap[student.regNo] = fullStudentDetail;
        ia1MarksMap[student.regNo] = {
          ...ia1Detail,
          regNo: student.regNo,
          name: student.name,
          studentName: student.name,
          dob: student.dob,
          deptKey: dept.deptKey,
          deptName: dept.deptName,
          semester: "Semester I",
          subjectCode: sub.code,
          subjectTitle: sub.title,
        };
        ia2MarksMap[student.regNo] = {
          ...ia2Detail,
          regNo: student.regNo,
          name: student.name,
          studentName: student.name,
          dob: student.dob,
          deptKey: dept.deptKey,
          deptName: dept.deptName,
          semester: "Semester I",
          subjectCode: sub.code,
          subjectTitle: sub.title,
        };

        // Track SGPA based on End Semester
        const cur = studentSgpaMap.get(student.regNo) || { totalPoints: 0, count: 0 };
        cur.totalPoints += endSemDetail.gradePoints;
        cur.count += 1;
        studentSgpaMap.set(student.regNo, cur);

        // Batch records for End Semester
        batchRecords.push({
          regNo: student.regNo,
          studentName: student.name,
          name: student.name,
          dob: student.dob,
          deptKey: dept.deptKey,
          dept: dept.deptName,
          courseCode: sub.code,
          courseTitle: sub.title,
          subjectCode: sub.code,
          subjectTitle: sub.title,
          semester: "Semester I",
          internalMarks: Math.round(endSemDetail.grandTotal * 0.4),
          externalMarks: Math.round(endSemDetail.grandTotal * 0.6),
          totalMarks: endSemDetail.grandTotal,
          grade: endSemDetail.grade,
          gradePoints: endSemDetail.gradePoints,
          resultStatus: endSemDetail.resultStatus,
          assessment: "End Semester",
        });

        // Batch records for IA1
        batchRecords.push({
          regNo: student.regNo,
          studentName: student.name,
          name: student.name,
          dob: student.dob,
          deptKey: dept.deptKey,
          dept: dept.deptName,
          courseCode: sub.code,
          courseTitle: sub.title,
          subjectCode: sub.code,
          subjectTitle: sub.title,
          semester: "Semester I",
          internalMarks: Math.round(ia1Detail.grandTotal * 0.2),
          externalMarks: Math.round(ia1Detail.grandTotal * 0.8),
          totalMarks: ia1Detail.grandTotal,
          grade: ia1Detail.grade,
          gradePoints: ia1Detail.gradePoints,
          resultStatus: ia1Detail.resultStatus,
          assessment: "IA1",
        });

        // Batch records for IA2
        batchRecords.push({
          regNo: student.regNo,
          studentName: student.name,
          name: student.name,
          dob: student.dob,
          deptKey: dept.deptKey,
          dept: dept.deptName,
          courseCode: sub.code,
          courseTitle: sub.title,
          subjectCode: sub.code,
          subjectTitle: sub.title,
          semester: "Semester I",
          internalMarks: Math.round(ia2Detail.grandTotal * 0.2),
          externalMarks: Math.round(ia2Detail.grandTotal * 0.8),
          totalMarks: ia2Detail.grandTotal,
          grade: ia2Detail.grade,
          gradePoints: ia2Detail.gradePoints,
          resultStatus: ia2Detail.resultStatus,
          assessment: "IA2",
        });
      });

      // Persist to kvell_marks_${deptKey}_${semester}_${subjectCode}
      try {
        localStorage.setItem(storageKey, JSON.stringify(marksMap));
        localStorage.setItem(`kvell_marks_${dept.deptKey}_IA1_${sub.code}`, JSON.stringify(ia1MarksMap));
        localStorage.setItem(`kvell_marks_${dept.deptKey}_IA2_${sub.code}`, JSON.stringify(ia2MarksMap));
        if (dept.deptKey === "aids") {
          localStorage.setItem(`kvell_marks_ads_Semester I_${sub.code}`, JSON.stringify(marksMap));
          localStorage.setItem(`kvell_marks_ads_IA1_${sub.code}`, JSON.stringify(ia1MarksMap));
          localStorage.setItem(`kvell_marks_ads_IA2_${sub.code}`, JSON.stringify(ia2MarksMap));
        }
      } catch (e) {
        console.error(e);
      }

      // Create a batch entry for the subject
      const passedCount = batchRecords.filter((r) => r.assessment === "End Semester" && r.resultStatus === "PASS").length;
      batchesList.push({
        id: `BATCH-2026-${dept.deptKey.toUpperCase()}-${sub.code}`,
        batchTitle: `B.Tech ${dept.deptKey.toUpperCase()} - ${sub.code} (${sub.title})`,
        departmentKey: dept.deptKey,
        departmentName: dept.deptName,
        semester: "Semester I",
        academicYear: "2026 - 2027",
        examMonthYear: "October 2026",
        uploadDate: "2026-10-12",
        uploadedBy: `Dr. HOD ${dept.deptKey.toUpperCase()}`,
        totalStudents: dept.students.length,
        passedStudents: passedCount,
        passPercentage: Number(((passedCount / dept.students.length) * 100).toFixed(1)),
        publicationStatus: "PUBLISHED",
        publishedAt: "2026-10-12 18:30:00",
        publishedBy: "Controller of Examinations (ADMIN)",
        records: batchRecords,
      });
    });

    // Populate Students Directory entries
    dept.students.forEach((student) => {
      const stats = studentSgpaMap.get(student.regNo);
      const sgpa = stats && stats.count > 0 ? Number((stats.totalPoints / stats.count).toFixed(2)) : 8.5;
      allStoredStudents.push({
        regNo: student.regNo,
        name: student.name,
        email: student.email,
        deptName: dept.deptName,
        deptKey: dept.deptKey,
        year: "1st Year",
        section: student.section,
        semester: "Semester I",
        sgpa,
        cgpa: sgpa,
        status: "ACTIVE",
      });
    });
  });

  // Save published batches
  try {
    const existingRaw = localStorage.getItem("kvell_custom_batches");
    const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
    const mergedBatches = [...batchesList];
    existing.forEach((eb) => {
      if (!mergedBatches.some((mb) => mb.id === eb.id)) {
        mergedBatches.push(eb);
      }
    });
    localStorage.setItem("kvell_custom_batches", JSON.stringify(mergedBatches));

    // Also populate kvell_published_results for Analytics
    const allPublishedRecords: any[] = [];
    mergedBatches.forEach((b) => {
      if (Array.isArray(b.records)) {
        allPublishedRecords.push(...b.records);
      }
    });
    localStorage.setItem("kvell_published_results", JSON.stringify(allPublishedRecords));
  } catch (e) {
    console.error(e);
  }

  // Save to kvell_students
  try {
    localStorage.setItem("kvell_students", JSON.stringify(allStoredStudents));
  } catch (e) {
    console.error(e);
  }

  // Update total students in kvell_departments
  try {
    const rawDepts = localStorage.getItem("kvell_departments");
    if (rawDepts) {
      const depts = JSON.parse(rawDepts);
      if (Array.isArray(depts)) {
        const updatedDepts = depts.map((d: any) => {
          const k = String(d.key || "").toLowerCase();
          if (k === "aids" || k === "ads") return { ...d, totalStudents: 50 };
          if (k === "cse") return { ...d, totalStudents: 20 };
          if (k === "bme") return { ...d, totalStudents: 15 };
          return d;
        });
        localStorage.setItem("kvell_departments", JSON.stringify(updatedDepts));
      }
    }
  } catch (e) {
    console.error(e);
  }

  localStorage.setItem("kvell_dummy_marks_seeded_v2", "true");
  window.dispatchEvent(new Event("kvell_marks_updated"));
  window.dispatchEvent(new Event("kvell_students_updated"));
  window.dispatchEvent(new Event("kvell_departments_updated"));
  window.dispatchEvent(new Event("storage"));
}

/**
 * Ensures marks are seeded if not already present in localStorage
 */
export function ensureDummyMarksLoaded() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    // RBAC: Never seed dummy data for Nursing or Pharmacy COE accounts
    const rawUser = localStorage.getItem("kvell_admin_user");
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.collegeKey && u.collegeKey !== "engineering") {
        return;
      }
      if (u.role === "COE_NURSING" || u.role === "COE_PHARMACY") {
        return;
      }
    }

    const hasCse = localStorage.getItem("kvell_marks_cse_Semester I_UC26C01T");
    const hasBme = localStorage.getItem("kvell_marks_bme_Semester I_EN26C01T");
    const hasAids = localStorage.getItem("kvell_marks_aids_Semester I_UC26C01T");
    const seededV2 = localStorage.getItem("kvell_dummy_marks_seeded_v2");
    if (!hasCse || !hasBme || !hasAids || !seededV2) {
      seedDummyMarksForDepts();
    }
  } catch (e) {
    console.error("Error ensuring dummy marks:", e);
  }
}
