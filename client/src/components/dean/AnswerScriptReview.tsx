import React from "react";
import { partACo, partBCCo } from "../../utils/coMapping";

/**
 * The Dean's view-only copy of an evaluated answer script (laid out like the faculty Mark Entry sheet, without any
 * inputs), and the printable statement of marks with signature spaces for the examiners and the camp officer.
 */

export interface Sub {
  i: number | null;
  ii: number | null;
  iii: number | null;
}

/** One row of GET /admin/marks (the Mark Entry roster). */
export interface StudentMark {
  regNo: string;
  name: string;
  hasMarks: boolean;
  partATotal: number;
  partBCTotal: number;
  grandTotal: number;
  grade: string | null;
  resultStatus: string | null;
  partA: (number | null)[];
  partBC: Record<string, { a: Sub; b: Sub }>;
  assessmentType: string;
  deptName: string;
  semester: string;
  subjectCode: string;
  subjectTitle: string;
  examinerName: string | null;
  examinerDesignation: string | null;
}

const ONES = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN",
  "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
const TENS = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

/** 78 -> "SEVENTY EIGHT", 100 -> "ONE HUNDRED" (whole marks, 0 - 999). */
export function marksInWords(n: number): string {
  const v = Math.max(0, Math.round(n));
  if (v < 20) return ONES[v];
  if (v < 100) return TENS[Math.floor(v / 10)] + (v % 10 ? " " + ONES[v % 10] : "");
  return ONES[Math.floor(v / 100)] + " HUNDRED" + (v % 100 ? " " + marksInWords(v % 100) : "");
}

const num = (v: number | null | undefined) => Number(v) || 0;
const subTotal = (s: Sub) => num(s.i) + num(s.ii) + num(s.iii);
const shown = (v: number | null | undefined) => (num(v) === 0 ? "–" : String(v));

const cell = "p-1.5 border-r border-red-900/40";
const head = "bg-red-950 text-white font-black text-xs text-center py-2 uppercase tracking-wider";

function PartBCTable({ title, questions, m }: { title: string; questions: number[]; m: StudentMark }) {
  return (
    <div className="border-2 border-red-900/60 rounded-xl overflow-hidden bg-white">
      <div className={head}>{title}</div>
      <table className="w-full text-center text-xs divide-y divide-red-900/40">
        <thead className="bg-red-50 text-red-950 font-extrabold text-[10px] uppercase">
          <tr>
            {["Q. No", "Sub", "i", "ii", "iii", "Q. Total"].map((h) => (
              <th key={h} className="p-2 border-r border-red-900/40">{h}</th>
            ))}
            <th className="p-2">CO</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-red-900/30">
          {questions.map((q) => {
            const d = m.partBC[String(q)] ?? { a: { i: 0, ii: 0, iii: 0 }, b: { i: 0, ii: 0, iii: 0 } };
            const total = Math.max(subTotal(d.a), subTotal(d.b));
            return (["a", "b"] as const).map((choice, k) => (
              <tr key={q + choice}>
                {k === 0 && <td rowSpan={2} className={`${cell} font-extrabold text-red-900 bg-red-50/20`}>{q}</td>}
                <td className={`${cell} font-bold text-gray-700`}>{choice}</td>
                <td className={`${cell} font-bold`}>{shown(d[choice].i)}</td>
                <td className={`${cell} font-bold`}>{shown(d[choice].ii)}</td>
                <td className={`${cell} font-bold`}>{shown(d[choice].iii)}</td>
                {k === 0 && <td rowSpan={2} className={`${cell} font-black text-[#0B192C] bg-red-50/40`}>{total}</td>}
                {k === 0 && <td rowSpan={2} className="p-1.5 font-extrabold text-[10px] bg-[#D4A72C]/15">{partBCCo(m.assessmentType, q)}</td>}
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The faculty Mark Entry sheet of one student, as text only (nothing can be changed). */
export function ReadOnlyMarkSheet({ m }: { m: StudentMark }) {
  const q16 = m.partBC["16"];
  const partC = q16 ? Math.max(subTotal(q16.a), subTotal(q16.b)) : 0;
  return (
    <div className="border-2 border-red-900/60 rounded-2xl p-4 bg-[#FFFCF7] text-[#0B192C] space-y-4">
      <div className="border border-red-900/60 divide-y divide-red-900/60 text-xs">
        {[
          ["Registration number", m.regNo, "Name", m.name],
          ["Semester", m.semester, "Assessment", m.assessmentType],
          ["Subject code / title", `${m.subjectCode} • ${m.subjectTitle}`, "Department", m.deptName],
        ].map(([l1, v1, l2, v2]) => (
          <div key={l1} className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-red-900/60">
            <div className="p-2.5 flex items-center justify-between gap-2">
              <span className="font-extrabold uppercase text-[10px] text-red-900">{l1}</span>
              <span className="font-bold text-right">{v1}</span>
            </div>
            <div className="p-2.5 flex items-center justify-between gap-2">
              <span className="font-extrabold uppercase text-[10px] text-red-900">{l2}</span>
              <span className="font-bold text-right">{v2}</span>
            </div>
          </div>
        ))}
      </div>

      {!m.hasMarks ? (
        <p className="py-10 text-center text-xs font-bold text-gray-500">The faculty has not entered marks for this script yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 border-2 border-red-900/60 rounded-xl overflow-hidden bg-white">
              <div className={head}>PART - A (Max 20)</div>
              <table className="w-full text-center text-xs divide-y divide-red-900/40">
                <thead className="bg-red-50 text-red-950 font-extrabold text-[10px] uppercase">
                  <tr>
                    <th className="p-2 border-r border-red-900/40">Q. No</th>
                    <th className="p-2 border-r border-red-900/40">Marks</th>
                    <th className="p-2">CO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-900/30">
                  {Array.from({ length: 10 }, (_, i) => (
                    <tr key={i}>
                      <td className={`${cell} font-extrabold text-red-900`}>{i + 1}</td>
                      <td className={`${cell} font-bold`}>{shown(m.partA[i])}</td>
                      <td className="p-1.5 font-extrabold text-[10px] bg-[#D4A72C]/15">{partACo(m.assessmentType, i + 1)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-red-100 text-red-950 font-black">
                  <tr>
                    <td className="p-2 border-r border-red-900/40 uppercase text-[10px]">Total</td>
                    <td className="p-2 border-r border-red-900/40 font-mono text-sm">{m.partATotal}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="lg:col-span-8 space-y-4">
              <PartBCTable title="PART - B (Questions 11 - 15)" questions={[11, 12, 13, 14, 15]} m={m} />
              <PartBCTable title="PART - C (Question 16)" questions={[16]} m={m} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
            {[
              ["Part A", m.partATotal],
              ["Part B", Math.round((m.partBCTotal - partC) * 10) / 10],
              ["Part C", partC],
              ["Grand total (A + B + C)", `${m.grandTotal} / 100`],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-red-900/40 bg-white p-2.5">
                <div className="text-[10px] font-extrabold uppercase text-red-900">{l}</div>
                <div className="text-lg font-black">{v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-red-900/40 bg-white p-3 text-xs flex flex-wrap justify-between gap-2">
            <span><b className="text-red-900 uppercase text-[10px]">In words: </b>{marksInWords(m.grandTotal)}</span>
            <span><b className="text-red-900 uppercase text-[10px]">Examiner: </b>{m.examinerName ?? "—"}{m.examinerDesignation ? `, ${m.examinerDesignation}` : ""}</span>
          </div>
        </>
      )}
    </div>
  );
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Opens the statement of marks for one subject and assessment in a new tab and starts printing: S.No, register
 * number, name, total marks and marks in words, then signature spaces for the Assistant Examiner, Examiner and Camp
 * Officer. Call it directly from a click, or the browser blocks the new tab.
 */
/** The university letterhead: KVELL logo, the college and university names, address, the college's logo. */
function letterhead(collegeKey: string | undefined, collegeName: string | undefined, origin: string): string {
  const key = collegeKey === "nursing" || collegeKey === "pharmacy" ? collegeKey : "engineering";
  const college =
    key === "engineering"
      ? "COLLEGE OF ENGINEERING AND TECHNOLOGY"
      : esc((collegeName ?? (key === "nursing" ? "College of Nursing" : "College of Pharmacy"))
          .replace(/^karpaga\s+vinayaga\s*/i, "").toUpperCase());
  const approval = key === "engineering"
    ? `<div class="lh-approval">(Approved by AICTE, New Delhi; Accredited by NAAC)</div>` : "";
  const contact = key === "engineering"
    ? "Phone: 044 &ndash; 7156 5297, E-mail: principal.kvcet@kveg.in; kvcet@live.com; Website: www.kveg.in"
    : "Phone: 044 &ndash; 7156 5297; Website: www.kveg.in";
  return `<table class="lh"><tr>
    <td class="lh-logo"><img src="${origin}/kvell-logo.png" alt="KVELL Deemed to be University"></td>
    <td class="lh-text">
      <div class="lh-big">KARPAGA VINAYAGA</div>
      <div class="lh-mid">${college}</div>
      ${approval}
      <div class="lh-big lh-gap">KARPAGA VINAYAGA</div>
      <div class="lh-big">EDUCATIONAL LORE FOR LEARNING</div>
      <div class="lh-mid">(Deemed to be University)</div>
      <div class="lh-addr">GST Road, Chinnakolambakkam, Padalam &ndash; 603 308, Madhuranthagam (TK), Chengalpattu District.</div>
      <div class="lh-addr">${contact}</div>
    </td>
    <td class="lh-logo"><img src="${origin}/${key}-logo.png" alt="College logo"></td>
  </tr></table>`;
}

export function printMarkStatement(info: {
  collegeKey?: string;
  collegeName?: string;
  department: string;
  semester: string;
  subjectCode: string;
  subjectTitle: string;
  assessment: string;
  rows: StudentMark[];
}): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  const rows = [...info.rows].sort((a, b) => a.regNo.localeCompare(b.regNo, undefined, { numeric: true }));
  const evaluated = rows.filter((r) => r.hasMarks).length;
  const body = rows
    .map(
      (r, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td class="c mono">${esc(r.regNo)}</td>
        <td>${esc(r.name)}</td>
        <td class="c b">${r.hasMarks ? r.grandTotal : "&ndash;"}</td>
        <td>${r.hasMarks ? marksInWords(r.grandTotal) : "NOT EVALUATED"}</td>
      </tr>`
    )
    .join("");
  const sign = (role: string) => `<div class="sig">
      <div class="line"></div>
      <div class="role">${role}</div>
      <div class="field">Name: ______________________</div>
      <div class="field">Date: ______________________</div>
    </div>`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>Statement of Marks - ${esc(info.subjectCode)} - ${esc(info.assessment)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 12mm 14mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table.lh { width: 100%; border-collapse: separate; border-spacing: 4px 0; margin: 0 -4px 6px; }
  table.lh td { border: 1.5px solid #000; vertical-align: middle; text-align: center; }
  .lh-logo { width: 31mm; padding: 4px; }
  .lh-logo img { display: block; margin: 0 auto; max-width: 27mm; max-height: 30mm; object-fit: contain; }
  .lh-text { padding: 5px 8px 6px; line-height: 1.15; }
  .lh-big { font-size: 18px; font-weight: 800; letter-spacing: 0.3px; }
  .lh-mid { font-size: 13.5px; font-weight: 700; margin-top: 2px; }
  .lh-approval { font-size: 8.5px; font-weight: 700; margin-top: 2px; }
  .lh-gap { margin-top: 6px; }
  .lh-addr { font-size: 8.5px; margin-top: 3px; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 11px; margin: 0; }
  .top { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
  .top h2 { font-size: 12px; margin: 2px 0 0; font-weight: bold; }
  .top h3 { font-size: 13px; margin: 6px 0 0; letter-spacing: 1px; }
  .meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .meta td { padding: 3px 4px; font-size: 11px; }
  .meta b { text-transform: uppercase; font-size: 10px; }
  table.marks { width: 100%; border-collapse: collapse; }
  table.marks th, table.marks td { border: 1px solid #000; padding: 4px 6px; }
  table.marks th { background: #eee; font-size: 10px; text-transform: uppercase; }
  table.marks thead { display: table-header-group; }
  table.marks tr { page-break-inside: avoid; }
  .c { text-align: center; } .b { font-weight: bold; } .mono { font-family: "Courier New", monospace; }
  .summary { margin-top: 8px; font-size: 11px; }
  .signs { display: flex; justify-content: space-between; gap: 18px; margin-top: 70px; page-break-inside: avoid; }
  .sig { flex: 1; text-align: center; }
  .sig .line { border-bottom: 1px solid #000; height: 48px; margin-bottom: 4px; }
  .sig .role { font-weight: bold; text-transform: uppercase; font-size: 11px; margin-bottom: 6px; }
  .sig .field { text-align: left; font-size: 10px; margin-top: 6px; }
  .foot { margin-top: 18px; font-size: 9px; color: #444; text-align: right; }
  @media screen { body { max-width: 210mm; margin: 12px auto; padding: 0 12px; } }
</style></head><body>
  ${letterhead(info.collegeKey, info.collegeName, window.location.origin)}
  <div class="top">
    <h2>Office of the Controller of Examinations</h2>
    <h3>STATEMENT OF MARKS</h3>
  </div>
  <table class="meta">
    <tr><td><b>Department:</b> ${esc(info.department)}</td><td><b>Semester:</b> ${esc(info.semester)}</td></tr>
    <tr><td><b>Subject:</b> ${esc(info.subjectCode)} &ndash; ${esc(info.subjectTitle)}</td><td><b>Assessment:</b> ${esc(info.assessment)}</td></tr>
  </table>
  <table class="marks">
    <thead><tr>
      <th style="width:7%">S.No</th><th style="width:20%">Register No.</th><th>Name of the Candidate</th>
      <th style="width:13%">Total Marks<br>(out of 100)</th><th style="width:26%">Marks in Words</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="summary">Total candidates: <b>${rows.length}</b> &nbsp;|&nbsp; Evaluated: <b>${evaluated}</b> &nbsp;|&nbsp; Not evaluated: <b>${rows.length - evaluated}</b></div>
  <div class="signs">${sign("Assistant Examiner")}${sign("Examiner")}${sign("Camp Officer")}</div>
  <div class="foot">Printed on ${esc(new Date().toLocaleString("en-IN"))}</div>
  <script>window.onload = function () { window.focus(); window.print(); };<\/script>
</body></html>`);
  w.document.close();
  return true;
}
