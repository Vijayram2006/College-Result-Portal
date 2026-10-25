/**
 * Statement of Marks for one subject and assessment, printed by the faculty after evaluation. Same layout as the
 * Dean's statement (university letterhead, S.No / register no. / name / total / marks in words, then signature
 * spaces for the Assistant Examiner, Examiner and Camp Officer); a student without marks is printed as ABSENT.
 */

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

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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

/**
 * Opens the statement in a new tab and starts printing. Call it directly from a click, or the browser blocks the
 * new tab; returns false when it was blocked.
 */
export function printMarkStatement(info: {
  collegeKey?: string;
  collegeName?: string;
  department: string;
  semester: string;
  subjectCode: string;
  subjectTitle: string;
  assessment: string;
  rows: { regNo: string; name: string; hasMarks: boolean; grandTotal: number }[];
  /** Anonymous evaluation: the rows carry dummy numbers instead of register numbers and names. */
  anonymous?: boolean;
}): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  const rows = [...info.rows].sort((a, b) => a.regNo.localeCompare(b.regNo, undefined, { numeric: true }));
  const present = rows.filter((r) => r.hasMarks).length;
  const body = rows
    .map(
      (r, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td class="c mono">${esc(r.regNo)}</td>
        <td>${esc(r.name)}</td>
        <td class="c b">${r.hasMarks ? r.grandTotal : "AB"}</td>
        <td${r.hasMarks ? "" : ' class="b"'}>${r.hasMarks ? marksInWords(r.grandTotal) : "ABSENT"}</td>
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
      <th style="width:7%">S.No</th><th style="width:20%">${info.anonymous ? "Dummy Number" : "Register No."}</th><th>${info.anonymous ? "Answer Script" : "Name of the Candidate"}</th>
      <th style="width:13%">Total Marks<br>(out of 100)</th><th style="width:26%">Marks in Words</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="summary">Total candidates: <b>${rows.length}</b> &nbsp;|&nbsp; Present: <b>${present}</b> &nbsp;|&nbsp; Absent: <b>${rows.length - present}</b></div>
  <div class="signs">${sign("Assistant Examiner")}${sign("Examiner")}${sign("Camp Officer")}</div>
  <div class="foot">Printed on ${esc(new Date().toLocaleString("en-IN"))}</div>
</body></html>`);
  w.document.close();
  // Printed from here, not by a script in the page: the site's Content-Security-Policy blocks inline scripts.
  // The logos are waited for so they are on the paper.
  const images = Array.from(w.document.images);
  Promise.all(images.map((img) => (img.complete ? null : new Promise((done) => { img.onload = img.onerror = done; }))))
    .then(() => {
      w.focus();
      w.print();
    });
  return true;
}
