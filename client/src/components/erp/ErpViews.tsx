import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Download, Loader2, Paperclip, Plus, Trash2, X } from "lucide-react";
import { apiClient, apiErrorMessage, authApi } from "../../services/api";
import { letterhead } from "../dean/AnswerScriptReview";

/**
 * KVELL ERP screens for the team's components: leave (apply and approve), My Class (class in-charge), logbook &
 * subject completion, class in-charge assignment (HOD), faculty performance and student fees. Every rule (who
 * approves, who sees what, edit windows, maker-checker) is checked on the server too.
 */

// ---------------------------------------------------------------- shared

const card = "bg-white rounded-3xl border border-slate-200 shadow-sm";
const input = "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A72C]";
const btn = "px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] text-xs font-black inline-flex items-center gap-1.5 disabled:opacity-40";
const th = "text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-500";
const td = "px-4 py-2.5";
const inr = (n: number | null | undefined) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const SEMESTERS = ["Semester I", "Semester II", "Semester III", "Semester IV", "Semester V", "Semester VI", "Semester VII", "Semester VIII"];

function useLoad<T>(path: string | null, params?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(params || {});
  const load = React.useCallback(() => {
    if (!path) return;
    apiClient.get<T>(path, { params }).then((r) => { setData(r.data); setError(null); })
      .catch((e) => setError(apiErrorMessage(e, "Could not load.")));
  }, [path, key]);
  useEffect(load, [load]);
  return { data, error, reload: load };
}

function Loading({ error }: { error: string | null }) {
  return error
    ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
    : <div className="p-10 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
}

function Title({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return (
    <div className={`${card} p-6 flex flex-wrap items-start justify-between gap-3`}>
      <div>
        <h1 className="text-xl font-black text-[#0B192C]">{title}</h1>
        <p className="text-xs text-slate-600 mt-1 max-w-3xl">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: [T, string][] }) {
  return (
    <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
      {tabs.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`px-4 py-2 rounded-xl text-xs font-black transition ${value === k ? "bg-[#0B192C] text-[#D4A72C] shadow" : "text-slate-600 hover:bg-white"}`}>{l}</button>
      ))}
    </div>
  );
}

async function openFile(path: string) {
  try {
    const res = await apiClient.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    alert(apiErrorMessage(e, "The file could not be opened."));
  }
}

const statusTone: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800", APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800", CANCELLED: "bg-slate-100 text-slate-600",
};

// ---------------------------------------------------------------- leave

type LeaveType = { code: string; name: string; yearlyDays: number | null; needsAttachment: boolean; used: number; remaining: number | null };
type Leave = {
  id: number; applicant: string; applicantRole: string; regNo: string | null; deptKey: string; leaveCode: string; leaveName: string;
  fromDate: string; toDate: string; halfDay: string | null; days: number; reason: string; hasAttachment: boolean; approverRole: string;
  status: string; decidedBy: string | null; decidedAt: string | null; decisionRemarks: string | null; createdAt: string;
  substitutions: { date: string; subjectCode: string; substitute: string }[];
  fromTime: string | null; toTime: string | null; hours: number | null;
  forwardedBy: string | null; forwardedRole: string | null; forwardedAt: string | null; forwardRemarks: string | null;
};
type LeaveForm = { leave: Leave; applicantName: string; username: string; designation: string; deptName: string; collegeName: string;
  allowed: number | null; usedThisYear: number; steps: { action: string; actor: string; remarks: string | null; at: string }[] };
const approverLabel: Record<string, string> = { CLASS_INCHARGE: "Class in-charge", HOD: "HOD", ASSOCIATE_DEAN: "Associate Dean", DEAN: "Dean" };
const PERMISSION = "PERM";

/** The approval step of the signed-in user (matches the server's approver_role). */
function myStage(): string {
  const r = authApi.currentUser()?.role;
  return r === "HOD" ? "HOD" : r === "DEAN" ? "DEAN" : r === "ASSOCIATE_DEAN" ? "ASSOCIATE_DEAN" : "CLASS_INCHARGE";
}
/** Who decides a request: staff leave has two steps (recommend + approve); permission and student leave one. */
function chainOf(l: Leave): string[] {
  if (l.applicantRole === "STUDENT") return ["CLASS_INCHARGE"];
  const first = l.applicantRole === "HOD" ? "ASSOCIATE_DEAN" : "HOD";
  if (l.leaveCode === PERMISSION) return [first];
  return [first, l.applicantRole === "HOD" ? "DEAN" : "ASSOCIATE_DEAN"];
}
const when = (l: Leave) => l.leaveCode === PERMISSION
  ? `${l.fromDate}, ${l.fromTime} – ${l.toTime}`
  : `${l.fromDate}${l.toDate !== l.fromDate ? ` to ${l.toDate}` : ""}`;
const howLong = (l: Leave) => l.leaveCode === PERMISSION
  ? `${Number(l.hours)} hour${Number(l.hours) === 1 ? "" : "s"}`
  : `${Number(l.days)} day${Number(l.days) === 1 ? "" : "s"}${l.halfDay ? ` (${l.halfDay === "FN" ? "forenoon" : "afternoon"})` : ""}`;
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function printPage(title: string, body: string) {
  const w = window.open("", "_blank");
  if (!w) { alert("Allow pop-ups to print."); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    *{box-sizing:border-box} body{font-family:"Times New Roman",serif;color:#111;margin:24px;font-size:13px}
    h1,h2,h3{margin:0} table{border-collapse:collapse;width:100%} th,td{border:1px solid #444;padding:5px 7px;text-align:left;vertical-align:top}
    th{background:#eee;font-size:12px} .c{text-align:center} .muted{color:#555} .head{text-align:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px}
    .grid td:first-child{width:34%;font-weight:bold;background:#fafafa} .sig{display:flex;justify-content:space-between;margin-top:46px;gap:16px}
    .sig div{flex:1;text-align:center;border-top:1px solid #111;padding-top:4px;font-size:12px} .stamp{color:#0a6b2f;font-weight:bold}
    table.lh{width:100%;border-collapse:separate;border-spacing:4px 0;margin:0 -4px 10px} table.lh td{border:1.5px solid #000;vertical-align:middle;text-align:center;padding:0;background:none}
    .lh-logo{width:31mm;padding:4px!important} .lh-logo img{display:block;margin:0 auto;max-width:27mm;max-height:30mm;object-fit:contain}
    .lh-text{padding:5px 8px 6px!important;line-height:1.15} .lh-big{font-size:18px;font-weight:800;letter-spacing:.3px} .lh-mid{font-size:13.5px;font-weight:700;margin-top:2px}
    .lh-approval{font-size:8.5px;font-weight:700;margin-top:2px} .lh-gap{margin-top:6px} .lh-addr{font-size:8.5px;margin-top:3px}
    .title{display:flex;justify-content:space-between;align-items:center;margin:6px 0 12px;gap:12px} .title h2{font-size:17px;letter-spacing:.5px}
    .approved{border:3px double #0a6b2f;color:#0a6b2f;font-weight:900;font-size:16px;letter-spacing:2px;padding:4px 14px;transform:rotate(-4deg);text-align:center}
    .approved small{display:block;font-size:9px;letter-spacing:.3px;font-weight:700}
    .note{margin-top:14px;padding:8px 10px;border:1px solid #0a6b2f;background:#f1faf4;font-size:11.5px}
    .manual{margin-top:16px;border:1.5px dashed #111;padding:10px 12px} .manual h3{font-size:13px;margin-bottom:34px}
    .manual .line{display:flex;justify-content:space-between;gap:20px;font-size:12px} .manual .line span{flex:1;border-top:1px solid #111;padding-top:4px;text-align:center}
    @media print{button{display:none} body{margin:12mm}}
  </style></head><body>${body}<p class="c" style="margin-top:18px"><button onclick="window.print()">Print / Save as PDF</button></p>
  <script>window.onload=function(){window.focus();window.print();}<\/script></body></html>`);
  w.document.close();
}

/** Prints a list of leave records (the user's own, or an approver's). */
function printLeaveRecords(title: string, rows: Leave[], showApplicant: boolean) {
  const me = authApi.currentUser();
  const body = `<div class="head"><h2>${esc(me?.collegeName || "KVELL University")}</h2><h3>${esc(title)}</h3>
    <div class="muted">${esc(me?.name || "")} · printed ${esc(new Date().toLocaleString("en-IN"))}</div></div>
    <table><thead><tr><th>#</th>${showApplicant ? "<th>Applicant</th>" : ""}<th>Leave</th><th>Date(s)</th><th>Duration</th><th>Reason</th><th>Status</th><th>Approved / decided by</th></tr></thead><tbody>
    ${rows.map((l, i) => `<tr><td>${i + 1}</td>${showApplicant ? `<td>${esc(l.applicant)}<br><span class="muted">${esc(l.regNo || l.applicantRole)} · ${esc(l.deptKey?.toUpperCase())}</span></td>` : ""}
      <td>${esc(l.leaveName)}</td><td>${esc(when(l))}</td><td>${esc(howLong(l))}</td><td>${esc(l.reason)}</td><td>${esc(l.status)}</td>
      <td>${l.forwardedBy ? `Recommended: ${esc(l.forwardedBy)}<br>` : ""}${l.decidedBy ? esc(l.decidedBy) + (l.decidedAt ? ` (${esc(l.decidedAt)})` : "") : `With ${esc(approverLabel[l.approverRole])}`}</td></tr>`).join("")}
    </tbody></table>
    <p class="muted">Total: ${rows.length} record(s); approved ${rows.filter((l) => l.status === "APPROVED").length}.</p>`;
  printPage(title, body);
}

/**
 * The leave approval form of an approved request (college letterhead with logos), ready to print or save as PDF.
 * Staff leave is approved digitally by the officers, so it needs no signature; a student's leave (approved by the
 * class in-charge) is signed by the HOD by hand.
 */
async function downloadLeaveForm(id: number) {
  try {
    const f = (await apiClient.get<LeaveForm>(`/erp/leave/${id}/form`)).data;
    const l = f.leave;
    const step = (a: string) => f.steps.filter((x) => x.action === a).slice(-1)[0];
    const applied = step("APPLIED");
    const fwd = step("FORWARDED");
    const ok = step("APPROVED");
    const chain = chainOf(l);
    const student = l.applicantRole === "STUDENT";
    const permission = l.leaveCode === PERMISSION;
    const collegeKey = /nursing/i.test(f.collegeName) ? "nursing" : /pharma/i.test(f.collegeName) ? "pharmacy" : "engineering";
    const formNo = `LV-${String(l.id).padStart(5, "0")}`;
    const balance = f.allowed != null && !permission ? `${Number(f.allowed) - Number(f.usedThisYear)} of ${Number(f.allowed)} days left (${Number(f.usedThisYear)} used this academic year, including this leave)` : "";
    const row = (k: string, v: string) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`;
    const n = { i: 0 };
    const r = (k: string, v: string) => row(`${++n.i}. ${k}`, v);
    const trail = [
      `<tr><td>Applied</td><td>${esc(f.applicantName)}</td><td>${student ? "Student" : esc(f.designation)}</td><td>${esc(l.reason)}</td><td>${esc(applied?.at || l.createdAt)}</td></tr>`,
      chain.length > 1 ? `<tr><td>Recommended &amp; forwarded</td><td>${esc(l.forwardedBy || fwd?.actor || "")}</td><td>${esc(approverLabel[chain[0]])}</td><td>${esc(l.forwardRemarks || "—")}</td><td>${esc(l.forwardedAt || fwd?.at || "")}</td></tr>` : "",
      `<tr><td class="stamp">Approved</td><td>${esc(l.decidedBy || ok?.actor || "")}</td><td>${esc(approverLabel[chain[chain.length - 1]])}</td><td>${esc(l.decisionRemarks || "—")}</td><td>${esc(l.decidedAt || ok?.at || "")}</td></tr>`,
    ].join("");
    const body = `${letterhead(collegeKey, f.collegeName, window.location.origin)}
      <div class="title">
        <div><h2>${permission ? "PERMISSION APPROVAL FORM" : "LEAVE APPROVAL FORM"}</h2>
          <div class="muted">Form No. ${formNo} · ${esc(f.deptName)}</div></div>
        <div class="approved">APPROVED<small>${esc(l.decidedAt || ok?.at || "")}</small></div>
      </div>
      <table class="grid">
        ${r("Name", esc(f.applicantName))}
        ${r(student ? "Register No." : "Staff ID", esc(l.regNo || f.username))}
        ${r(student ? "Class" : "Designation", student ? `Student · ${esc(f.deptName)}` : esc(f.designation))}
        ${r("Department", esc(f.deptName))}
        ${r("Nature of leave", esc(l.leaveName))}
        ${permission
          ? r("Date and time", `${esc(l.fromDate)}, ${esc(l.fromTime)} to ${esc(l.toTime)} (${esc(howLong(l))})`)
          : r("Period of leave", `${esc(l.fromDate)}${l.toDate !== l.fromDate ? ` to ${esc(l.toDate)}` : ""} — ${esc(howLong(l))}`)}
        ${r("Reason", esc(l.reason))}
        ${balance ? r("Leave balance", esc(balance)) : ""}
        ${l.substitutions.length ? r("Alternate class arrangement", l.substitutions.map((x) => `${esc(x.date)} · ${esc(x.subjectCode)} → ${esc(x.substitute)}`).join("<br>")) : ""}
      </table>
      <h3 style="margin:16px 0 6px;font-size:13px">Approval record</h3>
      <table><thead><tr><th>Step</th><th>Name</th><th>Authority</th><th>Remarks</th><th>Date &amp; time</th></tr></thead><tbody>${trail}</tbody></table>
      ${student ? `
      <div class="note">Approved digitally by the class in-charge in the KVELL ERP. Submit this form to the HOD for signature.</div>
      <div class="manual"><h3>For office use: HOD's signature</h3>
        <div class="line"><span>Date</span><span>Signature of the HOD (with seal)</span></div></div>`
      : `<div class="note"><strong>Digitally approved.</strong> This ${permission ? "permission" : "leave"} was ${chain.length > 1 ? "recommended and approved" : "approved"} online by the officers named above in the KVELL ERP, so no signature is needed. The approval can be verified with Form No. ${formNo}.</div>`}
      <p class="muted" style="margin-top:14px;font-size:10.5px">Generated from the KVELL ERP on ${esc(new Date().toLocaleString("en-IN"))}.</p>`;
    printPage(`${permission ? "Permission" : "Leave"} approval ${formNo}`, body);
  } catch (e) { alert(apiErrorMessage(e, "The leave form could not be opened.")); }
}

/** Apply for leave or an hourly permission and follow one's own requests (student, faculty, HOD). */
export function LeaveApply({ onToast }: { onToast?: (m: string) => void }) {
  const types = useLoad<LeaveType[]>("/erp/leave/types");
  const mine = useLoad<Leave[]>("/erp/leave/mine");
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ leaveCode: "", fromDate: today, toDate: today, halfDay: "", reason: "", fromTime: "09:00", toTime: "11:00" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const chosen = types.data?.find((t) => t.code === form.leaveCode);
  const permission = form.leaveCode === PERMISSION;
  const role = authApi.currentUser()?.role;
  const minutes = (() => { const [a, b] = [form.fromTime, form.toTime].map((t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; }); return b - a; })();

  const apply = async () => {
    setBusy(true);
    try {
      let attachment = {};
      if (file) {
        if (file.size > 2 * 1024 * 1024) throw new Error("Attachment: at most 2 MB");
        const b64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result).split(",")[1] || "");
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        attachment = { attachmentName: file.name, attachmentType: file.type, attachmentBase64: b64 };
      }
      const body = permission
        ? { leaveCode: form.leaveCode, fromDate: form.fromDate, toDate: form.fromDate, reason: form.reason, fromTime: form.fromTime, toTime: form.toTime }
        : { leaveCode: form.leaveCode, fromDate: form.fromDate, toDate: form.toDate, reason: form.reason, halfDay: form.halfDay || null };
      const r = await apiClient.post<Leave>("/erp/leave", { ...body, ...attachment });
      onToast ? onToast(`${permission ? "Permission" : "Leave"} request sent to the ${approverLabel[r.data.approverRole]}.`)
        : alert(`${permission ? "Permission" : "Leave"} request sent to the ${approverLabel[r.data.approverRole]}.`);
      setForm({ ...form, reason: "" });
      setFile(null);
      mine.reload();
      types.reload();
    } catch (e) {
      alert(e instanceof Error && !("response" in e) ? e.message : apiErrorMessage(e, "The request could not be sent."));
    } finally {
      setBusy(false);
    }
  };
  const cancel = async (l: Leave) => {
    if (!window.confirm("Cancel this request?")) return;
    try { await apiClient.post(`/erp/leave/${l.id}/cancel`); mine.reload(); types.reload(); }
    catch (e) { alert(apiErrorMessage(e, "Could not cancel.")); }
  };
  const flow = role === "STUDENT" ? "Your class in-charge decides it."
    : role === "HOD" ? "Leave: the Associate Dean recommends it, then the Dean approves. Permission: the Associate Dean decides."
    : "Leave: your HOD recommends it, then the Associate Dean approves. Permission: your HOD decides.";

  return (
    <div className="space-y-5">
      <Title title="Leave & permission" detail={`Apply for a full-day or half-day leave, or an hourly permission. ${flow} You are notified at every step, and an approved leave can be downloaded as the official leave form.`} />
      <div className={`${card} p-5 space-y-4`}>
        {!types.data ? <Loading error={types.error} /> : (
          <>
            <div className="flex flex-wrap gap-2">
              {types.data.filter((t) => t.yearlyDays != null && t.remaining != null).map((t) => (
                <span key={t.code} className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  <strong>{t.name}</strong>: {t.code === PERMISSION ? `${t.remaining} of ${t.yearlyDays} left this month` : `${t.remaining} of ${t.yearlyDays} days left`}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="text-xs font-bold text-slate-600">Type
                <select className={input} value={form.leaveCode} onChange={(e) => setForm({ ...form, leaveCode: e.target.value, halfDay: "" })}>
                  <option value="">Choose</option>
                  {types.data.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
                </select>
              </label>
              {permission ? (
                <>
                  <label className="text-xs font-bold text-slate-600">Date<input type="date" className={input} value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value, toDate: e.target.value })} /></label>
                  <label className="text-xs font-bold text-slate-600">From time<input type="time" className={input} value={form.fromTime} onChange={(e) => setForm({ ...form, fromTime: e.target.value })} /></label>
                  <label className="text-xs font-bold text-slate-600">To time<input type="time" className={input} value={form.toTime} onChange={(e) => setForm({ ...form, toTime: e.target.value })} />
                    <span className={`block mt-1 font-semibold ${minutes > 0 && minutes <= 120 ? "text-slate-500" : "text-red-700"}`}>{minutes > 0 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : "Choose a later time"}{minutes > 120 ? " (at most 2 hours)" : ""}</span>
                  </label>
                </>
              ) : (
                <>
                  <label className="text-xs font-bold text-slate-600">From<input type="date" className={input} value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value, toDate: form.halfDay || e.target.value > form.toDate ? e.target.value : form.toDate })} /></label>
                  <label className="text-xs font-bold text-slate-600">To<input type="date" className={input} value={form.toDate} min={form.fromDate} disabled={!!form.halfDay} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></label>
                  <label className="text-xs font-bold text-slate-600">Full / half day
                    <select className={input} value={form.halfDay} onChange={(e) => setForm({ ...form, halfDay: e.target.value, toDate: e.target.value ? form.fromDate : form.toDate })}>
                      <option value="">Full day(s)</option><option value="FN">Half day – forenoon</option><option value="AN">Half day – afternoon</option>
                    </select>
                  </label>
                </>
              )}
            </div>
            <label className="text-xs font-bold text-slate-600 block">Reason<textarea className={input} rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {!permission ? (
                <label className="text-xs font-bold text-slate-600 inline-flex items-center gap-2">
                  <Paperclip size={14} /> Attachment {chosen?.needsAttachment ? "(required)" : "(optional)"}: PDF / JPG / PNG, max 2 MB
                  <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              ) : <span className="text-xs text-slate-500">A permission is for one date, at most 2 hours, 2 times a month.</span>}
              <button className={btn} disabled={busy || !form.leaveCode || form.reason.trim().length < 5 || (permission && (minutes <= 0 || minutes > 120))} onClick={apply}>
                {busy && <Loader2 size={14} className="animate-spin" />} Send request
              </button>
            </div>
          </>
        )}
      </div>
      <LeaveTable title="My leave & permission requests" data={mine.data} error={mine.error} actions={(l) => (
        <span className="whitespace-nowrap">
          {l.status === "PENDING" && <button className="text-xs font-bold text-red-700 underline" onClick={() => cancel(l)}>Cancel</button>}
          {l.status === "APPROVED" && <button className="text-xs font-bold underline text-[#0B192C] inline-flex items-center gap-1" onClick={() => downloadLeaveForm(l.id)}><Download size={12} /> Leave form</button>}
        </span>
      )} />
    </div>
  );
}

/**
 * Requests for the signed-in approver: class in-charge (students), HOD (faculty: recommends to the Associate Dean),
 * Associate Dean (faculty after the HOD; HODs: recommends to the Dean) and Dean (HODs after the Associate Dean).
 */
export function LeaveInbox({ title = "Leave approvals", detail, onToast }: { title?: string; detail?: string; onToast?: (m: string) => void }) {
  const inbox = useLoad<Leave[]>("/erp/leave/inbox");
  const stage = myStage();
  const [filter, setFilter] = useState<"waiting" | "all" | "APPROVED" | "REJECTED">("waiting");
  const [deciding, setDeciding] = useState<{ l: Leave; approve: boolean } | null>(null);
  const [remarks, setRemarks] = useState("");
  const waiting = (l: Leave) => l.status === "PENDING" && l.approverRole === stage;
  const forwards = (l: Leave) => chainOf(l).length > 1 && chainOf(l)[0] === stage;
  const rows = (inbox.data || []).filter((l) => filter === "all" ? true : filter === "waiting" ? waiting(l) : l.status === filter);
  const decide = async () => {
    if (!deciding) return;
    const { l, approve } = deciding;
    try {
      const r = await apiClient.post<Leave>(`/erp/leave/${l.id}/decide`, { approve, remarks: remarks.trim() || null });
      const msg = !approve ? `Rejected; ${l.applicant} has been notified.`
        : r.data.status === "PENDING" ? `Recommended and forwarded to the ${approverLabel[r.data.approverRole]}.`
        : `Approved; ${l.applicant} has been notified.` + (r.data.substitutions.length ? ` ${r.data.substitutions.length} substitute classes suggested.` : "");
      onToast ? onToast(msg) : alert(msg);
      setDeciding(null);
      setRemarks("");
      inbox.reload();
    } catch (e) { alert(apiErrorMessage(e, "The decision could not be saved.")); }
  };
  const count = (inbox.data || []).filter(waiting).length;
  return (
    <div className="space-y-5">
      <Title title={title} detail={detail || "Recommend, approve or reject with remarks. Approved leave reduces the balance; for faculty a substitute is suggested for each class missed."}
        action={inbox.data && <button className={btn} onClick={() => printLeaveRecords(`${title} — ${filter === "waiting" ? "waiting" : filter === "all" ? "all records" : filter.toLowerCase()}`, rows, true)}><Download size={14} /> Print records</button>} />
      {deciding && (
        <div className={`${card} p-5 space-y-3`}>
          <div className="text-sm font-black text-[#0B192C]">
            {!deciding.approve ? "Reject" : forwards(deciding.l) ? `Recommend and forward to the ${approverLabel[chainOf(deciding.l)[1]]}` : "Approve"} · {deciding.l.applicant}, {deciding.l.leaveName}, {when(deciding.l)}
          </div>
          <textarea className={input} rows={2} placeholder={deciding.approve ? "Remarks (optional)" : "Reason for rejecting (required)"} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          <div className="flex gap-2">
            <button className={btn} disabled={!deciding.approve && remarks.trim().length < 3} onClick={decide}><CheckCircle2 size={14} /> Confirm</button>
            <button className="text-xs font-bold" onClick={() => setDeciding(null)}>Cancel</button>
          </div>
        </div>
      )}
      <Tabs value={filter} onChange={setFilter} tabs={[["waiting", `Waiting for me${count ? ` (${count})` : ""}`], ["all", "All"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"]]} />
      <LeaveTable title="Requests" data={inbox.data ? rows : null} error={inbox.error} showApplicant actions={(l) => (
        <span className="whitespace-nowrap">
          {waiting(l) && <>
            <button className="mr-3 text-xs font-black text-emerald-700" onClick={() => { setRemarks(""); setDeciding({ l, approve: true }); }}>{forwards(l) ? "Recommend & forward" : "Approve"}</button>
            <button className="text-xs font-black text-red-700" onClick={() => { setRemarks(""); setDeciding({ l, approve: false }); }}>Reject</button>
          </>}
          {l.status === "APPROVED" && <button className="text-xs font-bold underline text-[#0B192C] inline-flex items-center gap-1" onClick={() => downloadLeaveForm(l.id)}><Download size={12} /> Leave form</button>}
        </span>
      )} />
    </div>
  );
}

function LeaveTable({ title, data, error, actions, showApplicant }: { title: string; data: Leave[] | null; error: string | null; actions: (l: Leave) => React.ReactNode; showApplicant?: boolean }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <span className="text-sm font-black text-[#0B192C]">{title}</span>
        {!showApplicant && data && data.length > 0 && <button className="text-xs font-bold underline text-[#0B192C]" onClick={() => printLeaveRecords(title, data, false)}>Print records</button>}
      </div>
      {!data ? <Loading error={error} /> : data.length === 0 ? <p className="p-6 text-sm text-slate-500">No requests.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr>
              {showApplicant && <th className={th}>Applicant</th>}
              <th className={th}>Leave</th><th className={th}>Date(s)</th><th className={th}>Reason</th><th className={th}>Status</th><th className={th}></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((l) => {
                const chain = chainOf(l);
                return (
                  <tr key={l.id} className="align-top">
                    {showApplicant && <td className={td}><strong>{l.applicant}</strong><div className="text-[10px] text-slate-500">{l.regNo || l.applicantRole} · {l.deptKey?.toUpperCase()}</div></td>}
                    <td className={td}>{l.leaveName}<div className="text-[10px] text-slate-500">{howLong(l)}</div></td>
                    <td className={td}>{when(l)}<div className="text-[10px] text-slate-500">applied {l.createdAt}</div></td>
                    <td className={`${td} max-w-xs`}>{l.reason}
                      {l.hasAttachment && <button className="block text-[11px] font-bold underline mt-1" onClick={() => openFile(`/erp/leave/${l.id}/attachment`)}>View attachment</button>}
                      {l.substitutions.length > 0 && (
                        <details className="mt-1 text-[11px]"><summary className="cursor-pointer font-bold">Substitutes ({l.substitutions.length})</summary>
                          <ul>{l.substitutions.map((s, i) => <li key={i}>{s.date} · {s.subjectCode} → {s.substitute}</li>)}</ul>
                        </details>
                      )}
                    </td>
                    <td className={td}>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusTone[l.status]}`}>{l.status === "PENDING" ? `WITH ${approverLabel[l.approverRole].toUpperCase()}` : l.status}</span>
                      {chain.length > 1 && (
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          {chain.map((c, i) => {
                            const done = (i === 0 && !!l.forwardedBy) || (i === 1 && l.status === "APPROVED");
                            const rejected = l.status === "REJECTED" && l.approverRole === c;
                            return <span key={c} className={done ? "text-emerald-700 font-bold" : rejected ? "text-red-700 font-bold" : ""}>{i > 0 && "→ "}{approverLabel[c]}{done ? " ✓" : rejected ? " ✗" : ""}</span>;
                          })}
                        </div>
                      )}
                      {l.forwardedBy && <div className="text-[10px] text-slate-500 mt-1">Recommended by {l.forwardedBy}{l.forwardRemarks ? `: "${l.forwardRemarks}"` : ""}</div>}
                      {l.decidedBy && <div className="text-[10px] text-slate-500">{l.status === "REJECTED" ? "Rejected" : "Approved"} by {l.decidedBy}</div>}
                      {l.decisionRemarks && <div className="text-[10px] italic text-slate-600">"{l.decisionRemarks}"</div>}
                    </td>
                    <td className={`${td} text-right`}>{actions(l)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- class in-charge

type MyClassDTO = { deptKey: string; deptName: string; semester: number; semesterLabel: string; section: string; temporary: boolean; pendingLeaves: number;
  students: { regNo: string; name: string; section: string; onLeaveToday: boolean }[] };

/** Faculty: whether they are a class in-charge today (decides if "My Class" is shown). */
export function useMyClasses() {
  const [classes, setClasses] = useState<MyClassDTO[]>([]);
  useEffect(() => {
    apiClient.get<MyClassDTO[]>("/erp/classes/mine").then((r) => setClasses(r.data)).catch(() => setClasses([]));
  }, []);
  return classes;
}

export function MyClassView({ onToast }: { onToast?: (m: string) => void }) {
  const mine = useLoad<MyClassDTO[]>("/erp/classes/mine");
  const [idx, setIdx] = useState(0);
  const [tab, setTab] = useState<"students" | "leave" | "completion">("students");
  if (!mine.data) return <Loading error={mine.error} />;
  if (mine.data.length === 0) return <Title title="My Class" detail="You are not a class in-charge at present. The HOD assigns class in-charges." />;
  const c = mine.data[Math.min(idx, mine.data.length - 1)];
  return (
    <div className="space-y-5">
      <Title title={`My Class: ${c.deptKey.toUpperCase()} ${c.semesterLabel} – ${c.section}`}
        detail={`${c.deptName}. You are the ${c.temporary ? "temporary " : ""}class in-charge: you see every student and subject of this class and approve the students' leave.`}
        action={mine.data.length > 1 ? (
          <select className={`${input} w-auto`} value={idx} onChange={(e) => setIdx(Number(e.target.value))}>
            {mine.data.map((m, i) => <option key={i} value={i}>{m.deptKey.toUpperCase()} {m.semesterLabel} {m.section}</option>)}
          </select>
        ) : undefined} />
      <Tabs value={tab} onChange={setTab} tabs={[["students", `Students (${c.students.length})`], ["leave", `Student leave${c.pendingLeaves ? ` (${c.pendingLeaves})` : ""}`], ["completion", "Subject completion"]]} />
      {tab === "students" && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className={th}>#</th><th className={th}>Register no</th><th className={th}>Name</th><th className={th}>Today</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {c.students.map((s, i) => (
                <tr key={s.regNo}><td className={td}>{i + 1}</td><td className={`${td} font-mono`}>{s.regNo}</td><td className={td}>{s.name}</td>
                  <td className={td}>{s.onLeaveToday ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">ON LEAVE</span> : "Present / not on leave"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "leave" && <LeaveInbox title="Student leave approvals" detail="Leave requests of the students of your class." onToast={onToast} />}
      {tab === "completion" && <CompletionTable dept={c.deptKey} semester={c.semesterLabel} />}
    </div>
  );
}

/** HOD: assigns the class in-charge of each class (and a temporary one while the in-charge is on leave). */
export function ClassInchargeAdmin({ onToast }: { onToast?: (m: string) => void }) {
  const classes = useLoad<{ semester: number; section: string; students: number; inchargeId: number | null; inchargeName: string | null; temporaryName: string | null; temporaryTo: string | null }[]>("/erp/classes");
  const faculty = useLoad<{ id: number; username: string; name: string }[]>("/erp/classes/faculty");
  const [temp, setTemp] = useState<{ semester: number; section: string; facultyUserId: string; fromDate: string; toDate: string } | null>(null);
  const assign = async (semester: number, section: string, facultyUserId: string) => {
    if (!facultyUserId) return;
    try {
      await apiClient.put("/erp/classes/incharge", { semester: String(semester), section, facultyUserId: Number(facultyUserId) });
      onToast?.("Class in-charge assigned; the faculty member has been notified.");
      classes.reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not assign.")); }
  };
  const saveTemp = async () => {
    if (!temp) return;
    try {
      await apiClient.post("/erp/classes/temporary", { ...temp, semester: String(temp.semester), facultyUserId: Number(temp.facultyUserId) });
      onToast?.("Temporary in-charge set.");
      setTemp(null);
      classes.reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not save.")); }
  };
  return (
    <div className="space-y-5">
      <Title title="Class in-charge" detail="Choose one class in-charge per class. They see 'My Class' (all students, subject completion) and approve the students' leave. A change keeps the history." />
      {!classes.data || !faculty.data ? <Loading error={classes.error || faculty.error} /> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className={th}>Class</th><th className={th}>Students</th><th className={th}>Class in-charge</th><th className={th}>Temporary in-charge</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {classes.data.map((c) => (
                <tr key={`${c.semester}${c.section}`}>
                  <td className={`${td} font-bold`}>Semester {c.semester} – {c.section}</td>
                  <td className={td}>{c.students}</td>
                  <td className={td}>
                    <select className={`${input} max-w-xs`} value={c.inchargeId ?? ""} onChange={(e) => assign(c.semester, c.section, e.target.value)}>
                      <option value="">Not assigned</option>
                      {faculty.data!.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.username})</option>)}
                    </select>
                  </td>
                  <td className={td}>
                    {c.temporaryName ? <span className="text-xs">{c.temporaryName} until {c.temporaryTo}</span> : null}
                    <button className="ml-2 text-xs font-bold underline" onClick={() => setTemp({ semester: c.semester, section: c.section, facultyUserId: "", fromDate: new Date().toISOString().slice(0, 10), toDate: new Date().toISOString().slice(0, 10) })}>Set temporary</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {temp && (
        <div className={`${card} p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end`}>
          <label className="text-xs font-bold text-slate-600">Temporary in-charge (Sem {temp.semester} – {temp.section})
            <select className={input} value={temp.facultyUserId} onChange={(e) => setTemp({ ...temp, facultyUserId: e.target.value })}>
              <option value="">Choose</option>{faculty.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">From<input type="date" className={input} value={temp.fromDate} onChange={(e) => setTemp({ ...temp, fromDate: e.target.value })} /></label>
          <label className="text-xs font-bold text-slate-600">To<input type="date" className={input} value={temp.toDate} onChange={(e) => setTemp({ ...temp, toDate: e.target.value })} /></label>
          <div className="flex gap-2"><button className={btn} disabled={!temp.facultyUserId} onClick={saveTemp}>Save</button><button className="text-xs font-bold" onClick={() => setTemp(null)}>Cancel</button></div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- logbook

type LbSubject = { deptKey: string; deptName: string; semester: number; semesterLabel: string; subjectCode: string; subjectTitle: string; sections: string[]; topics: number; covered: number; percent: number; behind: number; lastEntry: string | null };
type Unit = { id: number; unitNo: number; title: string; plannedHours: number; topics: { id: number; topicNo: number; title: string; plannedDate: string | null; covered: boolean }[] };
type Entry = { id: number; date: string; period: number; section: string; topicId: number | null; topic: string; method: string; remarks: string | null; faculty: string; editable: boolean };
const METHODS = ["Lecture", "Tutorial", "Laboratory", "Seminar", "Flipped class", "Assignment discussion", "Revision", "Test", "Other"];

/** Faculty: their subjects; the syllabus once per subject, then a logbook entry for each class. */
export function FacultyLogbook({ onToast }: { onToast?: (m: string) => void }) {
  const subjects = useLoad<LbSubject[]>("/erp/logbook/subjects");
  const [sel, setSel] = useState<LbSubject | null>(null);
  useEffect(() => { if (!sel && subjects.data?.length) setSel(subjects.data[0]); }, [subjects.data]);
  const params = sel ? { dept: sel.deptKey, semester: sel.semesterLabel, subject: sel.subjectCode } : undefined;
  const units = useLoad<Unit[]>(sel ? "/erp/logbook/syllabus" : null, params);
  const entries = useLoad<Entry[]>(sel ? "/erp/logbook/entries" : null, params);
  const [tab, setTab] = useState<"log" | "syllabus">("log");
  const reloadAll = () => { units.reload(); entries.reload(); subjects.reload(); };

  if (!subjects.data) return <Loading error={subjects.error} />;
  if (subjects.data.length === 0) return <Title title="Logbook" detail="No subjects are allotted to you yet. The HOD allots subjects to faculty." />;
  return (
    <div className="space-y-5">
      <Title title="Logbook & lesson plan" detail="Add the lesson plan once per subject (units, topics and the date you plan to teach each), then log every class (date, period, topic, method). Completion updates by itself. Entries lock a few days after the class." />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {subjects.data.map((s) => (
          <button key={s.deptKey + s.subjectCode} onClick={() => setSel(s)}
            className={`text-left p-4 rounded-2xl border-2 transition ${sel?.subjectCode === s.subjectCode && sel.deptKey === s.deptKey ? "border-[#D4A72C] bg-amber-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
            <div className="flex items-center gap-2"><span className="font-mono font-black text-[11px] px-2 py-0.5 rounded bg-[#0B192C] text-[#D4A72C]">{s.subjectCode}</span>
              {s.behind > 0 && <span className="text-[10px] font-black text-red-700">BEHIND PLAN ({s.behind})</span>}</div>
            <p className="mt-1.5 text-xs font-bold text-[#0B192C] line-clamp-1">{s.subjectTitle}</p>
            <p className="text-[11px] text-slate-500">{s.deptKey.toUpperCase()} · {s.semesterLabel} · last entry {s.lastEntry || "none"}</p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${s.percent}%` }} /></div>
            <p className="text-[11px] mt-1">{s.covered}/{s.topics} topics · <strong>{s.percent}%</strong></p>
          </button>
        ))}
      </div>
      {sel && (
        <>
          <Tabs value={tab} onChange={setTab} tabs={[["log", "Daily logbook"], ["syllabus", `Lesson plan (${units.data?.reduce((n, u) => n + u.topics.length, 0) ?? 0} topics)`]]} />
          {tab === "log" && <LogEntries subject={sel} units={units.data || []} entries={entries} onSaved={reloadAll} onToast={onToast} />}
          {tab === "syllabus" && <SyllabusEditor subject={sel} units={units.data} onSaved={reloadAll} onToast={onToast} />}
        </>
      )}
    </div>
  );
}

function LogEntries({ subject, units, entries, onSaved, onToast }: { subject: LbSubject; units: Unit[]; entries: ReturnType<typeof useLoad<Entry[]>>; onSaved: () => void; onToast?: (m: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const blank = { date: today, period: "1", section: subject.sections[0] || "A", topicId: "", topicText: "", method: "Lecture", remarks: "" };
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState<number | null>(null);
  const topics = useMemo(() => units.flatMap((u) => u.topics.map((t) => ({ ...t, unit: u.unitNo }))), [units]);
  const save = async () => {
    const body = { dept: subject.deptKey, semester: subject.semesterLabel, subject: subject.subjectCode, section: form.section, date: form.date,
      period: Number(form.period), topicId: form.topicId ? Number(form.topicId) : null, topicText: form.topicText, method: form.method, remarks: form.remarks };
    try {
      if (editId) await apiClient.put(`/erp/logbook/entries/${editId}`, body);
      else await apiClient.post("/erp/logbook/entries", body);
      onToast?.(editId ? "Logbook entry updated." : "Class logged.");
      setForm(blank);
      setEditId(null);
      onSaved();
    } catch (e) { alert(apiErrorMessage(e, "The entry could not be saved.")); }
  };
  const remove = async (e: Entry) => {
    if (!window.confirm("Delete this entry?")) return;
    try { await apiClient.delete(`/erp/logbook/entries/${e.id}`); onSaved(); } catch (err) { alert(apiErrorMessage(err, "Could not delete.")); }
  };
  return (
    <>
      <div className={`${card} p-5 space-y-3`}>
        <h3 className="text-sm font-black text-[#0B192C]">{editId ? "Edit entry" : "Log a class"}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="text-xs font-bold text-slate-600">Date<input type="date" className={input} max={today} value={form.date} disabled={!!editId} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label className="text-xs font-bold text-slate-600">Period<select className={input} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>{[1, 2, 3, 4, 5, 6, 7, 8].map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600">Section<select className={input} value={form.section} disabled={!!editId} onChange={(e) => setForm({ ...form, section: e.target.value })}>{subject.sections.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600">Method<select className={input} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
        </div>
        <label className="text-xs font-bold text-slate-600 block">Topic covered (from the lesson plan)
          <select className={input} value={form.topicId} onChange={(e) => setForm({ ...form, topicId: e.target.value })}>
            <option value="">{topics.length ? "Other topic (type below)" : "Add the lesson plan first, or type the topic below"}</option>
            {topics.map((t) => <option key={t.id} value={t.id}>Unit {t.unit}.{t.topicNo} {t.title}{t.covered ? " ✓" : ""}</option>)}
          </select>
        </label>
        {!form.topicId && <input className={input} placeholder="Topic covered" value={form.topicText} onChange={(e) => setForm({ ...form, topicText: e.target.value })} />}
        <input className={input} placeholder="Remarks (optional)" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        <div className="flex gap-2 justify-end">
          {editId && <button className="text-xs font-bold" onClick={() => { setEditId(null); setForm(blank); }}>Cancel edit</button>}
          <button className={btn} disabled={!form.topicId && !form.topicText.trim()} onClick={save}>{editId ? "Save changes" : "Add entry"}</button>
        </div>
      </div>
      <div className={`${card} overflow-x-auto`}>
        {!entries.data ? <Loading error={entries.error} /> : entries.data.length === 0 ? <p className="p-6 text-sm text-slate-500">No entries yet.</p> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr>{["Date", "Period", "Section", "Topic", "Method", "Remarks", "By", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {entries.data.map((e) => (
                <tr key={e.id}><td className={td}>{e.date}</td><td className={td}>{e.period}</td><td className={td}>{e.section}</td><td className={td}>{e.topic}</td>
                  <td className={td}>{e.method}</td><td className={td}>{e.remarks}</td><td className={td}>{e.faculty}</td>
                  <td className={`${td} text-right whitespace-nowrap`}>{e.editable ? (
                    <>
                      <button className="text-xs font-bold underline mr-2" onClick={() => { setEditId(e.id); setForm({ date: e.date, period: String(e.period), section: e.section, topicId: e.topicId ? String(e.topicId) : "", topicText: e.topicId ? "" : e.topic, method: e.method, remarks: e.remarks || "" }); }}>Edit</button>
                      <button className="text-red-700" aria-label="Delete" onClick={() => remove(e)}><Trash2 size={13} /></button>
                    </>
                  ) : <span className="text-[10px] text-slate-400">Locked</span>}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function SyllabusEditor({ subject, units, onSaved, onToast }: { subject: LbSubject; units: Unit[] | null; onSaved: () => void; onToast?: (m: string) => void }) {
  type U = { title: string; plannedHours: number; topics: { title: string; plannedDate: string }[] };
  const [draft, setDraft] = useState<U[]>([]);
  useEffect(() => {
    setDraft((units || []).map((u) => ({ title: u.title, plannedHours: u.plannedHours, topics: u.topics.map((t) => ({ title: t.title, plannedDate: t.plannedDate || "" })) })));
  }, [units]);
  const set = (i: number, u: U) => setDraft(draft.map((x, j) => (j === i ? u : x)));
  const save = async () => {
    try {
      await apiClient.put("/erp/logbook/syllabus", { dept: subject.deptKey, semester: subject.semesterLabel, subject: subject.subjectCode,
        units: draft.map((u, i) => ({ unitNo: i + 1, title: u.title, plannedHours: u.plannedHours, topics: u.topics.filter((t) => t.title.trim()).map((t) => ({ title: t.title, plannedDate: t.plannedDate || null })) })) });
      onToast?.("Syllabus saved.");
      onSaved();
    } catch (e) { alert(apiErrorMessage(e, "The syllabus could not be saved.")); }
  };
  if (!units) return <Loading error={null} />;
  return (
    <div className={`${card} p-5 space-y-4`}>
      <p className="text-xs text-slate-600">Units and their topics. The planned date of a topic is used to show when the subject is behind plan.</p>
      {draft.map((u, i) => (
        <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex gap-2 items-center">
            <span className="text-xs font-black w-14">Unit {i + 1}</span>
            <input className={input} placeholder="Unit title" value={u.title} onChange={(e) => set(i, { ...u, title: e.target.value })} />
            <input type="number" className={`${input} max-w-[90px]`} title="Planned hours" value={u.plannedHours} onChange={(e) => set(i, { ...u, plannedHours: Number(e.target.value) })} />
            <button aria-label="Remove unit" className="text-red-700" onClick={() => setDraft(draft.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
          </div>
          {u.topics.map((t, k) => (
            <div key={k} className="flex gap-2 items-center pl-14">
              <span className="text-[11px] w-8 text-slate-500">{i + 1}.{k + 1}</span>
              <input className={input} placeholder="Topic" value={t.title} onChange={(e) => set(i, { ...u, topics: u.topics.map((x, m) => (m === k ? { ...x, title: e.target.value } : x)) })} />
              <input type="date" className={`${input} max-w-[160px]`} value={t.plannedDate} onChange={(e) => set(i, { ...u, topics: u.topics.map((x, m) => (m === k ? { ...x, plannedDate: e.target.value } : x)) })} />
              <button aria-label="Remove topic" className="text-red-700" onClick={() => set(i, { ...u, topics: u.topics.filter((_, m) => m !== k) })}><X size={14} /></button>
            </div>
          ))}
          <button className="ml-14 text-xs font-bold underline" onClick={() => set(i, { ...u, topics: [...u.topics, { title: "", plannedDate: "" }] })}>+ Add topic</button>
        </div>
      ))}
      <div className="flex justify-between">
        <button className="text-xs font-bold inline-flex items-center gap-1" onClick={() => setDraft([...draft, { title: "", plannedHours: 9, topics: [{ title: "", plannedDate: "" }] }])}><Plus size={14} /> Add unit</button>
        <button className={btn} onClick={save} disabled={draft.some((u) => !u.title.trim())}>Save lesson plan</button>
      </div>
    </div>
  );
}

type Completion = { deptKey: string; semester: number; subjectCode: string; subjectTitle: string; faculty: string; facultyIds: number[]; topics: number; covered: number; percent: number; behind: number; lastEntry: string | null; lagging: boolean };

function Bar({ c }: { c: Completion }) {
  return (
    <div className="flex items-center gap-2"><div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${c.percent}%` }} /></div>
      <span className="text-xs">{c.percent}% ({c.covered}/{c.topics})</span></div>
  );
}

/** The lesson plan of a subject (units, topics, planned dates) and which topics have been taught, from the logbook. */
function LessonPlan({ c, onClose }: { c: Completion; onClose: () => void }) {
  const units = useLoad<Unit[]>("/erp/logbook/syllabus", { dept: c.deptKey, semester: SEMESTERS[c.semester - 1], subject: c.subjectCode });
  const today = new Date().toISOString().slice(0, 10);
  const fmt = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—");
  return (
    <div className={`${card} p-5 space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-[#0B192C]">Lesson plan · {c.subjectCode} — {c.subjectTitle}</div>
          <div className="text-xs text-slate-500">Handled by {c.faculty}. {c.covered} of {c.topics} topics taught ({c.percent}%){c.lagging ? `, ${c.behind} behind plan` : ""}.</div>
        </div>
        <button aria-label="Close" onClick={onClose}><X size={16} /></button>
      </div>
      {!units.data ? <Loading error={units.error} /> : units.data.length === 0 ? (
        <p className="text-xs text-slate-500">No lesson plan yet. The faculty add it in their Logbook, under Lesson plan.</p>
      ) : (
        <div className="space-y-3">
          {units.data.map((u) => {
            const taught = u.topics.filter((t) => t.covered).length;
            return (
              <div key={u.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 flex flex-wrap justify-between gap-2 text-xs">
                  <span className="font-black text-[#0B192C]">Unit {u.unitNo} · {u.title}</span>
                  <span className="text-slate-500">{u.plannedHours} hours · {taught} of {u.topics.length} taught</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    {u.topics.map((t) => {
                      const late = !t.covered && t.plannedDate != null && t.plannedDate < today;
                      return (
                        <tr key={t.id} className={late ? "bg-red-50/50" : ""}>
                          <td className="px-4 py-1.5 w-12 text-slate-400">{u.unitNo}.{t.topicNo}</td>
                          <td className="px-2 py-1.5">{t.title}</td>
                          <td className="px-2 py-1.5 w-24 text-slate-500">{fmt(t.plannedDate)}</td>
                          <td className="px-4 py-1.5 w-28 text-right">
                            {t.covered ? <span className="font-bold text-emerald-700">Taught</span> : late ? <span className="font-bold text-red-700">Not yet taught</span> : <span className="text-slate-400">Upcoming</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * mode "allocation": the subjects of the semester and who handles each; the HOD of the department (canAllot) chooses
 * the faculty here. mode "completion": syllabus completion of the same subjects from the faculty logbooks.
 */
function CompletionTable({ dept, semester, mode = "completion", canAllot, onToast }: { dept: string; semester?: string; mode?: "allocation" | "completion"; canAllot?: boolean; onToast?: (m: string) => void }) {
  const data = useLoad<Completion[]>(dept ? "/erp/logbook/completion" : null, { dept, semester });
  const faculty = useLoad<{ id: number; username: string; name: string }[]>(canAllot ? "/erp/classes/faculty" : null);
  const [editing, setEditing] = useState<Completion | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState("");
  const [plan, setPlan] = useState<Completion | null>(null);
  const open = (c: Completion) => { setPlan(null); setEditing(c); setPicked(c.facultyIds || []); setSearch(""); setDone(""); };
  const showPlan = (c: Completion) => { setEditing(null); setPlan(c); };
  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiClient.put("/erp/classes/subject-faculty", { semester: String(editing.semester), subject: editing.subjectCode, facultyUserIds: picked });
      const m = picked.length ? `${editing.subjectCode} allotted; the faculty have been notified.` : `${editing.subjectCode} has no faculty now.`;
      onToast ? onToast(m) : setDone(m);
      setEditing(null);
      data.reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not allot the subject.")); }
    finally { setSaving(false); }
  };
  if (!data.data) return <Loading error={data.error} />;
  const rows = data.data;
  const allotted = rows.filter((c) => c.facultyIds?.length).length;
  const nameOf = (id: number) => faculty.data?.find((f) => f.id === id)?.name;
  const shown = (faculty.data || []).filter((f) => !search.trim() || `${f.name} ${f.username}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <>
    {done && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold px-4 py-2.5 flex justify-between">{done}<button aria-label="Close" onClick={() => setDone("")}><X size={14} /></button></div>}
    {plan && <LessonPlan c={plan} onClose={() => setPlan(null)} />}
    {editing && (
      <div className={`${card} p-5 space-y-3`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-[#0B192C]">Allot {editing.subjectCode} — {editing.subjectTitle}</div>
            <div className="text-xs text-slate-500">Semester {editing.semester}. Tick the faculty who handle this subject. They see it in their logbook, mark entry and CO sheet.</div>
          </div>
          <button aria-label="Close" onClick={() => setEditing(null)}><X size={16} /></button>
        </div>
        {!faculty.data ? <Loading error={faculty.error} /> : (
          <>
            {faculty.data.length > 6 && <input className={`${input} max-w-xs`} placeholder="Search faculty" value={search} onChange={(e) => setSearch(e.target.value)} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {faculty.data.length === 0 && <div className="text-xs text-slate-500">No faculty in your department yet.</div>}
              {shown.map((f) => (
                <label key={f.id} className={`flex items-center gap-2 text-sm border rounded-xl px-3 py-2 ${picked.includes(f.id) ? "bg-amber-50 border-[#D4A72C]" : "bg-slate-50 border-slate-200"}`}>
                  <input type="checkbox" checked={picked.includes(f.id)}
                    onChange={(e) => setPicked(e.target.checked ? [...picked, f.id] : picked.filter((x) => x !== f.id))} />
                  {f.name} <span className="text-[10px] text-slate-500">({f.username})</span>
                </label>
              ))}
            </div>
            <div className="text-xs text-slate-600">{picked.length ? `Chosen: ${picked.map((id) => nameOf(id) || id).join(", ")}` : "No faculty chosen (the subject will show as not allotted)."}</div>
          </>
        )}
        <div className="flex gap-2">
          <button className={btn} disabled={saving} onClick={save}>{saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save allotment</button>
          <button className="text-xs font-bold" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </div>
    )}
    {mode === "allocation" ? (
      <div className={`${card} overflow-x-auto`}>
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
          <span className="text-sm font-black text-[#0B192C]">{rows.length} subjects · {allotted} allotted</span>
          {rows.length > allotted && <span className="text-xs font-bold text-amber-700">{rows.length - allotted} still need faculty</span>}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr>{["Subject", "Handled by", "Completion", ...(canAllot ? [""] : [])].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td className={td} colSpan={4}>No subjects in this semester. The COE adds them under Subjects.</td></tr>}
            {rows.map((c) => (
              <tr key={c.semester + c.subjectCode} className={editing?.subjectCode === c.subjectCode ? "bg-amber-50/60" : ""}>
                <td className={td}><span className="font-mono font-bold">{c.subjectCode}</span> {c.subjectTitle}
                  <div><button className="text-[11px] font-bold underline text-[#0B192C]" onClick={() => showPlan(c)}>Lesson plan</button></div></td>
                <td className={td}>
                  {c.facultyIds?.length
                    ? <div className="flex flex-wrap gap-1">{c.faculty.split(", ").map((n) => <span key={n} className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">{n}</span>)}</div>
                    : <span className="text-amber-700 font-semibold text-xs">Not allotted</span>}
                </td>
                <td className={td}><Bar c={c} /></td>
                {canAllot && <td className={`${td} text-right`}>
                  <button className={c.facultyIds?.length ? "text-xs font-bold underline text-[#0B192C]" : btn} onClick={() => open(c)}>{c.facultyIds?.length ? "Change faculty" : "Allot faculty"}</button>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr>{["Subject", "Faculty", "Completion", "Behind plan", "Last entry"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td className={td} colSpan={5}>No subjects.</td></tr>}
            {rows.map((c) => (
              <tr key={c.semester + c.subjectCode} className={c.lagging ? "bg-red-50/60" : ""}>
                <td className={td}><span className="font-mono font-bold">{c.subjectCode}</span> {c.subjectTitle}<div className="text-[10px] text-slate-500">Semester {c.semester} · <button className="font-bold underline text-[#0B192C]" onClick={() => showPlan(c)}>Lesson plan</button></div></td>
                <td className={td}>
                  <span className={c.facultyIds?.length ? "" : "text-amber-700 font-semibold"}>{c.faculty}</span>
                </td>
                <td className={td}><Bar c={c} /></td>
                <td className={`${td} ${c.lagging ? "text-red-700 font-bold" : ""}`}>{c.lagging ? `${c.behind} topics` : c.topics ? "On plan" : "No syllabus yet"}</td>
                <td className={td}>{c.lastEntry || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    </>
  );
}

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

/**
 * HOD (own department) and Associate Dean (any department of the college): choose the year and semester, then
 * "Subject allocation" (which subjects, who handles them; the HOD allots faculty here) and "Completion".
 */
export function CompletionReport({ fixedDept, onToast }: { fixedDept?: string; onToast?: (m: string) => void }) {
  const isHod = authApi.currentUser()?.role === "HOD";
  const depts = useLoad<{ key: string; name: string; code: string }[]>(fixedDept ? null : "/admin/departments");
  const [dept, setDept] = useState(fixedDept || "");
  const [year, setYear] = useState(1);
  const [sem, setSem] = useState(1);
  const [tab, setTab] = useState<"allocation" | "completion">("allocation");
  useEffect(() => { if (!dept && depts.data?.length) setDept(depts.data[0].key); }, [depts.data]);
  const pickYear = (y: number) => { setYear(y); setSem(2 * y - 1); };
  const canAllot = isHod && dept === myDept();
  const sel = "h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-[#0B192C] focus:outline-none";
  const lbl = "text-[11px] font-bold text-slate-500 uppercase";
  return (
    <div className="space-y-5">
      <Title title="Subject allocation & completion" detail={isHod
        ? "Choose the year and semester, allot each subject to the faculty who handle it, then follow its syllabus completion from their logbooks."
        : "Choose the year and semester to see who handles each subject and its syllabus completion from the faculty logbooks."} />
      <div className={`${card} p-4 flex flex-wrap items-center gap-4`}>
        {!fixedDept && (
          <select className={`${input} max-w-xs`} value={dept} onChange={(e) => setDept(e.target.value)}>
            {depts.data?.map((d) => <option key={d.key} value={d.key}>{d.code} — {d.name}</option>)}
          </select>
        )}
        <div className="flex items-center gap-1.5">
          <label className={lbl}>Year:</label>
          <select className={sel} value={year} onChange={(e) => pickYear(Number(e.target.value))}>
            {YEARS.map((y, i) => <option key={y} value={i + 1}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label className={lbl}>Semester:</label>
          <select className={sel} value={sem} onChange={(e) => setSem(Number(e.target.value))}>
            {[2 * year - 1, 2 * year].map((n) => <option key={n} value={n}>{SEMESTERS[n - 1]}</option>)}
          </select>
        </div>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[["allocation", "Subject allocation"], ["completion", "Completion"]]} />
      {dept && <CompletionTable key={`${dept}-${sem}-${tab}`} dept={dept} semester={SEMESTERS[sem - 1]} mode={tab} canAllot={canAllot} onToast={onToast} />}
    </div>
  );
}

// ---------------------------------------------------------------- performance

type Score = { code: string; name: string; weight: number; score: number | null; detail: string };
type Scorecard = { userId: number; username: string; name: string; deptKey: string; academicYear: string; term: string; total: number | null; scores: Score[];
  hodRemarks: string | null; hodBy: string | null; deanRemarks: string | null; deanBy: string | null; computedAt: string };
type Measure = { code: string; name: string; description: string; weight: number };

const BANDS = [
  { min: 85, label: "Excellent", text: "text-emerald-700", soft: "bg-emerald-50 border-emerald-200", bar: "bg-emerald-500", ring: "border-emerald-500" },
  { min: 70, label: "Good", text: "text-sky-700", soft: "bg-sky-50 border-sky-200", bar: "bg-sky-500", ring: "border-sky-500" },
  { min: 55, label: "Average", text: "text-amber-700", soft: "bg-amber-50 border-amber-200", bar: "bg-amber-500", ring: "border-amber-500" },
  { min: 0, label: "Needs attention", text: "text-red-700", soft: "bg-red-50 border-red-200", bar: "bg-red-500", ring: "border-red-500" },
];
const band = (v: number | null | undefined) => (v == null ? null : BANDS.find((x) => v >= x.min)!);
const counted = (s: Scorecard) => s.scores.filter((m) => m.score != null && Number(m.weight) > 0);
const shareOf = (s: Scorecard, m: Score) => {
  const total = counted(s).reduce((n, x) => n + Number(x.weight), 0);
  return total ? Math.round((Number(m.weight) * 100) / total) : 0;
};
const best = (s: Scorecard) => [...counted(s)].sort((x, y) => (y.score ?? 0) - (x.score ?? 0))[0];
const worst = (s: Scorecard) => [...counted(s)].sort((x, y) => (x.score ?? 0) - (y.score ?? 0))[0];

function Grade({ v }: { v: number | null }) {
  const b = band(v);
  return b
    ? <span className={`inline-block text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${b.soft} ${b.text}`}>{b.label}</span>
    : <span className="inline-block text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200 text-slate-500">No data yet</span>;
}

/** How the score is made, in plain words: the grade bands and every measure with its share. */
function HowScored({ measures, dean, onSaved, onToast }: { measures: Measure[] | null; dean?: boolean; onSaved?: () => void; onToast?: (m: string) => void }) {
  const [weights, setWeights] = useState<Record<string, string>>({});
  useEffect(() => { if (measures) setWeights(Object.fromEntries(measures.map((m) => [m.code, String(Number(m.weight))]))); }, [measures]);
  const total = (measures || []).reduce((n, m) => n + Number(m.weight), 0);
  const save = async () => {
    try {
      await apiClient.put("/erp/performance/measures", { weights: Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, Number(v || 0)])) });
      onToast ? onToast("Weights saved; scorecards recalculated.") : alert("Weights saved; scorecards recalculated.");
      onSaved?.();
    } catch (e) { alert(apiErrorMessage(e, "Could not save the weights.")); }
  };
  return (
    <details className={`${card} p-5 group`} open={dean}>
      <summary className="cursor-pointer text-sm font-black text-[#0B192C] list-none flex items-center justify-between">
        How is the score calculated?<span className="text-xs font-bold text-slate-500 group-open:hidden">Show</span><span className="text-xs font-bold text-slate-500 hidden group-open:inline">Hide</span>
      </summary>
      <div className="mt-4 space-y-4 text-xs text-slate-600">
        <p>The ERP calculates every score from what is already recorded: results, internal marks, the logbook, leave and student feedback. <strong>Nobody types in a score.</strong> Each item is scored out of 100, and the overall score is their weighted average. Items with no data yet are left out, so they do not pull anyone down.</p>
        <div className="flex flex-wrap gap-2">
          {BANDS.map((b, i) => <span key={b.label} className={`px-2.5 py-1 rounded-full border font-bold ${b.soft} ${b.text}`}>{b.label}: {i === 0 ? "85 and above" : `${b.min} to ${BANDS[i - 1].min - 1}`}</span>)}
        </div>
        {!measures ? null : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {measures.map((m) => (
              <div key={m.code} className="flex items-start justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <span><strong className="text-slate-800">{m.name}</strong><span className="block text-[11px] text-slate-500">{m.description}</span></span>
                {dean
                  ? <input type="number" min={0} max={100} aria-label={`Weight of ${m.name}`} className={`${input} max-w-[80px]`} value={weights[m.code] ?? ""} onChange={(e) => setWeights({ ...weights, [m.code]: e.target.value })} />
                  : <span className="text-right font-black text-slate-800 whitespace-nowrap">{Number(m.weight) ? `${Math.round((Number(m.weight) * 100) / (total || 1))}%` : "Not counted"}</span>}
              </div>
            ))}
          </div>
        )}
        {dean && <div className="flex justify-end"><button className={btn} onClick={save}>Save weights</button></div>}
      </div>
    </details>
  );
}

function ScorecardCard({ s, measures, remarkAs, onSaved }: { s: Scorecard; measures?: Measure[] | null; remarkAs?: "HOD" | "DEAN"; onSaved?: () => void }) {
  const b = band(s.total);
  const desc = (code: string) => measures?.find((m) => m.code === code)?.description;
  const shown = counted(s).sort((x, y) => Number(y.weight) - Number(x.weight));
  const missing = s.scores.filter((m) => m.score == null || Number(m.weight) === 0);
  const top = best(s);
  const low = worst(s);
  const mine = remarkAs === "DEAN" ? s.deanRemarks : s.hodRemarks;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(mine || "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try { await apiClient.post(`/erp/performance/${s.userId}/remarks`, { remarks: text.trim() }); setEditing(false); onSaved?.(); }
    catch (e) { alert(apiErrorMessage(e, "Could not save the remarks.")); }
    finally { setSaving(false); }
  };
  return (
    <div className={`${card} p-5 space-y-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-[#0B192C]">{s.name}</h3>
          <p className="text-[11px] text-slate-500">{s.username} · {s.deptKey.toUpperCase()} · {s.academicYear}, {s.term === "ODD" ? "odd" : "even"} semester</p>
          <div className="mt-2"><Grade v={s.total} /></div>
        </div>
        <div className={`w-20 h-20 shrink-0 rounded-full border-[6px] ${b ? b.ring : "border-slate-200"} flex flex-col items-center justify-center`}>
          <span className="text-2xl font-black text-[#0B192C] leading-none">{s.total != null ? Math.round(s.total) : "—"}</span>
          <span className="text-[9px] text-slate-500">out of 100</span>
        </div>
      </div>
      {top && low && top.code !== low.code && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2"><span className="block text-[10px] font-black uppercase text-emerald-700">Doing well</span><strong>{top.name}</strong> · {Math.round(top.score!)}</div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2"><span className="block text-[10px] font-black uppercase text-amber-700">Can improve</span><strong>{low.name}</strong> · {Math.round(low.score!)}</div>
        </div>
      )}
      <div className="space-y-3">
        {shown.map((m) => {
          const mb = band(m.score)!;
          return (
            <div key={m.code} className="text-xs">
              <div className="flex justify-between gap-3">
                <span><strong className="text-slate-800">{m.name}</strong> <span className="text-slate-400">· counts {shareOf(s, m)}% of the total</span></span>
                <span className={`font-black ${mb.text}`}>{Math.round(m.score!)}<span className="text-slate-400 font-semibold"> / 100</span></span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1"><div className={`h-full ${mb.bar}`} style={{ width: `${m.score}%` }} /></div>
              <div className="text-[11px] text-slate-500 mt-0.5">{m.detail}{desc(m.code) ? <span className="text-slate-400"> · {desc(m.code)}</span> : null}</div>
            </div>
          );
        })}
        {shown.length === 0 && <p className="text-xs text-slate-500">No data yet. The score appears once subjects are allotted and the logbook is filled.</p>}
      </div>
      {missing.length > 0 && (
        <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
          <strong className="text-slate-600">Not counted yet:</strong> {missing.map((m) => `${m.name} (${Number(m.weight) === 0 ? "not counted" : m.detail.toLowerCase()})`).join(" · ")}
        </div>
      )}
      {(s.hodRemarks || s.deanRemarks) && !editing && (
        <div className="text-xs space-y-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
          {s.hodRemarks && <p><strong>HOD remarks</strong> <span className="text-slate-400">({s.hodBy})</span><br />{s.hodRemarks}</p>}
          {s.deanRemarks && <p><strong>Associate Dean remarks</strong> <span className="text-slate-400">({s.deanBy})</span><br />{s.deanRemarks}</p>}
        </div>
      )}
      {remarkAs && (editing ? (
        <div className="space-y-2">
          <textarea className={input} rows={3} maxLength={1000} placeholder="Your remarks for this faculty member" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex gap-2">
            <button className={btn} disabled={saving || !text.trim()} onClick={save}>{saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save remarks</button>
            <button className="text-xs font-bold" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : <button className="text-xs font-bold underline text-[#0B192C]" onClick={() => { setText(mine || ""); setEditing(true); }}>{mine ? "Edit my remarks" : "Add remarks"}</button>)}
      <p className="text-[10px] text-slate-400">Calculated by the ERP on {s.computedAt}.</p>
    </div>
  );
}

export function MyScorecard() {
  const me = useLoad<Scorecard>("/erp/performance/me");
  const measures = useLoad<Measure[]>("/erp/performance/measures");
  return (
    <div className="space-y-5">
      <Title title="My performance" detail="Your scorecard for this semester, calculated from your results, internal marks, logbook, leave, marks submission and student feedback. Only you, your HOD and the Associate Dean see it." />
      {!me.data ? <Loading error={me.error} /> : <ScorecardCard s={me.data} measures={measures.data} />}
      <HowScored measures={measures.data} />
    </div>
  );
}

/** HOD: the department's scorecards with remarks. Associate Dean: the college, with the measure weights. */
export function PerformanceReview({ dean, onToast }: { dean?: boolean; onToast?: (m: string) => void }) {
  const [dept, setDept] = useState("");
  const depts = useLoad<{ key: string; name: string; code: string }[]>(dean ? "/admin/departments" : null);
  const list = useLoad<Scorecard[]>("/erp/performance", dean && dept ? { dept } : undefined);
  const measures = useLoad<Measure[]>("/erp/performance/measures");
  const [open, setOpen] = useState<number | null>(null);
  const rows = useMemo(() => [...(list.data || [])].sort((x, y) => (y.total ?? -1) - (x.total ?? -1)), [list.data]);
  const scored = rows.filter((r) => r.total != null);
  const avg = scored.length ? Math.round(scored.reduce((n, r) => n + (r.total ?? 0), 0) / scored.length) : null;
  const count = (label: string) => scored.filter((r) => band(r.total)?.label === label).length;
  const tiles: [string, string, string][] = [
    ["Faculty", String(rows.length), "text-[#0B192C]"],
    ["Average score", avg == null ? "—" : String(avg), band(avg)?.text || "text-[#0B192C]"],
    ["Excellent or good", String(count("Excellent") + count("Good")), "text-emerald-700"],
    ["Need attention", String(count("Needs attention")), "text-red-700"],
  ];
  return (
    <div className="space-y-5">
      <Title title="Faculty performance" detail={dean
        ? "Scorecards of the college for this semester, calculated by the ERP. Click a faculty member to see why they got their score and add your remarks."
        : "Scorecards of your department for this semester, calculated by the ERP. Click a faculty member to see why they got their score and add your remarks."} />
      {dean && (
        <select className={`${input} max-w-xs`} value={dept} onChange={(e) => { setDept(e.target.value); setOpen(null); }}>
          <option value="">All departments</option>{depts.data?.map((d) => <option key={d.key} value={d.key}>{d.code} — {d.name}</option>)}
        </select>
      )}
      {!list.data ? <Loading error={list.error} /> : rows.length === 0 ? <p className="text-sm text-slate-500">No faculty.</p> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tiles.map(([label, value, color]) => (
              <div key={label} className={`${card} px-5 py-4`}><span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span><span className={`text-3xl font-black ${color}`}>{value}</span></div>
            ))}
          </div>
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr>{["#", "Faculty", "Score", "Grade", "Doing well", "Can improve", "Remarks"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => {
                  const b = band(r.total);
                  const top = best(r);
                  const low = worst(r);
                  const isOpen = open === r.userId;
                  return (
                    <React.Fragment key={r.userId}>
                      <tr className={`cursor-pointer hover:bg-amber-50/50 ${isOpen ? "bg-amber-50/60" : ""}`} onClick={() => setOpen(isOpen ? null : r.userId)}>
                        <td className={`${td} font-black text-slate-400`}>{r.total != null ? i + 1 : "—"}</td>
                        <td className={td}><span className="font-bold text-[#0B192C]">{r.name}</span><div className="text-[10px] text-slate-500">{r.username}{dean ? ` · ${r.deptKey.toUpperCase()}` : ""}</div></td>
                        <td className={td}>
                          <div className="flex items-center gap-2"><div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${b?.bar || "bg-slate-300"}`} style={{ width: `${r.total ?? 0}%` }} /></div>
                            <span className="font-black">{r.total != null ? Math.round(r.total) : "—"}</span></div>
                        </td>
                        <td className={td}><Grade v={r.total} /></td>
                        <td className={`${td} text-xs`}>{top ? `${top.name} (${Math.round(top.score!)})` : "—"}</td>
                        <td className={`${td} text-xs`}>{low && top && low.code !== top.code ? <span className={band(low.score)!.text}>{low.name} ({Math.round(low.score!)})</span> : "—"}</td>
                        <td className={`${td} text-xs`}>{(dean ? r.deanRemarks : r.hodRemarks) ? <span className="text-emerald-700 font-bold">Added</span> : <span className="text-slate-400">—</span>} <span className="ml-2 text-[#0B192C] font-bold underline">{isOpen ? "Hide" : "View"}</span></td>
                      </tr>
                      {isOpen && (
                        <tr><td colSpan={7} className="px-4 py-4 bg-slate-50/60">
                          <ScorecardCard s={r} measures={measures.data} remarkAs={dean ? "DEAN" : "HOD"} onSaved={() => { onToast?.("Remarks saved."); list.reload(); }} />
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <HowScored measures={measures.data} dean={dean} onToast={onToast} onSaved={() => { measures.reload(); list.reload(); }} />
    </div>
  );
}

// ---------------------------------------------------------------- student fees

type Demand = { id: number; head: string; structure: string; academicYear: string; amount: number; concession: number; paid: number; balance: number; dueDate: string; overdue: boolean; kind: "ANNUAL" | "EXAM" };
type Payment = { id: number; amount: number; status: string; receiptNo: string | null; paidAt: string | null; createdAt: string };
type FeeSummary = { demands: Demand[]; payments: Payment[]; clearance: { hallTicketBlocked: boolean; busPassBlocked: boolean; message: string }; balance: number; onlinePayment: boolean; testGateway: boolean };
type Order = { orderId: string; amount: number; gateway: string; keyId: string | null; studentName: string };

declare global {
  interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void } }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res();
    s.onerror = () => rej(new Error("The payment page could not be loaded"));
    document.body.appendChild(s);
  });
}

export function StudentFees({ onToast }: { onToast?: (m: string) => void }) {
  const fees = useLoad<FeeSummary>("/erp/fees");
  const [pending, setPending] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  // No ids: every open due; with ids: only those (e.g. just the exam fee)
  const pay = async (demandIds?: number[]) => {
    setBusy(true);
    try {
      const order = (await apiClient.post<Order>("/erp/fees/pay", demandIds ? { demandIds } : {})).data;
      if (order.gateway === "RAZORPAY" && order.keyId) {
        await loadRazorpay();
        new window.Razorpay!({
          key: order.keyId, order_id: order.orderId, amount: Math.round(order.amount * 100), currency: "INR",
          name: "KVELL University", description: "Fees", prefill: { name: order.studentName },
          // The receipt appears when the gateway confirms the payment to the server
          handler: () => { onToast?.("Payment done. Your receipt appears as soon as the bank confirms it."); setTimeout(fees.reload, 4000); },
        }).open();
      } else {
        setPending(order);
      }
    } catch (e) { alert(apiErrorMessage(e, "The payment could not be started.")); }
    finally { setBusy(false); }
  };
  const confirmTest = async () => {
    if (!pending) return;
    try {
      const p = (await apiClient.post<Payment>(`/erp/fees/pay/${pending.orderId}/test-confirm`)).data;
      onToast?.(`Payment of ${inr(p.amount)} confirmed. Receipt ${p.receiptNo}.`);
      setPending(null);
      fees.reload();
    } catch (e) { alert(apiErrorMessage(e, "The test payment failed.")); }
  };
  if (!fees.data) return <Loading error={fees.error} />;
  const f = fees.data;
  const examDues = f.demands.filter((d) => d.kind === "EXAM");
  const otherDues = f.demands.filter((d) => d.kind !== "EXAM");
  const examOpen = examDues.filter((d) => d.balance > 0);
  const examBalance = examOpen.reduce((t, d) => t + d.balance, 0);
  const dueRows = (list: Demand[]) => list.map((d) => (
    <tr key={d.id}><td className={`${td} font-bold`}>{d.head}</td><td className={td}>{d.structure}</td><td className={td}>{inr(d.amount)}</td><td className={td}>{inr(d.concession)}</td>
      <td className={td}>{inr(d.paid)}</td><td className={`${td} font-bold`}>{inr(d.balance)}</td>
      <td className={`${td} ${d.overdue ? "text-red-700 font-bold" : ""}`}>{d.dueDate}{d.overdue ? " (overdue)" : ""}</td></tr>
  ));
  const head = <thead className="bg-slate-50"><tr>{["Fee", "For", "Amount", "Concession", "Paid", "Balance", "Due date"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>;
  return (
    <div className="space-y-5">
      <Title title="Fees" detail="Your fees, payments and receipts. A payment is recorded only when the bank / payment gateway confirms it." />
      <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${f.clearance.hallTicketBlocked ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"}`}>
        {f.clearance.message}
      </div>
      <div className={`${card} p-5 flex flex-wrap items-center justify-between gap-3`}>
        <div><span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Balance to pay</span><span className="text-3xl font-black text-[#0B192C]">{inr(f.balance)}</span></div>
        {f.balance > 0 && (f.onlinePayment
          ? <button className={btn} disabled={busy} onClick={() => pay()}>{busy && <Loader2 size={14} className="animate-spin" />} Pay all {inr(f.balance)} online</button>
          : <span className="text-xs text-slate-600">Online payment is not set up yet. Please pay at the Accounts office.</span>)}
      </div>
      {examDues.length > 0 && (
        <div className={`${card} overflow-x-auto ${examBalance > 0 ? "ring-2 ring-[#D4A72C]" : ""}`}>
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-[#0B192C]">End-semester exam fee</h3>
              <p className="text-xs text-slate-500">{examBalance > 0 ? "Pay this before the exam: the hall ticket is released once it is paid." : "Paid. Your hall ticket is not held for the exam fee."}</p>
            </div>
            {examBalance > 0 && f.onlinePayment && (
              <button className={btn} disabled={busy} onClick={() => pay(examOpen.map((d) => d.id))}>{busy && <Loader2 size={14} className="animate-spin" />} Pay exam fee {inr(examBalance)}</button>
            )}
          </div>
          <table className="w-full text-sm">{head}<tbody className="divide-y divide-slate-100">{dueRows(examDues)}</tbody></table>
        </div>
      )}
      <div className={`${card} overflow-x-auto`}>
        {examDues.length > 0 && <h3 className="px-5 pt-4 font-black text-[#0B192C]">Other fees</h3>}
        <table className="w-full text-sm">
          {head}
          <tbody className="divide-y divide-slate-100">
            {otherDues.length === 0 && <tr><td className={td} colSpan={7}>No fees raised yet.</td></tr>}
            {dueRows(otherDues)}
          </tbody>
        </table>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <div className="px-5 py-3 border-b border-slate-100 text-sm font-black text-[#0B192C]">Receipts</div>
        {f.payments.length === 0 ? <p className="p-5 text-sm text-slate-500">No payments yet.</p> : (
          <table className="w-full text-sm"><tbody className="divide-y divide-slate-100">
            {f.payments.map((p) => (
              <tr key={p.id}><td className={td}>{p.paidAt}</td><td className={`${td} font-bold`}>{inr(p.amount)}</td><td className={`${td} font-mono text-xs`}>{p.receiptNo}</td>
                <td className={`${td} text-right`}><button className="text-xs font-black underline inline-flex items-center gap-1" onClick={() => openFile(`/erp/fees/receipts/${(p.receiptNo || "").replace(/\//g, "_")}`)}><Download size={12} /> Receipt PDF</button></td></tr>
            ))}
          </tbody></table>
        )}
      </div>
      {pending && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-label="Test payment" className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-black text-[#0B192C] flex items-center gap-2"><Clock size={18} /> Test payment gateway</h3>
            <p className="text-sm text-slate-600">No real payment gateway is set up on this computer, so this simulated gateway stands in for the bank. Confirming records the payment exactly as the real gateway's confirmation would.</p>
            <p className="text-sm">Amount: <strong>{inr(pending.amount)}</strong> · Order {pending.orderId}</p>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600" onClick={() => setPending(null)}>Cancel (not paid)</button>
              <button className={btn} onClick={confirmTest}><CheckCircle2 size={14} /> Confirm payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** The signed-in user's department (HOD screens). */
export const myDept = () => authApi.currentUser()?.departmentKey || "";
