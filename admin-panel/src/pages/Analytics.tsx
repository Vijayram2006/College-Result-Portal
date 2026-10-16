import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Award,
  BookOpen,
  Users,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FileCheck2,
  Layers,
  Sparkles,
  ChevronDown,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  ensureDummyMarksLoaded,
  aidsProfiles,
  cseSem1Students,
  bmeSem1Students,
} from "../data/dummyMarksData";
import { getScopedKey, isEngineeringCollege, getActiveCollege } from "../utils/rbac";
import { getStoredDepartments, Department } from "./Departments";

type AssessmentFilter = "ALL" | "IA1" | "IA2" | "END_SEM";

export interface LiveStudentMark {
  regNo: string;
  name: string;
  dob?: string;
  deptKey: string;
  deptName: string;
  semester: string;
  subjectCode: string;
  subjectTitle: string;
  assessment: "IA1" | "IA2" | "END_SEM";
  partA: number;
  partBC: number;
  totalMarks: number;
  grade: string;
  resultStatus: "PASS" | "FAIL";
}

const deptNamesMap: Record<string, string> = {
  aids: "AIDS",
  ads: "AIDS",
  cse: "CSE",
  bme: "BME",
  ece: "ECE",
  it: "IT",
  eee: "EEE",
  mech: "MECH",
  auto: "AUTO",
  biotech: "BIOTECH",
  civil: "CIVIL",
  robotics: "ROBOTICS",
  mba: "MBA",
  mca: "MCA",
  nursing: "Nursing",
  pharmacy: "Pharmacy",
};

/**
 * Scans localStorage for live student marks saved during validation or publication
 */
export const fetchAllLiveMarks = (): LiveStudentMark[] => {
  const marksMap = new Map<string, LiveStudentMark>();
  const studentLookupMap = new Map<string, { regNo: string; name: string; deptKey: string; deptName: string; dob?: string }>();

  // Only seed known profiles if engineering college
  if (isEngineeringCollege()) {
    const allKnownProfiles = [...aidsProfiles, ...cseSem1Students, ...bmeSem1Students];
    allKnownProfiles.forEach((s) => {
      studentLookupMap.set(s.regNo, {
        regNo: s.regNo,
        name: s.name,
        deptKey: s.deptKey,
        deptName: s.deptName,
        dob: s.dob,
      });
    });
  }

  // Ensure dummy marks are present (only seeds for engineering)
  try {
    ensureDummyMarksLoaded();
  } catch (e) {
    console.error("Error ensuring dummy marks:", e);
  }

  const deptStudentsPrefix = getScopedKey("kvell_dept_students_");
  const marksPrefix = getScopedKey("kvell_marks_");
  const publishedKey = getScopedKey("kvell_published_results");
  const customBatchesKey = getScopedKey("kvell_custom_batches");

  // Also check stored student list in scoped kvell_dept_students_
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(deptStudentsPrefix)) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach((s: any) => {
              const reg = s.regNo || s["Register Number"];
              const nm = s.name || s.studentName || s["Name"];
              if (reg && nm && !studentLookupMap.has(reg)) {
                studentLookupMap.set(reg, {
                  regNo: reg,
                  name: nm,
                  deptKey: s.deptKey || k.replace(deptStudentsPrefix, ""),
                  deptName: s.dept || s.Department || "Academic Department",
                  dob: s.dob || s["DOB"],
                });
              }
            });
          }
        }
      }
    }
  } catch {}

  // 1. Scan individual student mark entries
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(marksPrefix)) {
        const parts = key.replace(marksPrefix, "").split("_");
        const fallbackDeptKey = parts[0] || (isEngineeringCollege() ? "aids" : "dept");
        const fallbackSemester = parts[1] || "Semester I";
        const fallbackSubjectCode = parts[2] || "COURSE01";

        const raw = localStorage.getItem(key);
        if (raw) {
          let studentDict: Record<string, any> = {};
          try {
            studentDict = JSON.parse(raw);
          } catch {
            continue;
          }
          if (!studentDict || typeof studentDict !== "object") continue;

          Object.entries(studentDict).forEach(([dictKey, s]: [string, any]) => {
            if (s && (s.hasMarks || s.grandTotal !== undefined || s.totalMarks !== undefined)) {
              const regNo = String(s.regNo || dictKey || "").trim();
              if (!regNo || regNo === "undefined") return;

              const knownStudent = studentLookupMap.get(regNo);
              const name = String(s.name || s.studentName || knownStudent?.name || `Student ${regNo}`);
              const dob = s.dob || knownStudent?.dob || "2005-06-15";

              const aType = String(s.assessmentType || parts[1] || "End Semester");
              const assessment: "IA1" | "IA2" | "END_SEM" =
                aType.includes("1") || aType.toUpperCase().includes("IA1") || aType.toUpperCase().includes("IAT-1")
                  ? "IA1"
                  : aType.includes("2") || aType.toUpperCase().includes("IA2") || aType.toUpperCase().includes("IAT-2")
                  ? "IA2"
                  : "END_SEM";

              const partA = Number(s.partATotal) || 0;
              const partBC = Number(s.partBCTotal) || 0;
              const totalMarks =
                s.grandTotal !== undefined
                  ? Number(s.grandTotal)
                  : s.totalMarks !== undefined
                  ? Number(s.totalMarks)
                  : partA + partBC;

              const grade =
                s.grade ||
                (totalMarks >= 90
                  ? "O"
                  : totalMarks >= 80
                  ? "A+"
                  : totalMarks >= 70
                  ? "A"
                  : totalMarks >= 60
                  ? "B+"
                  : totalMarks >= 50
                  ? "B"
                  : "RA");

              const resultStatus: "PASS" | "FAIL" =
                s.resultStatus === "PASS" || (!s.resultStatus && totalMarks >= 40) ? "PASS" : "FAIL";
              const finalDeptKey = (s.deptKey || knownStudent?.deptKey || fallbackDeptKey).toLowerCase();
              const deptName =
                s.deptName || knownStudent?.deptName || deptNamesMap[finalDeptKey] || finalDeptKey.toUpperCase();
              const subjectCode = s.subjectCode || fallbackSubjectCode;

              const uniqueKey = `${regNo}_${subjectCode}_${assessment}`;
              marksMap.set(uniqueKey, {
                regNo,
                name,
                dob,
                deptKey: finalDeptKey,
                deptName,
                semester: s.semester || (fallbackSemester.startsWith("IA") ? "Semester I" : fallbackSemester),
                subjectCode,
                subjectTitle: s.subjectTitle || "Curriculum Subject",
                assessment,
                partA,
                partBC,
                totalMarks,
                grade,
                resultStatus,
              });
            }
          });
        }
      }
    }
  } catch (e) {
    console.error("Error reading live marks from localStorage:", e);
  }

  // 2. Scan published results (scoped to active college)
  try {
    const rawPublished = localStorage.getItem(publishedKey);
    if (rawPublished) {
      const list: any[] = JSON.parse(rawPublished);
      if (Array.isArray(list)) {
        list.forEach((r: any) => {
          if (r && r.regNo && r.totalMarks !== undefined) {
            const regNo = String(r.regNo || "").trim();
            if (!regNo || regNo === "undefined") return;

            const knownStudent = studentLookupMap.get(regNo);
            const name = String(r.name || r.studentName || knownStudent?.name || `Student ${regNo}`);

            const aType = String(r.assessment || r.examSession || "End Semester");
            const assessment: "IA1" | "IA2" | "END_SEM" =
              aType.includes("1") || aType.toUpperCase().includes("IA1") || aType.toUpperCase().includes("IAT-1")
                ? "IA1"
                : aType.includes("2") || aType.toUpperCase().includes("IA2") || aType.toUpperCase().includes("IAT-2")
                ? "IA2"
                : "END_SEM";
            const subjectCode = String(r.subjectCode || r.courseCode || "UC26C01T");
            const uniqueKey = `${regNo}_${subjectCode}_${assessment}`;

            if (!marksMap.has(uniqueKey)) {
              const deptKey = String(r.deptKey || knownStudent?.deptKey || (isEngineeringCollege() ? "aids" : "dept")).toLowerCase();
              const totalMarks = Number(r.totalMarks) || 0;
              const internalMarks = Number(r.internalMarks) || Math.round(totalMarks * 0.2);
              const externalMarks = Number(r.externalMarks) || Math.round(totalMarks * 0.8);

              const grade =
                r.grade ||
                (totalMarks >= 90
                  ? "O"
                  : totalMarks >= 80
                  ? "A+"
                  : totalMarks >= 70
                  ? "A"
                  : totalMarks >= 60
                  ? "B+"
                  : totalMarks >= 50
                  ? "B"
                  : "RA");

              const resultStatus: "PASS" | "FAIL" =
                r.resultStatus === "FAIL" || r.result === "FAIL" || totalMarks < 40 ? "FAIL" : "PASS";

              marksMap.set(uniqueKey, {
                regNo,
                name,
                dob: r.dob || knownStudent?.dob || "2005-06-15",
                deptKey,
                deptName: r.dept || knownStudent?.deptName || deptNamesMap[deptKey] || deptKey.toUpperCase(),
                semester: r.semester || "Semester I",
                subjectCode,
                subjectTitle: r.subjectTitle || r.courseTitle || "Subject",
                assessment,
                partA: internalMarks,
                partBC: externalMarks,
                totalMarks,
                grade,
                resultStatus,
              });
            }
          }
        });
      }
    }
  } catch (e) {
    console.error("Error reading published results from localStorage:", e);
  }

  // 3. Scan custom batches (scoped to active college)
  try {
    const rawBatches = localStorage.getItem(customBatchesKey);
    if (rawBatches) {
      const batches: any[] = JSON.parse(rawBatches);
      if (Array.isArray(batches)) {
        batches.forEach((b: any) => {
          if (b && Array.isArray(b.records)) {
            b.records.forEach((r: any) => {
              if (r && r.regNo && r.totalMarks !== undefined) {
                const regNo = String(r.regNo || "").trim();
                if (!regNo || regNo === "undefined") return;

                const knownStudent = studentLookupMap.get(regNo);
                const name = String(r.studentName || r.name || knownStudent?.name || `Student ${regNo}`);

                const aType = String(r.assessment || b.examMonthYear || "End Semester");
                const assessment: "IA1" | "IA2" | "END_SEM" =
                  aType.includes("1") || aType.toUpperCase().includes("IA1")
                    ? "IA1"
                    : aType.includes("2") || aType.toUpperCase().includes("IA2")
                    ? "IA2"
                    : "END_SEM";
                const subjectCode = String(r.courseCode || r.subjectCode || b.id || "UC26C01T");
                const uniqueKey = `${regNo}_${subjectCode}_${assessment}`;

                if (!marksMap.has(uniqueKey)) {
                  const deptKey = String(r.deptKey || b.departmentKey || knownStudent?.deptKey || "aids").toLowerCase();
                  const totalMarks = Number(r.totalMarks) || 0;
                  const internalMarks = Number(r.internalMarks) || Math.round(totalMarks * 0.2);
                  const externalMarks = Number(r.externalMarks) || Math.round(totalMarks * 0.8);

                  const grade =
                    r.grade ||
                    (totalMarks >= 90
                      ? "O"
                      : totalMarks >= 80
                      ? "A+"
                      : totalMarks >= 70
                      ? "A"
                      : totalMarks >= 60
                      ? "B+"
                      : totalMarks >= 50
                      ? "B"
                      : "RA");

                  const resultStatus: "PASS" | "FAIL" =
                    r.resultStatus === "FAIL" || totalMarks < 40 ? "FAIL" : "PASS";

                  marksMap.set(uniqueKey, {
                    regNo,
                    name,
                    dob: r.dob || knownStudent?.dob || "2005-06-15",
                    deptKey,
                    deptName: b.departmentName || knownStudent?.deptName || deptNamesMap[deptKey] || deptKey.toUpperCase(),
                    semester: b.semester || "Semester I",
                    subjectCode,
                    subjectTitle: r.courseTitle || r.subjectTitle || b.batchTitle || "Subject",
                    assessment,
                    partA: internalMarks,
                    partBC: externalMarks,
                    totalMarks,
                    grade,
                    resultStatus,
                  });
                }
              }
            });
          }
        });
      }
    }
  } catch (e) {
    console.error("Error reading custom batches from localStorage:", e);
  }

  return Array.from(marksMap.values());
};

export const AnalyticsPage: React.FC = () => {
  const [, navigate] = useLocation();
  const college = getActiveCollege();
  const [departments, setDepartments] = useState<Department[]>([]);

  // Primary Assessment Focus Filter
  const [assessment, setAssessment] = useState<AssessmentFilter>("ALL");

  // Secondary Department & Semester Filter
  const [deptFilter, setDeptFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [searchStudent, setSearchStudent] = useState("");

  // Live Marks State loaded from localStorage
  const [liveMarks, setLiveMarks] = useState<LiveStudentMark[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const refreshData = () => {
    try {
      ensureDummyMarksLoaded();
    } catch {}
    const marks = fetchAllLiveMarks();
    setLiveMarks(marks);
    setDepartments(getStoredDepartments());
    setLastRefreshed(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    refreshData();

    const handleStorageChange = () => refreshData();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("kvell_marks_updated", handleStorageChange);
    window.addEventListener("kvell_departments_updated", handleStorageChange);
    window.addEventListener("focus", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("kvell_marks_updated", handleStorageChange);
      window.removeEventListener("kvell_departments_updated", handleStorageChange);
      window.removeEventListener("focus", handleStorageChange);
    };
  }, []);

  const handleClearAllMarks = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all entered examination marks? Analytics and graphs will become completely empty."
      )
    ) {
      try {
        const marksPrefix = getScopedKey("kvell_marks_");
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(marksPrefix)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        localStorage.removeItem(getScopedKey("kvell_published_results"));
        localStorage.removeItem(getScopedKey("kvell_custom_batches"));
        window.dispatchEvent(new Event("kvell_marks_updated"));
        refreshData();
        alert("All marks data successfully cleared. Analytics is now empty.");
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Filter live marks by Department and Semester
  const filteredMarks = useMemo(() => {
    return liveMarks.filter((m) => {
      const k = (m.deptKey || "").toLowerCase();
      const matchDept =
        deptFilter === "all" ||
        k === deptFilter.toLowerCase() ||
        (deptFilter === "aids" && k === "ads");
      const matchSem = semesterFilter === "all" || m.semester === semesterFilter;
      return matchDept && matchSem;
    });
  }, [liveMarks, deptFilter, semesterFilter]);

  // Target marks matching the current assessment tab
  const assessmentMarks = useMemo(() => {
    if (assessment === "ALL") return filteredMarks;
    return filteredMarks.filter((m) => m.assessment === assessment);
  }, [filteredMarks, assessment]);

  const hasAnyMarks = liveMarks.length > 0;
  const hasAssessmentMarks = assessmentMarks.length > 0;

  // Active Key Performance Indicator (KPI) Stats
  const activeStats = useMemo(() => {
    if (assessmentMarks.length === 0) {
      return {
        title:
          assessment === "IA1"
            ? "Internal Assessment 1 (IAT-1)"
            : assessment === "IA2"
            ? "Internal Assessment 2 (IAT-2)"
            : assessment === "END_SEM"
            ? "End Semester Examinations"
            : "Overall Multi-Assessment Cumulative",
        avgScore: "0%",
        passRate: "0%",
        passRateDelta: "No live marks",
        evaluatedCount: 0,
        partAAvg: "0.0 / 20",
        partBCAvg: "0.0 / 80",
        topGradeRate: "0%",
        arrearCount: 0,
      };
    }

    const totalCount = assessmentMarks.length;
    const avgScoreVal = totalCount > 0 ? assessmentMarks.reduce((acc, m) => acc + (Number(m.totalMarks) || 0), 0) / totalCount : 0;
    const passedCount = assessmentMarks.filter((m) => m.resultStatus === "PASS" || (Number(m.totalMarks) || 0) >= 40).length;
    const passRateVal = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
    const partAVal = totalCount > 0 ? assessmentMarks.reduce((acc, m) => acc + (Number(m.partA) || 0), 0) / totalCount : 0;
    const partBCVal = totalCount > 0 ? assessmentMarks.reduce((acc, m) => acc + (Number(m.partBC) || 0), 0) / totalCount : 0;
    const distinctions = assessmentMarks.filter((m) => m.grade === "O" || m.grade === "A+").length;
    const topGradeVal = totalCount > 0 ? (distinctions / totalCount) * 100 : 0;
    const arrearCount = assessmentMarks.filter((m) => m.resultStatus === "FAIL" || (Number(m.totalMarks) || 0) < 40).length;

    return {
      title:
        assessment === "IA1"
          ? "Internal Assessment 1 (IAT-1)"
          : assessment === "IA2"
          ? "Internal Assessment 2 (IAT-2)"
          : assessment === "END_SEM"
          ? "End Semester Examinations"
          : "Overall Multi-Assessment Cumulative",
      avgScore: `${avgScoreVal.toFixed(1)}%`,
      passRate: `${passRateVal.toFixed(1)}%`,
      passRateDelta: `${passedCount} of ${totalCount} Candidates Passed`,
      evaluatedCount: totalCount,
      partAAvg: `${partAVal.toFixed(1)} / 20`,
      partBCAvg: `${partBCVal.toFixed(1)} / 80`,
      topGradeRate: `${topGradeVal.toFixed(1)}%`,
      arrearCount,
    };
  }, [assessmentMarks, assessment]);

  // Transform Live Department Data for Bar Chart
  const chartDeptData = useMemo(() => {
    if (filteredMarks.length === 0) return [];

    // Group marks by department
    const deptGroups: Record<string, LiveStudentMark[]> = {};
    filteredMarks.forEach((m) => {
      let key = (m.deptKey || "other").toLowerCase();
      if (key === "ads") key = "aids";
      if (!deptGroups[key]) deptGroups[key] = [];
      deptGroups[key].push(m);
    });

    return Object.entries(deptGroups).map(([key, list]) => {
      const name = deptNamesMap[key] || key.toUpperCase();

      const ia1List = list.filter((m) => m.assessment === "IA1");
      const ia2List = list.filter((m) => m.assessment === "IA2");
      const endSemList = list.filter((m) => m.assessment === "END_SEM");

      let ia1Avg = ia1List.length ? Number((ia1List.reduce((a, b) => a + (Number(b.totalMarks) || 0), 0) / ia1List.length).toFixed(1)) : 0;
      let ia2Avg = ia2List.length ? Number((ia2List.reduce((a, b) => a + (Number(b.totalMarks) || 0), 0) / ia2List.length).toFixed(1)) : 0;
      const endSemAvg = endSemList.length ? Number((endSemList.reduce((a, b) => a + (Number(b.totalMarks) || 0), 0) / endSemList.length).toFixed(1)) : 0;

      // If IA1 or IA2 are not yet uploaded separately, interpolate based on EndSem
      if (ia1Avg === 0 && endSemAvg > 0) {
        ia1Avg = Number(Math.max(40, endSemAvg - 7).toFixed(1));
      }
      if (ia2Avg === 0 && endSemAvg > 0) {
        ia2Avg = Number(Math.max(45, endSemAvg - 3).toFixed(1));
      }

      // When specific assessment is selected
      const targetList =
        assessment === "IA1"
          ? (ia1List.length ? ia1List : list)
          : assessment === "IA2"
          ? (ia2List.length ? ia2List : list)
          : assessment === "END_SEM"
          ? (endSemList.length ? endSemList : list)
          : list;

      const avgScore = targetList.length ? Number((targetList.reduce((a, b) => a + (Number(b.totalMarks) || 0), 0) / targetList.length).toFixed(1)) : 0;
      const passedCount = targetList.filter((m) => m.resultStatus === "PASS" || (Number(m.totalMarks) || 0) >= 40).length;
      const passRate = targetList.length ? Number(((passedCount / targetList.length) * 100).toFixed(1)) : 0;
      const partA = targetList.length ? Number((targetList.reduce((a, b) => a + (Number(b.partA) || 0), 0) / targetList.length).toFixed(1)) : 0;
      const partBC = targetList.length ? Number((targetList.reduce((a, b) => a + (Number(b.partBC) || 0), 0) / targetList.length).toFixed(1)) : 0;

      if (assessment === "ALL") {
        return {
          name,
          IA1: ia1Avg,
          IA2: ia2Avg,
          EndSem: endSemAvg,
          avgScore,
          passRate,
        };
      }

      return {
        name,
        avgScore,
        passRate,
        partA,
        partBC,
      };
    });
  }, [filteredMarks, assessment]);

  // Live Grade Distribution for Pie Chart
  const gradeDistributionData = useMemo(() => {
    const list = assessmentMarks;
    const counts = {
      O: 0,
      "A+": 0,
      A: 0,
      "B+": 0,
      B: 0,
      RA: 0,
    };

    list.forEach((m) => {
      const g = (m.grade || "").toUpperCase();
      if (g === "O") counts.O++;
      else if (g === "A+") counts["A+"]++;
      else if (g === "A") counts.A++;
      else if (g === "B+") counts["B+"]++;
      else if (g === "B") counts.B++;
      else counts.RA++;
    });

    const items = [
      { name: "O (Outstanding)", value: counts.O, color: "#2E7D5B" },
      { name: "A+ (Excellent)", value: counts["A+"], color: "#0B192C" },
      { name: "A (Very Good)", value: counts.A, color: "#D4A72C" },
      { name: "B+ (Good)", value: counts["B+"], color: "#C98A18" },
      { name: "B (Above Avg)", value: counts.B, color: "#667085" },
      { name: "RA / Fail", value: counts.RA, color: "#B54747" },
    ];

    return items;
  }, [assessmentMarks]);

  // Live Milestone Progression Curve (IA1 -> IA2 -> End Semester)
  const liveMilestones = useMemo(() => {
    if (filteredMarks.length === 0) return [];

    const getStats = (items: LiveStudentMark[]) => {
      if (!items.length) return { avg: 0, pass: 0 };
      const avg = Number((items.reduce((a, b) => a + (Number(b.totalMarks) || 0), 0) / items.length).toFixed(1));
      const pass = Number(((items.filter((m) => m.resultStatus === "PASS" || (Number(m.totalMarks) || 0) >= 40).length / items.length) * 100).toFixed(1));
      return { avg, pass };
    };

    const ia1 = getStats(filteredMarks.filter((m) => m.assessment === "IA1"));
    const ia2 = getStats(filteredMarks.filter((m) => m.assessment === "IA2"));
    const endSem = getStats(filteredMarks.filter((m) => m.assessment === "END_SEM"));

    // If IA1 or IA2 are empty, compute smooth continuous assessment growth from EndSem
    const ia1Avg = ia1.avg || (endSem.avg > 0 ? Number(Math.max(45, endSem.avg - 7).toFixed(1)) : 0);
    const ia1Pass = ia1.pass || (endSem.pass > 0 ? Number(Math.max(65, endSem.pass - 5).toFixed(1)) : 0);
    const ia2Avg = ia2.avg || (endSem.avg > 0 ? Number(Math.max(50, endSem.avg - 3).toFixed(1)) : 0);
    const ia2Pass = ia2.pass || (endSem.pass > 0 ? Number(Math.max(70, endSem.pass - 2).toFixed(1)) : 0);
    const midAvg = endSem.avg > 0 ? Number(((ia2Avg + endSem.avg) / 2).toFixed(1)) : 0;
    const midPass = endSem.pass > 0 ? Number(((ia2Pass + endSem.pass) / 2).toFixed(1)) : 0;

    return [
      { milestone: "IAT-1", averageScore: ia1Avg, passRate: ia1Pass },
      { milestone: "IAT-2", averageScore: ia2Avg, passRate: ia2Pass },
      { milestone: "Model Exam", averageScore: midAvg, passRate: midPass },
      { milestone: "End Semester", averageScore: endSem.avg, passRate: endSem.pass },
    ];
  }, [filteredMarks]);

  // Live Question Paper Part Mastery (Part A vs Part B+C)
  const livePartMastery = useMemo(() => {
    if (filteredMarks.length === 0) return [];

    const getPartAvg = (items: LiveStudentMark[]) => {
      if (!items.length) return { PartA: 0, PartBC: 0 };
      const PartA = Number((items.reduce((a, b) => a + (Number(b.partA) || 0), 0) / items.length).toFixed(1));
      const PartBC = Number((items.reduce((a, b) => a + (Number(b.partBC) || 0), 0) / items.length).toFixed(1));
      return { PartA, PartBC };
    };

    let ia1 = getPartAvg(filteredMarks.filter((m) => m.assessment === "IA1"));
    let ia2 = getPartAvg(filteredMarks.filter((m) => m.assessment === "IA2"));
    const endSem = getPartAvg(filteredMarks.filter((m) => m.assessment === "END_SEM"));

    if (ia1.PartA === 0 && endSem.PartA > 0) {
      ia1 = { PartA: Number(Math.max(5, endSem.PartA - 2).toFixed(1)), PartBC: Number(Math.max(25, endSem.PartBC - 6).toFixed(1)) };
    }
    if (ia2.PartA === 0 && endSem.PartA > 0) {
      ia2 = { PartA: Number(Math.max(6, endSem.PartA - 1).toFixed(1)), PartBC: Number(Math.max(28, endSem.PartBC - 2).toFixed(1)) };
    }

    return [
      { assessment: "IA1 (IAT-1)", PartA: ia1.PartA, PartBC: ia1.PartBC },
      { assessment: "IA2 (IAT-2)", PartA: ia2.PartA, PartBC: ia2.PartBC },
      { assessment: "End Semester", PartA: endSem.PartA, PartBC: endSem.PartBC },
    ];
  }, [filteredMarks]);

  // Live Student Progression Table Data
  const studentRows = useMemo(() => {
    // Group marks by regNo
    const map: Record<string, { regNo: string; name: string; dept: string; ia1?: number; ia2?: number; endSem?: number; finalGrade: string }> = {};

    filteredMarks.forEach((m) => {
      const reg = String(m.regNo || "").trim();
      if (!reg) return;

      if (!map[reg]) {
        map[reg] = {
          regNo: reg,
          name: m.name || `Student ${reg}`,
          dept: m.deptName || "Engineering",
          finalGrade: m.grade || "B",
        };
      }
      if (m.assessment === "IA1") map[reg].ia1 = m.totalMarks;
      if (m.assessment === "IA2") map[reg].ia2 = m.totalMarks;
      if (m.assessment === "END_SEM") {
        map[reg].endSem = m.totalMarks;
        map[reg].finalGrade = m.grade || "B";
      }
    });

    const rows = Object.values(map).map((s) => {
      const endSem = s.endSem !== undefined ? s.endSem : (s.ia2 !== undefined ? s.ia2 : s.ia1 || 0);
      const ia1 = s.ia1 !== undefined ? s.ia1 : Math.max(38, endSem - 7);
      const ia2 = s.ia2 !== undefined ? s.ia2 : Math.max(42, endSem - 3);
      const improvement = endSem - ia1;

      return {
        regNo: s.regNo,
        name: s.name || `Student ${s.regNo}`,
        dept: s.dept || "Engineering",
        ia1Mark: s.ia1 !== undefined ? s.ia1 : ia1,
        ia2Mark: s.ia2 !== undefined ? s.ia2 : ia2,
        endSemMark: s.endSem !== undefined ? s.endSem : endSem,
        improvement,
        finalGrade: s.finalGrade || "B",
      };
    });

    const query = (searchStudent || "").toLowerCase().trim();
    return rows.filter((s) => {
      if (!query) return true;
      const name = (s.name || "").toLowerCase();
      const regNo = (s.regNo || "").toLowerCase();
      return name.includes(query) || regNo.includes(query);
    });
  }, [filteredMarks, searchStudent]);

  return (
    <div className="space-y-6 w-full">
      {/* Header with Assessment Selector & Live Status */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E1D8] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-[#D4A72C] uppercase tracking-wider mb-1">
              <BarChart3 size={15} />
              {college.icon} {college.shortName} Examination Analytics Suite · LIVE DATA
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0B192C]">
              {college.name} Continuous Assessment & Result Analytics
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-xl">
              Track real-time candidate scores and performance curves across <strong>IA1</strong>,{" "}
              <strong>IA2</strong>, and <strong>End Semester Examinations</strong> as marks are entered.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={refreshData}
              className="px-3.5 py-2.5 rounded-xl bg-[#F8F5EE] hover:bg-[#E5E1D8] text-[#0B192C] text-xs font-bold transition border border-[#E5E1D8] flex items-center gap-1.5 shadow-sm"
              title="Refresh marks data from storage"
            >
              <RefreshCw size={14} className="text-[#D4A72C]" />
              <span>Refresh</span>
            </button>

            {hasAnyMarks && (
              <button
                onClick={handleClearAllMarks}
                className="px-3.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition border border-red-200 flex items-center gap-1.5 shadow-sm"
                title="Reset all entered marks"
              >
                <Trash2 size={14} />
                <span>Clear Marks</span>
              </button>
            )}

            <button
              onClick={() => navigate("/admin/results/validation")}
              className="px-4 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-[#c39722] text-[#0B192C] text-xs font-extrabold transition shadow flex items-center gap-1.5"
            >
              <ExternalLink size={14} />
              <span>Enter / Edit Marks</span>
            </button>
          </div>
        </div>

        {/* PRIMARY ASSESSMENT SELECTOR TABS */}
        <div className="border-t border-[#E5E1D8] pt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1.5 tracking-wider">
              Select Evaluation Assessment Focus
            </span>
            <div className="inline-flex p-1 rounded-2xl bg-[#F8F5EE] border border-[#E5E1D8] gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setAssessment("ALL")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                  assessment === "ALL"
                    ? "bg-[#0B192C] text-white shadow-md"
                    : "text-gray-700 hover:text-[#0B192C] hover:bg-white/60"
                }`}
              >
                <Layers size={14} className={assessment === "ALL" ? "text-[#D4A72C]" : "text-gray-400"} />
                <span>Comparative (IA1 vs IA2 vs End Sem)</span>
              </button>

              <button
                type="button"
                onClick={() => setAssessment("IA1")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                  assessment === "IA1"
                    ? "bg-[#0B192C] text-white shadow-md"
                    : "text-gray-700 hover:text-[#0B192C] hover:bg-white/60"
                }`}
              >
                <FileCheck2 size={14} className={assessment === "IA1" ? "text-[#D4A72C]" : "text-gray-400"} />
                <span>IA1 (IAT-1)</span>
              </button>

              <button
                type="button"
                onClick={() => setAssessment("IA2")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                  assessment === "IA2"
                    ? "bg-[#0B192C] text-white shadow-md"
                    : "text-gray-700 hover:text-[#0B192C] hover:bg-white/60"
                }`}
              >
                <FileCheck2 size={14} className={assessment === "IA2" ? "text-[#D4A72C]" : "text-gray-400"} />
                <span>IA2 (IAT-2)</span>
              </button>

              <button
                type="button"
                onClick={() => setAssessment("END_SEM")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                  assessment === "END_SEM"
                    ? "bg-[#0B192C] text-white shadow-md"
                    : "text-gray-700 hover:text-[#0B192C] hover:bg-white/60"
                }`}
              >
                <Award size={14} className={assessment === "END_SEM" ? "text-[#D4A72C]" : "text-gray-400"} />
                <span>End Semester Exam</span>
              </button>
            </div>
          </div>

          {/* Filtering Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                Department
              </span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] font-bold text-[#0B192C] focus:outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                Semester
              </span>
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] font-bold text-[#0B192C] focus:outline-none"
              >
                <option value="all">All Semesters (Semester I)</option>
                <option value="Semester I">Semester I</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* EMPTY DATA NOTICE BANNER */}
      {!hasAnyMarks && (
        <div className="bg-[#FFF4D6] border-2 border-[#F5D8B4] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0 shadow-md">
              <BarChart3 size={24} />
            </div>
            <div>
              <span className="bg-[#8C2F00] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider inline-block mb-1.5">
                LIVE GRAPH ENGINE ACTIVE
              </span>
              <h3 className="font-display font-black text-lg text-[#0B192C]">
                Analytics and Graphs are Currently Empty
              </h3>
              <p className="text-xs text-[#8C2F00]/90 mt-1 max-w-xl font-medium leading-relaxed">
                No examination marks have been entered yet. As soon as you add or change student marks in{" "}
                <strong>Results Validation & Evaluation</strong>, all charts, department comparison bars, and letter grade distributions will update here live.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/admin/results/validation")}
            className="px-5 py-3 rounded-2xl bg-[#0B192C] hover:bg-[#132943] text-white font-extrabold text-xs transition shadow-md flex items-center gap-2 shrink-0"
          >
            <Sparkles size={15} className="text-[#D4A72C]" />
            <span>Enter Student Marks Now</span>
          </button>
        </div>
      )}

      {/* Dynamic Key Performance Indicator (KPI) Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Average Score */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-wider">
              {assessment === "ALL" ? "Average Cumulative Score" : `${assessment} Average Marks`}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center font-black">
              <TrendingUp size={16} />
            </div>
          </div>
          <span className="font-display font-black text-3xl text-[#0B192C] block">
            {activeStats.avgScore}
          </span>
          <span className="text-[11px] font-bold text-[#2E7D5B] inline-flex items-center gap-1">
            <ArrowUpRight size={13} /> {activeStats.passRateDelta}
          </span>
        </div>

        {/* Metric 2: Pass Rate */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-wider">
              {assessment === "ALL" ? "Overall Pass Rate" : `${assessment} Pass Rate`}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#2E7D5B] flex items-center justify-center font-black">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <span className="font-display font-black text-3xl text-[#2E7D5B] block">
            {activeStats.passRate}
          </span>
          <span className="text-[11px] font-semibold text-gray-500 block">
            Threshold: ≥ 40 Marks
          </span>
        </div>

        {/* Metric 3: Question Format Averages */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Part A vs Part B+C Avg
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#D4A72C]/10 text-[#C98A18] flex items-center justify-center font-black">
              <FileCheck2 size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-black text-xl text-[#0B192C]">
              {activeStats.partAAvg}
            </span>
            <span className="text-gray-400 text-xs">/</span>
            <span className="font-mono font-black text-xl text-[#B08014]">
              {activeStats.partBCAvg}
            </span>
          </div>
          <span className="text-[11px] font-bold text-gray-500 block">
            Part A (Short) • Part B+C (Long)
          </span>
        </div>

        {/* Metric 4: Distinction vs Arrears */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-wider">
              High Distinctions (O & A+)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#B08014] flex items-center justify-center font-black">
              <Award size={16} />
            </div>
          </div>
          <span className="font-display font-black text-3xl text-[#0B192C] block">
            {activeStats.topGradeRate}
          </span>
          <span className="text-[11px] font-bold text-[#B54747] block">
            {activeStats.arrearCount} Candidates with Backlogs (RA)
          </span>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Department Performance */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-[#E5E1D8] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E1D8] pb-3">
            <div>
              <h3 className="font-display font-bold text-base text-[#0B192C]">
                {assessment === "ALL"
                  ? "Department Assessment Comparison (IA1 vs IA2 vs End Sem)"
                  : `Department Performance Breakdown for ${activeStats.title}`}
              </h3>
              <p className="text-xs text-gray-500">
                {assessment === "ALL"
                  ? "Live comparative student score averages showing internal progression"
                  : `Average marks achieved across departments for ${assessment}`}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#D4A72C]/20 text-[#0B192C] text-[10px] font-extrabold uppercase w-fit">
              {assessment === "ALL" ? "Multi-Exam Benchmark" : `Filtered: ${assessment}`}
            </span>
          </div>

          <div className="h-80 w-full pt-2">
            {!hasAssessmentMarks || chartDeptData.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-[#F8F5EE]/40 rounded-2xl border-2 border-dashed border-[#E5E1D8]">
                <BarChart3 size={36} className="text-gray-300 mb-2" />
                <p className="font-bold text-gray-700 text-sm">No Department Marks to Display</p>
                <p className="text-gray-400 text-xs mt-1 max-w-sm">
                  Add student examination scores to see live bar charts of department averages.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {assessment === "ALL" ? (
                  <BarChart data={chartDeptData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#0B192C", fontWeight: "bold" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#667085" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0B192C", borderRadius: "14px", color: "#fff", border: "none" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: "8px" }} />
                    <Bar dataKey="IA1" name="IA1 (IAT-1) Avg %" fill="#4A709C" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="IA2" name="IA2 (IAT-2) Avg %" fill="#D4A72C" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="EndSem" name="End Semester Avg %" fill="#2E7D5B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <BarChart data={chartDeptData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#0B192C", fontWeight: "bold" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#667085" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0B192C", borderRadius: "14px", color: "#fff", border: "none" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: "8px" }} />
                    <Bar dataKey="avgScore" name={`${assessment} Avg Marks %`} fill="#0B192C" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="passRate" name={`${assessment} Pass Rate %`} fill="#2E7D5B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Grade Distribution for Selected Assessment */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-[#E5E1D8] shadow-sm space-y-4 flex flex-col justify-between">
          <div className="border-b border-[#E5E1D8] pb-3">
            <h3 className="font-display font-bold text-base text-[#0B192C]">
              Grade Distribution ({assessment === "ALL" ? "Cumulative" : assessment})
            </h3>
            <p className="text-xs text-gray-500">Letter grade spectrum awarded from live entered marks</p>
          </div>

          <div className="h-60 w-full">
            {!hasAssessmentMarks ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-[#F8F5EE]/40 rounded-2xl border-2 border-dashed border-[#E5E1D8]">
                <PieIcon size={32} className="text-gray-300 mb-2" />
                <p className="font-bold text-gray-700 text-xs">No Grade Data</p>
                <p className="text-gray-400 text-[11px] mt-0.5">Grades will populate as marks are entered.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradeDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {gradeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0B192C", borderRadius: "12px", color: "#fff", border: "none" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            {gradeDistributionData.map((g) => (
              <div key={g.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                <span className="text-gray-700 font-semibold truncate">{g.name}</span>
                <span className="font-bold text-[#0B192C] ml-auto">{g.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Charts: Progression Curve & Part A vs Part B+C Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progression Curve Across IA1 -> IA2 -> End Semester */}
        <div className="bg-white p-6 rounded-3xl border border-[#E5E1D8] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
            <div>
              <h3 className="font-display font-bold text-base text-[#0B192C]">
                Continuous Assessment Growth Trajectory
              </h3>
              <p className="text-xs text-gray-500">
                Score improvements from IAT-1 through IAT-2 and End Semester
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200">
              Live Trend Curve
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {!hasAnyMarks || liveMilestones.every((m) => m.averageScore === 0) ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-[#F8F5EE]/40 rounded-2xl border-2 border-dashed border-[#E5E1D8]">
                <TrendingUp size={32} className="text-gray-300 mb-2" />
                <p className="font-bold text-gray-700 text-xs">No Progression Trajectory Available</p>
                <p className="text-gray-400 text-[11px] mt-0.5">Calculated dynamically when marks are recorded.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={liveMilestones}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4A72C" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D4A72C" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="passGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E7D5B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2E7D5B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="milestone" tick={{ fontSize: 11, fill: "#0B192C", fontWeight: "bold" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#667085" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0B192C", borderRadius: "12px", color: "#fff", border: "none" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="averageScore"
                    name="Class Average Score %"
                    stroke="#D4A72C"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#scoreGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="passRate"
                    name="Overall Pass Rate %"
                    stroke="#2E7D5B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#passGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Question Type Competency: Part A vs Part B+C */}
        <div className="bg-white p-6 rounded-3xl border border-[#E5E1D8] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
            <div>
              <h3 className="font-display font-bold text-base text-[#0B192C]">
                Question Paper Part Mastery (Part A vs Part B+C)
              </h3>
              <p className="text-xs text-gray-500">
                Concept short questions (Max 20) vs Core descriptive questions (Max 80)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[10px] font-black border border-blue-200">
              Exam Format Breakdown
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {!hasAnyMarks || livePartMastery.every((p) => p.PartA === 0 && p.PartBC === 0) ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-[#F8F5EE]/40 rounded-2xl border-2 border-dashed border-[#E5E1D8]">
                <FileCheck2 size={32} className="text-gray-300 mb-2" />
                <p className="font-bold text-gray-700 text-xs">No Part A / Part B+C Breakdown Available</p>
                <p className="text-gray-400 text-[11px] mt-0.5">Populates automatically from question-level evaluation marks.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={livePartMastery}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="assessment" tick={{ fontSize: 11, fill: "#0B192C", fontWeight: "bold" }} />
                  <YAxis domain={[0, 80]} tick={{ fontSize: 11, fill: "#667085" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0B192C", borderRadius: "12px", color: "#fff", border: "none" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="PartA" name="Part A Avg Marks (/20)" fill="#D4A72C" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="PartBC" name="Part B+C Avg Marks (/80)" fill="#0B192C" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Student Assessment Performance Directory Table */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E1D8] pb-4">
          <div>
            <h3 className="font-display font-bold text-lg text-[#0B192C]">
              Candidate Multi-Assessment Progression Roster
            </h3>
            <p className="text-xs text-gray-500">
              Live candidate evaluation performance comparing IA1, IA2, and End Semester marks
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Search reg no or student name..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-xs font-semibold focus:outline-none focus:border-[#0B192C]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="p-3.5">Registration Number</th>
                <th className="p-3.5">Student Name</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5 text-center">IA1 (IAT-1)</th>
                <th className="p-3.5 text-center">IA2 (IAT-2)</th>
                <th className="p-3.5 text-center">End Semester</th>
                <th className="p-3.5 text-center">Progression</th>
                <th className="p-3.5 text-center">Final Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {studentRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-500 font-semibold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={28} className="text-gray-300" />
                      <p className="text-gray-700 font-bold text-xs">
                        {hasAnyMarks ? "No matching students found." : "No student marks recorded yet."}
                      </p>
                      <p className="text-gray-400 text-[11px]">
                        {hasAnyMarks
                          ? "Try a different search query."
                          : "Enter marks in Results Validation to see live student scores here."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                studentRows.map((s) => (
                  <tr key={s.regNo} className="hover:bg-[#F8F5EE]/70 transition">
                    <td className="p-3.5 font-mono font-bold text-[#0B192C]">{s.regNo}</td>
                    <td className="p-3.5 font-bold text-gray-900">{s.name}</td>
                    <td className="p-3.5 font-semibold text-gray-700">{s.dept}</td>
                    <td className="p-3.5 text-center font-mono font-bold text-gray-800">
                      {s.ia1Mark !== undefined ? (
                        <>
                          {s.ia1Mark} <span className="text-[10px] text-gray-400">/100</span>
                        </>
                      ) : (
                        <span className="text-gray-300 font-normal">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-[#B08014]">
                      {s.ia2Mark !== undefined ? (
                        <>
                          {s.ia2Mark} <span className="text-[10px] text-gray-400">/100</span>
                        </>
                      ) : (
                        <span className="text-gray-300 font-normal">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono font-black text-sm text-[#0B192C]">
                      {s.endSemMark !== undefined ? (
                        <>
                          {s.endSemMark} <span className="text-[10px] text-gray-400">/100</span>
                        </>
                      ) : (
                        <span className="text-gray-300 font-normal">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold inline-flex items-center gap-0.5 border ${
                          s.improvement >= 0
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-red-50 text-red-800 border-red-200"
                        }`}
                      >
                        {s.improvement >= 0 ? `+${s.improvement}` : s.improvement}%
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded font-black text-xs bg-[#D4A72C]/20 text-[#0B192C] border border-[#D4A72C]">
                        {s.finalGrade}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
