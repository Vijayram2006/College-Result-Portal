import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Download, Loader2, Paperclip, Plus, Trash2, X } from "lucide-react";
import { apiClient, apiErrorMessage, authApi } from "../../services/api";

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
};
const approverLabel: Record<string, string> = { CLASS_INCHARGE: "Class in-charge", HOD: "HOD", DEAN: "Associate Dean" };

/** Apply for leave and follow one's own requests (student, faculty, HOD). */
export function LeaveApply({ onToast }: { onToast?: (m: string) => void }) {
  const types = useLoad<LeaveType[]>("/erp/leave/types");
  const mine = useLoad<Leave[]>("/erp/leave/mine");
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ leaveCode: "", fromDate: today, toDate: today, halfDay: "", reason: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const chosen = types.data?.find((t) => t.code === form.leaveCode);

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
      const r = await apiClient.post<Leave>("/erp/leave", { ...form, halfDay: form.halfDay || null, ...attachment });
      onToast?.(`Leave request sent to the ${approverLabel[r.data.approverRole]}.`);
      setForm({ ...form, reason: "" });
      setFile(null);
      mine.reload();
      types.reload();
    } catch (e) {
      alert(e instanceof Error && !("response" in e) ? e.message : apiErrorMessage(e, "The leave request could not be sent."));
    } finally {
      setBusy(false);
    }
  };
  const cancel = async (l: Leave) => {
    if (!window.confirm("Cancel this leave request?")) return;
    try { await apiClient.post(`/erp/leave/${l.id}/cancel`); mine.reload(); types.reload(); }
    catch (e) { alert(apiErrorMessage(e, "Could not cancel.")); }
  };

  return (
    <div className="space-y-5">
      <Title title="Leave" detail="Apply for leave. It goes to your approver automatically: students → class in-charge, faculty → HOD, HOD → Associate Dean. You are notified of the decision." />
      <div className={`${card} p-5 space-y-4`}>
        {!types.data ? <Loading error={types.error} /> : (
          <>
            <div className="flex flex-wrap gap-2">
              {types.data.filter((t) => t.yearlyDays != null && t.remaining != null).map((t) => (
                <span key={t.code} className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  <strong>{t.name}</strong>: {t.remaining} of {t.yearlyDays} days left
                </span>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="text-xs font-bold text-slate-600">Leave type
                <select className={input} value={form.leaveCode} onChange={(e) => setForm({ ...form, leaveCode: e.target.value })}>
                  <option value="">Choose</option>
                  {types.data.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">From<input type="date" className={input} value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value, toDate: e.target.value > form.toDate ? e.target.value : form.toDate })} /></label>
              <label className="text-xs font-bold text-slate-600">To<input type="date" className={input} value={form.toDate} min={form.fromDate} disabled={!!form.halfDay} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></label>
              <label className="text-xs font-bold text-slate-600">Full / half day
                <select className={input} value={form.halfDay} onChange={(e) => setForm({ ...form, halfDay: e.target.value, toDate: e.target.value ? form.fromDate : form.toDate })}>
                  <option value="">Full day(s)</option><option value="FN">Half day – forenoon</option><option value="AN">Half day – afternoon</option>
                </select>
              </label>
            </div>
            <label className="text-xs font-bold text-slate-600 block">Reason<textarea className={input} rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="text-xs font-bold text-slate-600 inline-flex items-center gap-2">
                <Paperclip size={14} /> Attachment {chosen?.needsAttachment ? "(required)" : "(optional)"}: PDF / JPG / PNG, max 2 MB
                <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
              <button className={btn} disabled={busy || !form.leaveCode || form.reason.trim().length < 5} onClick={apply}>
                {busy && <Loader2 size={14} className="animate-spin" />} Send request
              </button>
            </div>
          </>
        )}
      </div>
      <LeaveTable title="My leave requests" data={mine.data} error={mine.error} actions={(l) => l.status === "PENDING" && (
        <button className="text-xs font-bold text-red-700 underline" onClick={() => cancel(l)}>Cancel</button>
      )} />
    </div>
  );
}

/** Requests waiting for the signed-in approver: class in-charge (students), HOD (faculty), Associate Dean (HODs). */
export function LeaveInbox({ title = "Leave approvals", detail, onToast }: { title?: string; detail?: string; onToast?: (m: string) => void }) {
  const inbox = useLoad<Leave[]>("/erp/leave/inbox");
  const decide = async (l: Leave, approve: boolean) => {
    const remarks = window.prompt(approve ? "Remarks (optional)" : "Reason for rejecting (required)") ?? null;
    if (remarks === null) return;
    try {
      const r = await apiClient.post<Leave>(`/erp/leave/${l.id}/decide`, { approve, remarks });
      onToast?.(`Leave ${approve ? "approved" : "rejected"}; ${l.applicant} has been notified.`
        + (r.data.substitutions.length ? ` ${r.data.substitutions.length} substitute classes suggested.` : ""));
      inbox.reload();
    } catch (e) { alert(apiErrorMessage(e, "The decision could not be saved.")); }
  };
  return (
    <div className="space-y-5">
      <Title title={title} detail={detail || "Approve or reject with remarks. Approved leave reduces the balance; for faculty a substitute is suggested for each class missed."} />
      <LeaveTable title="Requests" data={inbox.data} error={inbox.error} showApplicant actions={(l) => l.status === "PENDING" && (
        <span className="whitespace-nowrap">
          <button className="mr-3 text-xs font-black text-emerald-700" onClick={() => decide(l, true)}>Approve</button>
          <button className="text-xs font-black text-red-700" onClick={() => decide(l, false)}>Reject</button>
        </span>
      )} />
    </div>
  );
}

function LeaveTable({ title, data, error, actions, showApplicant }: { title: string; data: Leave[] | null; error: string | null; actions: (l: Leave) => React.ReactNode; showApplicant?: boolean }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="px-5 py-3 border-b border-slate-100 text-sm font-black text-[#0B192C]">{title}</div>
      {!data ? <Loading error={error} /> : data.length === 0 ? <p className="p-6 text-sm text-slate-500">No leave requests.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr>
              {showApplicant && <th className={th}>Applicant</th>}
              <th className={th}>Leave</th><th className={th}>Dates</th><th className={th}>Reason</th><th className={th}>Status</th><th className={th}></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((l) => (
                <tr key={l.id} className="align-top">
                  {showApplicant && <td className={td}><strong>{l.applicant}</strong><div className="text-[10px] text-slate-500">{l.regNo || l.applicantRole} · {l.deptKey?.toUpperCase()}</div></td>}
                  <td className={td}>{l.leaveName}<div className="text-[10px] text-slate-500">{l.days} day{Number(l.days) === 1 ? "" : "s"}{l.halfDay ? ` (${l.halfDay})` : ""}</div></td>
                  <td className={td}>{l.fromDate}{l.toDate !== l.fromDate ? ` → ${l.toDate}` : ""}<div className="text-[10px] text-slate-500">applied {l.createdAt}</div></td>
                  <td className={`${td} max-w-xs`}>{l.reason}
                    {l.hasAttachment && <button className="block text-[11px] font-bold underline mt-1" onClick={() => openFile(`/erp/leave/${l.id}/attachment`)}>View attachment</button>}
                    {l.substitutions.length > 0 && (
                      <details className="mt-1 text-[11px]"><summary className="cursor-pointer font-bold">Substitutes ({l.substitutions.length})</summary>
                        <ul>{l.substitutions.map((s, i) => <li key={i}>{s.date} · {s.subjectCode} → {s.substitute}</li>)}</ul>
                      </details>
                    )}
                  </td>
                  <td className={td}>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusTone[l.status]}`}>{l.status}</span>
                    <div className="text-[10px] text-slate-500 mt-1">{l.decidedBy ? `by ${l.decidedBy}` : `with ${approverLabel[l.approverRole]}`}</div>
                    {l.decisionRemarks && <div className="text-[10px] italic text-slate-600">"{l.decisionRemarks}"</div>}
                  </td>
                  <td className={`${td} text-right`}>{actions(l)}</td>
                </tr>
              ))}
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
      <Title title="Logbook & subject completion" detail="Add the syllabus once per subject, then log every class (date, period, topic, method). Completion updates by itself. Entries lock a few days after the class." />
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
          <Tabs value={tab} onChange={setTab} tabs={[["log", "Daily logbook"], ["syllabus", `Syllabus (${units.data?.reduce((n, u) => n + u.topics.length, 0) ?? 0} topics)`]]} />
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
        <label className="text-xs font-bold text-slate-600 block">Topic covered (from the syllabus)
          <select className={input} value={form.topicId} onChange={(e) => setForm({ ...form, topicId: e.target.value })}>
            <option value="">{topics.length ? "Other topic (type below)" : "Add the syllabus first, or type the topic below"}</option>
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
        <button className={btn} onClick={save} disabled={draft.some((u) => !u.title.trim())}>Save syllabus</button>
      </div>
    </div>
  );
}

type Completion = { deptKey: string; semester: number; subjectCode: string; subjectTitle: string; faculty: string; facultyIds: number[]; topics: number; covered: number; percent: number; behind: number; lastEntry: string | null; lagging: boolean };

/** canAllot: the HOD of the department allots each subject to its faculty from this table. */
function CompletionTable({ dept, semester, canAllot, onToast }: { dept: string; semester?: string; canAllot?: boolean; onToast?: (m: string) => void }) {
  const data = useLoad<Completion[]>(dept ? "/erp/logbook/completion" : null, { dept, semester });
  const faculty = useLoad<{ id: number; username: string; name: string }[]>(canAllot ? "/erp/classes/faculty" : null);
  const [editing, setEditing] = useState<Completion | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const open = (c: Completion) => { setEditing(c); setPicked(c.facultyIds || []); };
  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiClient.put("/erp/classes/subject-faculty", { semester: String(editing.semester), subject: editing.subjectCode, facultyUserIds: picked });
      onToast?.(`${editing.subjectCode} allotted; the faculty have been notified.`);
      setEditing(null);
      data.reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not allot the subject.")); }
    finally { setSaving(false); }
  };
  if (!data.data) return <Loading error={data.error} />;
  return (
    <>
    {editing && (
      <div className={`${card} p-5 space-y-3`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-[#0B192C]">Allot {editing.subjectCode} — {editing.subjectTitle}</div>
            <div className="text-xs text-slate-500">Semester {editing.semester}. The chosen faculty see it in their logbook, mark entry and CO sheet.</div>
          </div>
          <button aria-label="Close" onClick={() => setEditing(null)}><X size={16} /></button>
        </div>
        {!faculty.data ? <Loading error={faculty.error} /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {faculty.data.length === 0 && <div className="text-xs text-slate-500">No faculty in your department yet.</div>}
            {faculty.data.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <input type="checkbox" checked={picked.includes(f.id)}
                  onChange={(e) => setPicked(e.target.checked ? [...picked, f.id] : picked.filter((x) => x !== f.id))} />
                {f.name} <span className="text-[10px] text-slate-500">({f.username})</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button className={btn} disabled={saving} onClick={save}>{saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save allotment</button>
          <button className="text-xs font-bold" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </div>
    )}
    <div className={`${card} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr>{["Subject", "Faculty", "Completion", "Behind plan", "Last entry"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {data.data.length === 0 && <tr><td className={td} colSpan={5}>No subjects.</td></tr>}
          {data.data.map((c) => (
            <tr key={c.semester + c.subjectCode} className={c.lagging ? "bg-red-50/60" : ""}>
              <td className={td}><span className="font-mono font-bold">{c.subjectCode}</span> {c.subjectTitle}<div className="text-[10px] text-slate-500">Semester {c.semester}</div></td>
              <td className={td}>
                <span className={c.facultyIds?.length ? "" : "text-amber-700 font-semibold"}>{c.faculty}</span>
                {canAllot && <button className="ml-2 text-xs font-bold underline text-[#0B192C]" onClick={() => open(c)}>{c.facultyIds?.length ? "Change" : "Allot"}</button>}
              </td>
              <td className={td}><div className="flex items-center gap-2"><div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${c.percent}%` }} /></div>
                <span className="text-xs">{c.percent}% ({c.covered}/{c.topics})</span></div></td>
              <td className={`${td} ${c.lagging ? "text-red-700 font-bold" : ""}`}>{c.lagging ? `${c.behind} topics` : c.topics ? "On plan" : "No syllabus yet"}</td>
              <td className={td}>{c.lastEntry || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

/**
 * HOD (own department; allots each subject to its faculty here) and Associate Dean (any department of the college):
 * completion by subject and faculty.
 */
export function CompletionReport({ fixedDept, onToast }: { fixedDept?: string; onToast?: (m: string) => void }) {
  const isHod = authApi.currentUser()?.role === "HOD";
  const depts = useLoad<{ key: string; name: string; code: string }[]>(fixedDept ? null : "/admin/departments");
  const [dept, setDept] = useState(fixedDept || "");
  const [semester, setSemester] = useState("");
  useEffect(() => { if (!dept && depts.data?.length) setDept(depts.data[0].key); }, [depts.data]);
  return (
    <div className="space-y-5">
      <Title title="Subject completion" detail={isHod
        ? "Allot each subject to the faculty who handle it, then follow its syllabus completion from their logbooks. Subjects behind plan are highlighted in red."
        : "Syllabus completion of every subject from the faculty logbooks. Subjects behind plan are highlighted in red."} />
      <div className={`${card} p-4 flex flex-wrap gap-3`}>
        {!fixedDept && (
          <select className={`${input} max-w-xs`} value={dept} onChange={(e) => setDept(e.target.value)}>
            {depts.data?.map((d) => <option key={d.key} value={d.key}>{d.code} — {d.name}</option>)}
          </select>
        )}
        <select className={`${input} max-w-xs`} value={semester} onChange={(e) => setSemester(e.target.value)}>
          <option value="">All semesters</option>{SEMESTERS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {dept && <CompletionTable dept={dept} semester={semester || undefined} canAllot={isHod && dept === myDept()} onToast={onToast} />}
    </div>
  );
}

// ---------------------------------------------------------------- performance

type Score = { code: string; name: string; weight: number; score: number | null; detail: string };
type Scorecard = { userId: number; username: string; name: string; deptKey: string; academicYear: string; term: string; total: number | null; scores: Score[];
  hodRemarks: string | null; hodBy: string | null; deanRemarks: string | null; deanBy: string | null; computedAt: string };

function ScorecardCard({ s, onRemarks }: { s: Scorecard; onRemarks?: (s: Scorecard) => void }) {
  return (
    <div className={`${card} p-5 space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-black text-[#0B192C]">{s.name}</h3><p className="text-[11px] text-slate-500">{s.username} · {s.deptKey.toUpperCase()} · {s.academicYear} {s.term} term</p></div>
        <div className="text-right"><span className="block text-3xl font-black text-[#0B192C]">{s.total ?? "—"}</span><span className="text-[10px] text-slate-500">out of 100</span></div>
      </div>
      <div className="space-y-1.5">
        {s.scores.map((m) => (
          <div key={m.code} className="text-xs">
            <div className="flex justify-between"><span><strong>{m.name}</strong> <span className="text-slate-400">· weight {m.weight}</span></span><span className="font-bold">{m.score ?? "—"}</span></div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#D4A72C]" style={{ width: `${m.score ?? 0}%` }} /></div>
            <div className="text-[10px] text-slate-500">{m.detail}</div>
          </div>
        ))}
      </div>
      {(s.hodRemarks || s.deanRemarks) && (
        <div className="text-xs space-y-1 border-t border-slate-100 pt-2">
          {s.hodRemarks && <p><strong>HOD ({s.hodBy}):</strong> {s.hodRemarks}</p>}
          {s.deanRemarks && <p><strong>Associate Dean ({s.deanBy}):</strong> {s.deanRemarks}</p>}
        </div>
      )}
      {onRemarks && <button className="text-xs font-bold underline" onClick={() => onRemarks(s)}>Add remarks</button>}
      <p className="text-[10px] text-slate-400">Calculated by the ERP {s.computedAt}. Nobody types in scores.</p>
    </div>
  );
}

export function MyScorecard() {
  const me = useLoad<Scorecard>("/erp/performance/me");
  return (
    <div className="space-y-5">
      <Title title="My performance" detail="Your scorecard for this term, calculated from your results, internal marks, logbook, leave, marks submission and student feedback. Only you, your HOD and the Associate Dean see it." />
      {!me.data ? <Loading error={me.error} /> : <ScorecardCard s={me.data} />}
    </div>
  );
}

/** HOD: the department's scorecards with remarks. Associate Dean: the college, with the measure weights. */
export function PerformanceReview({ dean, onToast }: { dean?: boolean; onToast?: (m: string) => void }) {
  const [dept, setDept] = useState("");
  const depts = useLoad<{ key: string; name: string; code: string }[]>(dean ? "/admin/departments" : null);
  const list = useLoad<Scorecard[]>("/erp/performance", dean && dept ? { dept } : undefined);
  const measures = useLoad<{ code: string; name: string; description: string; weight: number }[]>(dean ? "/erp/performance/measures" : null);
  const [weights, setWeights] = useState<Record<string, string>>({});
  useEffect(() => { if (measures.data) setWeights(Object.fromEntries(measures.data.map((m) => [m.code, String(m.weight)]))); }, [measures.data]);
  const remarks = async (s: Scorecard) => {
    const text = window.prompt(`Remarks for ${s.name}`, (dean ? s.deanRemarks : s.hodRemarks) || "");
    if (!text) return;
    try { await apiClient.post(`/erp/performance/${s.userId}/remarks`, { remarks: text }); onToast?.("Remarks saved."); list.reload(); }
    catch (e) { alert(apiErrorMessage(e, "Could not save the remarks.")); }
  };
  const saveWeights = async () => {
    try {
      await apiClient.put("/erp/performance/measures", { weights: Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, Number(v || 0)])) });
      onToast?.("Weights saved; scorecards recalculated.");
      measures.reload();
      list.reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not save the weights.")); }
  };
  return (
    <div className="space-y-5">
      <Title title="Faculty performance" detail={dean ? "Scorecards of the college, calculated each term from the ERP's data. Set the weight of each measure; measures without data are left out of the total." : "Scorecards of your department. Review them and add your remarks."} />
      {dean && measures.data && (
        <div className={`${card} p-5 space-y-3`}>
          <h3 className="text-sm font-black text-[#0B192C]">Weights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {measures.data.map((m) => (
              <label key={m.code} className="flex items-center justify-between gap-3 text-xs" title={m.description}>
                <span><strong>{m.name}</strong><span className="block text-[10px] text-slate-500">{m.description}</span></span>
                <input type="number" min={0} max={100} className={`${input} max-w-[90px]`} value={weights[m.code] ?? ""} onChange={(e) => setWeights({ ...weights, [m.code]: e.target.value })} />
              </label>
            ))}
          </div>
          <div className="flex justify-end"><button className={btn} onClick={saveWeights}>Save weights</button></div>
        </div>
      )}
      {dean && (
        <select className={`${input} max-w-xs`} value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">All departments</option>{depts.data?.map((d) => <option key={d.key} value={d.key}>{d.code} — {d.name}</option>)}
        </select>
      )}
      {!list.data ? <Loading error={list.error} /> : list.data.length === 0 ? <p className="text-sm text-slate-500">No faculty.</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{list.data.map((s) => <ScorecardCard key={s.userId} s={s} onRemarks={remarks} />)}</div>
      )}
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
