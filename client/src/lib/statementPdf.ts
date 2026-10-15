/** Statement of Marks as a PDF, built in the browser from the published marks the server sent. */

export interface StatementCourse {
  code: string;
  title: string;
  credits: number | string;
  total: number | string;
  grade: string;
  status: string;
}

export interface StatementData {
  studentName: string;
  regNo: string;
  program: string;
  semesterLabel: string;
  academicYear: string;
  examMonthYear: string;
  assessmentType: string;
  courses: StatementCourse[];
  totalMarks: number | string;
  maxMarks: number | string;
  /** Internal assessments (IAT) carry no credits, SGPA or CGPA */
  internal: boolean;
  earnedCredits?: number | string;
  totalCredits?: number | string;
  sgpa?: string;
  cgpa?: string;
  overallResult?: string;
  result: string;
}

const NAVY: [number, number, number] = [11, 25, 44];
const GOLD: [number, number, number] = [212, 167, 44];

async function imageAsDataUrl(src: string): Promise<string | null> {
  try {
    const blob = await (await fetch(src)).blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadStatementPdf(d: StatementData): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 32, pageW, 1.5, "F");
  const logo = await imageAsDataUrl("/kvell-logo.png");
  if (logo) doc.addImage(logo, "PNG", margin, 5, 22, 22);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("KVELL UNIVERSITY", margin + 27, 15);
  doc.setTextColor(...GOLD);
  doc.setFontSize(10);
  doc.text("OFFICE OF THE CONTROLLER OF EXAMINATIONS", margin + 27, 21);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(`STATEMENT OF MARKS - ${d.assessmentType.toUpperCase()}`, margin + 27, 27);

  // Student details
  doc.setTextColor(...NAVY);
  doc.setFontSize(10);
  const details: [string, string][] = [
    ["Student Name", d.studentName],
    ["Register Number", d.regNo],
    ["Program", d.program],
    ["Semester", `${d.semesterLabel} (Academic Year ${d.academicYear})`],
    ["Examination", d.examMonthYear],
  ];
  let y = 43;
  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${value ?? "-"}`, margin + 34, y);
    y += 6;
  });

  // Marks table
  autoTable(doc, {
    startY: y + 2,
    margin: { left: margin, right: margin },
    head: [["Course Code", "Course Title", "Credits", "Marks", "Grade", "Result"]],
    body: d.courses.map((c) => [c.code, c.title, String(c.credits), String(c.total), c.grade, c.status]),
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 245, 238] },
    styles: { fontSize: 9, cellPadding: 2.2 },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: "bold" },
      2: { halign: "center", cellWidth: 16 },
      3: { halign: "center", cellWidth: 16 },
      4: { halign: "center", cellWidth: 15 },
      5: { halign: "center", cellWidth: 18 },
    },
    didParseCell: (cell) => {
      if (cell.section === "body" && cell.column.index === 5) {
        cell.cell.styles.textColor = cell.cell.raw === "FAIL" ? [185, 28, 28] : [4, 120, 87];
        cell.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Summary
  const summary: [string, string][] = [["Total Marks", `${d.totalMarks} / ${d.maxMarks}`]];
  if (!d.internal) {
    summary.push(
      ["Credits", `${d.earnedCredits ?? "-"} earned of ${d.totalCredits ?? "-"}`],
      ["Semester SGPA", d.sgpa ?? "-"],
      ["Cumulative CGPA", d.cgpa ?? "-"],
      ["Overall Result", d.overallResult ?? "-"]
    );
  }
  summary.push(["Result", d.result]);
  autoTable(doc, {
    startY: ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 6,
    margin: { left: margin },
    tableWidth: 95,
    body: summary,
    theme: "grid",
    styles: { fontSize: 9.5, cellPadding: 2.2 },
    columnStyles: { 0: { fontStyle: "bold", fillColor: [248, 245, 238], cellWidth: 40 } },
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GOLD);
    doc.line(margin, pageH - 16, pageW - margin, pageH - 16);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Downloaded on ${new Date().toLocaleString("en-IN")} from the KVELL Result Portal. Provisional copy; not valid as an official grade card.`,
      margin,
      pageH - 11
    );
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 6, { align: "right" });
  }

  doc.save(`KVELL_Statement_of_Marks_${d.regNo}_${d.assessmentType.replace(/\s+/g, "_")}.pdf`);
}
