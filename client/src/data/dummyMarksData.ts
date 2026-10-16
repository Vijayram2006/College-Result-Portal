import { aidsSem1Students } from "./aidsStudents";
import { departmentSubjectsCatalog } from "./curriculumSubjects";

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
export function generateStudentMarkDetail(regNo: string, name: string, seedOffset: number) {
  const hash = regNo.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + seedOffset;
  
  const targetGrandTotal = 68 + (hash % 29); // 68 to 96 range, high quality pass rates

  const partARatio = targetGrandTotal / 100;
  const partA: number[] = Array(10).fill(0).map((_, qIdx) => {
    const qHash = (hash + qIdx * 7) % 10;
    if (partARatio > 0.85) return 2;
    if (partARatio > 0.7) return qHash > 3 ? 2 : 1;
    if (partARatio > 0.5) return qHash > 6 ? 2 : 1;
    return qHash > 7 ? 1 : 0;
  });
  const partATotal = partA.reduce((sum, v) => sum + v, 0);

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

  const resultStatus: "PASS" | "FAIL" = grandTotal >= 50 ? "PASS" : "FAIL";

  return {
    hasMarks: true,
    partATotal,
    partBCTotal,
    grandTotal,
    grade,
    gradePoints,
    resultStatus,
    partA,
    partBC,
    assessmentType: "End Semester",
  };
}

// Map grade helper for student course records
export function getGradeFromScore(score: number): { grade: string; points: number; status: "PASS" | "FAIL" } {
  if (score >= 90) return { grade: "O", points: 10, status: "PASS" };
  if (score >= 80) return { grade: "A+", points: 9, status: "PASS" };
  if (score >= 70) return { grade: "A", points: 8, status: "PASS" };
  if (score >= 60) return { grade: "B+", points: 7, status: "PASS" };
  if (score >= 50) return { grade: "B", points: 6, status: "PASS" };
  return { grade: "RA", points: 0, status: "FAIL" };
}

// 85 combined students across AIDS (50), CSE (20), and BME (15)
export const allCombinedStudents: StudentProfile[] = [
  ...aidsProfiles,
  ...cseSem1Students,
  ...bmeSem1Students,
];

// Pre-computed marksStudents list for Home.tsx marks entry and dean review
export const marksStudentsList: Array<{
  reg: string;
  name: string;
  dept: string;
  sub1: string;
  sub2: string;
  sub3: string;
  sub4: string;
  sub5: string;
}> = allCombinedStudents.map((s, idx) => {
  const hash = s.regNo.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + idx * 7;
  const gradePool = ["O", "A+", "A", "B+", "O", "A+", "A"];
  return {
    reg: s.regNo,
    name: s.name,
    dept: s.deptName,
    sub1: gradePool[hash % gradePool.length],
    sub2: gradePool[(hash + 1) % gradePool.length],
    sub3: gradePool[(hash + 2) % gradePool.length],
    sub4: gradePool[(hash + 3) % gradePool.length],
    sub5: gradePool[(hash + 4) % gradePool.length],
  };
});

// Pre-computed general students list with realistic averages
export const generalStudentsList: Array<{
  reg: string;
  name: string;
  section: string;
  semester: string;
  year: string;
  dept: string;
  average: number;
  status: string;
}> = allCombinedStudents.map((s, idx) => {
  const hash = s.regNo.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + idx * 7;
  const avg = 78 + (hash % 19);
  return {
    reg: s.regNo,
    name: s.name,
    section: s.section || "A",
    semester: "Semester I",
    year: "1st Year",
    dept: s.deptName,
    average: avg,
    status: avg >= 50 ? "PASS" : "FAIL",
  };
});

/**
 * Seeds dummy marks for CSE, ADS, and BME into client localStorage
 */
export function seedDummyMarksForDepts() {
  if (typeof window === "undefined" || !window.localStorage) return;

  const deptsConfig = [
    {
      deptKey: "aids",
      deptName: "Artificial Intelligence & Data Science",
      students: aidsProfiles,
      subjects: departmentSubjectsCatalog.aids?.subjects || [],
    },
    {
      deptKey: "cse",
      deptName: "Computer Science and Engineering",
      students: cseSem1Students,
      subjects: departmentSubjectsCatalog.cse?.subjects || [],
    },
    {
      deptKey: "bme",
      deptName: "Biomedical Engineering",
      students: bmeSem1Students,
      subjects: departmentSubjectsCatalog.bme?.subjects || [],
    },
  ];

  const batchesList: any[] = [];
  const allStoredStudents: any[] = [];

  deptsConfig.forEach((dept, dIdx) => {
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

    const studentSgpaMap = new Map<string, { totalPoints: number; count: number }>();

    dept.subjects.forEach((sub, sIdx) => {
      const storageKey = `kvell_marks_${dept.deptKey}_Semester I_${sub.code}`;
      const marksMap: Record<string, any> = {};
      const batchRecords: any[] = [];

      dept.students.forEach((student) => {
        const markDetail = generateStudentMarkDetail(student.regNo, student.name, (dIdx + 1) * 37 + sIdx * 19);
        marksMap[student.regNo] = markDetail;

        const cur = studentSgpaMap.get(student.regNo) || { totalPoints: 0, count: 0 };
        cur.totalPoints += markDetail.gradePoints;
        cur.count += 1;
        studentSgpaMap.set(student.regNo, cur);

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
          internalMarks: Math.round(markDetail.grandTotal * 0.4),
          externalMarks: Math.round(markDetail.grandTotal * 0.6),
          totalMarks: markDetail.grandTotal,
          grade: markDetail.grade,
          gradePoints: markDetail.gradePoints,
          resultStatus: markDetail.resultStatus,
          assessment: "End Semester",
        });
      });

      try {
        localStorage.setItem(storageKey, JSON.stringify(marksMap));
        if (dept.deptKey === "aids") {
          localStorage.setItem(`kvell_marks_ads_Semester I_${sub.code}`, JSON.stringify(marksMap));
        }
      } catch (e) {
        console.error(e);
      }

      const passedCount = batchRecords.filter((r) => r.resultStatus === "PASS").length;
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

  try {
    localStorage.setItem("kvell_students", JSON.stringify(allStoredStudents));
  } catch (e) {
    console.error(e);
  }

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

  localStorage.setItem("kvell_dummy_marks_seeded_v1", "true");
  window.dispatchEvent(new Event("kvell_marks_updated"));
  window.dispatchEvent(new Event("kvell_students_updated"));
  window.dispatchEvent(new Event("kvell_departments_updated"));
  window.dispatchEvent(new Event("storage"));
}

export function ensureDummyMarksLoaded() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const hasCse = localStorage.getItem("kvell_marks_cse_Semester I_UC26C01T");
    const hasBme = localStorage.getItem("kvell_marks_bme_Semester I_EN26C01T");
    const hasAids = localStorage.getItem("kvell_marks_aids_Semester I_UC26C01T");
    if (!hasCse || !hasBme || !hasAids) {
      seedDummyMarksForDepts();
    }
  } catch (e) {
    console.error("Error ensuring dummy marks:", e);
  }
}
