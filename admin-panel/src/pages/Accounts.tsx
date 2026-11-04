import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BedDouble, Bus, CheckCircle2, Download, Loader2, Plus, Search, X } from "lucide-react";
import { adminAuthApi, apiClient, apiErrorMessage } from "../services/api";
import { isAccountsHead } from "../utils/rbac";

/**
 * The Accounts office (fees): dashboard, fee heads, fee structures (publishing raises every student's dues), student
 * dues and ledgers, bus routes / hostel rooms and each student's route and room (so every student's total can differ), payments and receipts, concessions / scholarships / refunds (staff enter, the Accounts head
 * approves) and the Tally export. A payment counts only when the gateway confirms it.
 */

type Head = { id: number; code: string; name: string; category: string; active: boolean };
type Item = { headId: number; head: string; amount: number };
type Structure = { id: number; kind: "ANNUAL" | "EXAM"; semester: number | null; examSession: string | null; deptKey: string; deptName: string; studyYear: number; academicYear: string; title: string; dueDate: string; status: string; total: number; students: number; items: Item[] };
type Due = { regNo: string; name: string; deptKey: string; semester: number; section: string; amount: number; concession: number; paid: number; balance: number; overdue: number };
type Demand = { id: number; head: string; headCode: string; structure: string; academicYear: string; amount: number; concession: number; paid: number; balance: number; dueDate: string; overdue: boolean };
type Payment = { id: number; regNo: string; studentName: string; amount: number; gateway: string; orderId: string; paymentId: string | null; status: string; receiptNo: string | null; refunded: number; createdAt: string; paidAt: string | null };
type Ledger = { regNo: string; name: string; parentPhone: string | null; demands: Demand[]; payments: Payment[]; clearance: { hallTicketBlocked: boolean; message: string } };
type Approval = { id: number; kind: string; regNo: string; name: string; detail: string; amount: number; reason: string; status: string; requestedBy: string; requestedAt: string; decidedBy: string | null };
type Dashboard = { collectedToday: number; collectedMonth: number; outstanding: number; overdue: number; overdueStudents: number; pendingApprovals: number; head: boolean; gateway: string };
type Dept = { key: string; name: string; code: string };
type Rate = { id: number; kind: "BUS" | "HOSTEL"; name: string; amount: number; active: boolean; students: number };
type ServiceRow = { regNo: string; name: string; deptKey: string; semester: number; section: string; busRateId: number | null; hostelRateId: number | null; feesRaised: boolean; total: number; paid: number; balance: number };

const inr = (n: number | null | undefined) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const card = "bg-white rounded-3xl border border-slate-200 shadow-sm";
const input = "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A72C]";
const btn = "px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] text-xs font-black inline-flex items-center gap-1.5 disabled:opacity-40";
const th = "text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-500";
const td = "px-4 py-2.5";

async function download(path: string, name: string, params?: Record<string, string>) {
  try {
    const res = await apiClient.get(path, { params, responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) {
    alert(apiErrorMessage(e, "The file could not be downloaded."));
  }
}

const receiptFile = (no: string) => `/accounts/receipts/${no.replace(/\//g, "_")}`;

export const AccountsPage: React.FC = () => {
  const [location] = useLocation();
  const section = location.split("/")[3] || "dashboard";
  return (
    <div className="space-y-5">
      {section === "dashboard" && <DashboardView />}
      {section === "fee-heads" && <HeadsView />}
      {section === "fee-structure" && <StructuresView />}
      {section === "exam-fees" && <StructuresView exam />}
      {section === "rates" && <RatesView />}
      {section === "services" && <ServicesView />}
      {section === "dues" && <DuesView />}
      {section === "payments" && <PaymentsView />}
      {section === "approvals" && <ApprovalsView />}
      {section === "reports" && <ReportsView />}
    </div>
  );
};

function Title({ title, detail }: { title: string; detail: string }) {
  return (
    <div className={`${card} p-6`}>
      <h1 className="text-xl font-black text-[#0B192C]">{title}</h1>
      <p className="text-xs text-slate-600 mt-1 max-w-3xl">{detail}</p>
    </div>
  );
}

function useLoad<T>(path: string, params?: Record<string, unknown>) {
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

// ---------------------------------------------------------------- dashboard

function DashboardView() {
  const { data, error } = useLoad<Dashboard>("/accounts/dashboard");
  const user = adminAuthApi.getCurrentUser();
  const [, navigate] = useLocation();
  return (
    <>
      <Title title="Accounts" detail={`Signed in as ${user?.name || "Accounts"} (${isAccountsHead(user) ? "Accounts head: approves concessions and refunds" : "Accounts staff: enters fees, concessions and refunds"}).`} />
      {!data ? <Loading error={error} /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ["Collected today", inr(data.collectedToday)],
              ["Collected this month", inr(data.collectedMonth)],
              ["Outstanding dues", inr(data.outstanding)],
              ["Overdue", `${inr(data.overdue)} · ${data.overdueStudents} students`],
            ].map(([l, v]) => (
              <div key={l} className={`${card} p-5`}>
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">{l}</span>
                <span className="block text-xl font-black text-[#0B192C] mt-1">{v}</span>
              </div>
            ))}
          </div>
          <div className={`${card} p-5 flex flex-wrap items-center justify-between gap-3`}>
            <p className="text-sm text-slate-700">
              <strong>{data.pendingApprovals}</strong> concession / refund request{data.pendingApprovals === 1 ? "" : "s"} waiting for approval.
              Payment gateway: <strong>{data.gateway}</strong>.
            </p>
            <button className={btn} onClick={() => navigate("/admin/accounts/approvals")}>Open approvals</button>
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- fee heads

function HeadsView() {
  const { data, error, reload } = useLoad<Head[]>("/accounts/fee-heads");
  const [form, setForm] = useState({ code: "", name: "", category: "ACADEMIC" });
  const add = async () => {
    try {
      await apiClient.post("/accounts/fee-heads", form);
      setForm({ code: "", name: "", category: "ACADEMIC" });
      reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not add the fee head.")); }
  };
  const [edit, setEdit] = useState<Head | null>(null);
  const update = async (h: Head) => {
    try {
      await apiClient.put(`/accounts/fee-heads/${h.id}`, h);
      setEdit(null);
      reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not save.")); }
  };
  const remove = async (h: Head) => {
    if (!window.confirm(`Delete the fee head "${h.name}"?`)) return;
    try {
      await apiClient.delete(`/accounts/fee-heads/${h.id}`);
      reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not delete.")); }
  };
  const fixed = (h: Head) => h.code === "BUS" || h.code === "HOSTEL";
  return (
    <>
      <Title title="Fee heads" detail="The kinds of fees (tuition, exam, bus, hostel…). Fee structures set the common amount of each head; the bus and hostel fees come from each student's route and room. A head already used in a structure or in dues cannot be deleted: deactivate it instead." />
      <div className={`${card} p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end`}>
        <label className="text-xs font-bold text-slate-600">Code<input className={input} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="HOSTEL" /></label>
        <label className="text-xs font-bold text-slate-600">Name<input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Hostel fee" /></label>
        <label className="text-xs font-bold text-slate-600">Category
          <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {["ACADEMIC", "EXAM", "BUS", "HOSTEL", "OTHER"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <button className={btn} onClick={add} disabled={!form.code || !form.name}><Plus size={14} /> Add fee head</button>
      </div>
      {!data ? <Loading error={error} /> : (
        <div className={`${card} overflow-hidden`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className={th}>Code</th><th className={th}>Name</th><th className={th}>Category</th><th className={th}>Status</th><th className={th}></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((h) => edit?.id === h.id ? (
                <tr key={h.id} className="bg-amber-50/60">
                  <td className={`${td} font-mono font-bold`}>{h.code}</td>
                  <td className={td}><input className={input} aria-label="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></td>
                  <td className={td}>
                    <select className={input} aria-label="Category" disabled={fixed(h)} value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                      {["ACADEMIC", "EXAM", "BUS", "HOSTEL", "OTHER"].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className={td}>{h.active ? "Active" : "Inactive"}</td>
                  <td className={`${td} text-right whitespace-nowrap space-x-3`}>
                    <button className={btn} disabled={!edit.name.trim()} onClick={() => update(edit)}>Save</button>
                    <button className="text-xs font-bold text-slate-500 underline" onClick={() => setEdit(null)}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={h.id}>
                  <td className={`${td} font-mono font-bold`}>{h.code}</td><td className={td}>{h.name}</td><td className={td}>{h.category}</td>
                  <td className={td}><span className={h.active ? "font-bold text-[#0B192C]" : "text-slate-400"}>{h.active ? "Active" : "Inactive"}</span></td>
                  <td className={`${td} text-right whitespace-nowrap space-x-3`}>
                    <button className="text-xs font-bold text-[#0B192C] underline" onClick={() => setEdit(h)}>Edit</button>
                    <button className="text-xs font-bold text-[#0B192C] underline" onClick={() => update({ ...h, active: !h.active })}>{h.active ? "Deactivate" : "Activate"}</button>
                    {!fixed(h) && <button className="text-xs font-bold text-red-700 underline" onClick={() => remove(h)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- fee structures

function StructuresView({ exam = false }: { exam?: boolean }) {
  const { data: all, error, reload } = useLoad<Structure[]>("/accounts/fee-structures");
  const data = all ? all.filter((s) => (s.kind === "EXAM") === exam) : null;
  const heads = useLoad<Head[]>("/accounts/fee-heads").data || [];
  const depts = useLoad<Dept[]>("/accounts/departments").data || [];
  const [editing, setEditing] = useState<Partial<Structure> & { amounts: Record<number, string> } | null>(null);
  // Exam fee structures carry only EXAM heads; the yearly one never carries exam, bus or hostel
  const usable = (h: Head) => (exam ? h.category === "EXAM" : !["BUS", "HOSTEL", "EXAM"].includes(h.category));
  const open = (s?: Structure) => setEditing(s
    ? { ...s, amounts: Object.fromEntries(s.items.map((i) => [i.headId, String(i.amount)])) }
    : { deptKey: depts[0]?.key, studyYear: 1, semester: 1, examSession: "", title: "", dueDate: "", amounts: {} });
  const save = async () => {
    if (!editing) return;
    if (editing.status === "PUBLISHED" &&
      !window.confirm(`"${editing.title}" is published. Saving changes the unpaid dues of every student in it at once (amounts already paid stay). Continue?`)) return;
    const body = {
      kind: exam ? "EXAM" : "ANNUAL", deptKey: editing.deptKey, studyYear: editing.studyYear, semester: editing.semester,
      examSession: editing.examSession, title: editing.title, dueDate: editing.dueDate,
      items: Object.entries(editing.amounts).filter(([, v]) => v !== "").map(([k, v]) => ({ headId: Number(k), amount: Number(v) })),
    };
    try {
      if (editing.id) await apiClient.put(`/accounts/fee-structures/${editing.id}`, body);
      else await apiClient.post("/accounts/fee-structures", body);
      setEditing(null);
      reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not save.")); }
  };
  const remove = async (s: Structure) => {
    if (!window.confirm(s.status === "PUBLISHED"
      ? `Delete "${s.title}"? The dues raised for its ${s.students} students are removed too.`
      : `Delete the draft "${s.title}"?`)) return;
    try {
      await apiClient.delete(`/accounts/fee-structures/${s.id}`);
      reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not delete.")); }
  };
  const publish = async (s: Structure) => {
    const who = s.kind === "EXAM" ? `every semester-${s.semester} student of ${s.deptName}` : `every year-${s.studyYear} student of ${s.deptName}`;
    const extra = s.kind === "EXAM" ? " Their hall tickets stay blocked until it is paid." : " Each student's bus and hostel fees are added too.";
    if (!window.confirm(`Publish "${s.title}"? ${inr(s.total)} is raised for ${who}, due ${s.dueDate}.${extra}`)) return;
    try {
      const r = await apiClient.post<Structure>(`/accounts/fee-structures/${s.id}/publish`);
      alert(`Published: dues raised for ${r.data.students} students. They have been notified.`);
      reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not publish.")); }
  };
  const noun = exam ? "exam fee" : "fee structure";
  return (
    <>
      {exam
        ? <Title title="Exam fees" detail="The end-semester exam fee is collected separately for each exam session (e.g. Nov/Dec 2026): one per department and semester. Publishing it raises the exam fee of every student of that semester; the hall ticket is blocked until it is paid. Exam fee heads have the category EXAM (Fee heads)." />
        : <Title title="Fee structure" detail="The yearly common fees (tuition and others) of a department and year of study. Publishing it raises every student's dues, plus each student's own bus and hostel fees. Exam fees are collected separately in Exam fees. A published structure can still be edited: unpaid dues follow the new amounts." />}
      <div className="flex justify-end"><button className={btn} onClick={() => open()}><Plus size={14} /> New {noun}</button></div>
      {!data ? <Loading error={error} /> : data.length === 0 ? <div className={`${card} p-10 text-center text-sm text-slate-500`}>No {noun}s yet.</div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.map((s) => (
            <div key={s.id} className={`${card} p-5 space-y-2`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-black text-[#0B192C]">{s.title}</h3>
                  <p className="text-xs text-slate-500">
                    {s.deptName} · {s.kind === "EXAM" ? `semester ${s.semester} · ${s.examSession}` : `year ${s.studyYear} · ${s.academicYear}`} · due {s.dueDate}
                  </p>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${s.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{s.status}</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-0.5">{s.items.map((i) => <li key={i.headId} className="flex justify-between"><span>{i.head}</span><span>{inr(i.amount)}</span></li>)}</ul>
              <div className="flex justify-between text-sm font-black text-[#0B192C] border-t border-slate-100 pt-2"><span>Total</span><span>{inr(s.total)}</span></div>
              {s.status === "PUBLISHED" && <p className="text-xs text-slate-500">Dues raised for {s.students} students.</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <button className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" onClick={() => open(s)}>Edit</button>
                {s.status !== "PUBLISHED" && <button className={btn} onClick={() => publish(s)}>Publish &amp; raise dues</button>}
                <button className="px-3 py-2 rounded-xl text-xs font-bold text-red-700 hover:bg-red-50" onClick={() => remove(s)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal title={`${editing.id ? "Edit" : "New"} ${noun}`} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-600">Department
              <select className={input} disabled={!!editing.id} value={editing.deptKey} onChange={(e) => setEditing({ ...editing, deptKey: e.target.value })}>
                {depts.map((d) => <option key={d.key} value={d.key}>{d.code} — {d.name}</option>)}
              </select>
            </label>
            {exam ? (
              <label className="text-xs font-bold text-slate-600">Semester
                <select className={input} disabled={!!editing.id} value={editing.semester ?? 1} onChange={(e) => setEditing({ ...editing, semester: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>Semester {n}</option>)}
                </select>
              </label>
            ) : (
              <label className="text-xs font-bold text-slate-600">Year of study
                <select className={input} disabled={!!editing.id} value={editing.studyYear} onChange={(e) => setEditing({ ...editing, studyYear: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </label>
            )}
            {exam && (
              <label className="text-xs font-bold text-slate-600 col-span-2">Exam session
                <input className={input} disabled={!!editing.id} value={editing.examSession || ""} placeholder="Nov/Dec 2026"
                  onChange={(e) => setEditing({ ...editing, examSession: e.target.value })} />
              </label>
            )}
            <label className="text-xs font-bold text-slate-600 col-span-2">Title<input className={input} value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder={exam ? "AIDS semester 1 exam fee Nov/Dec 2026 (filled in if left empty)" : "AIDS 1st year fees 2026-27"} /></label>
            <label className="text-xs font-bold text-slate-600">Due date<input type="date" className={input} value={editing.dueDate || ""} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })} /></label>
          </div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mt-4 mb-2">{exam ? "Exam fee per student" : "Common fees for every student"} (leave empty if not charged)</p>
          <div className="space-y-2">
            {heads.filter((h) => (h.active || editing.amounts[h.id] !== undefined) && usable(h)).map((h) => (
              <label key={h.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{h.name} <span className="text-xs text-slate-400">({h.category})</span></span>
                <input type="number" min={0} className={`${input} max-w-[160px]`} value={editing.amounts[h.id] ?? ""}
                  onChange={(e) => setEditing({ ...editing, amounts: { ...editing.amounts, [h.id]: e.target.value } })} />
              </label>
            ))}
            {heads.filter((h) => h.active && usable(h)).length === 0 && (
              <p className="text-xs text-slate-500">No active {exam ? "EXAM" : "common"} fee heads. Add one in Fee heads{exam ? " with the category EXAM" : ""}.</p>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            {exam
              ? "Raised only for the students of this semester. The hall ticket is blocked until the exam fee is paid."
              : <>Bus and hostel fees differ per student: set them in <strong>Bus &amp; hostel rates</strong> and <strong>Student bus &amp; hostel</strong>. Exam fees are raised per exam session in <strong>Exam fees</strong>.</>}
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <button className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600" onClick={() => setEditing(null)}>Cancel</button>
            <button className={btn} onClick={save} disabled={!editing.dueDate || (exam && !editing.examSession?.trim())}>{editing.status === "PUBLISHED" ? "Save & update dues" : "Save as draft"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------- bus routes & hostel rooms

function RatesView() {
  const { data, error, reload } = useLoad<Rate[]>("/accounts/service-rates");
  return (
    <>
      <Title title="Bus routes & hostel rooms" detail="The yearly price of each bus route (by distance) and each hostel room type. Give each student a route and a room in Student bus & hostel; a price change here updates the unpaid dues of everyone using it." />
      {!data ? <Loading error={error} /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RateCard kind="BUS" title="Bus routes (per year)" placeholder="Route 2 – Melur" rates={data.filter((r) => r.kind === "BUS")} reload={reload} />
          <RateCard kind="HOSTEL" title="Hostel rooms (per year)" placeholder="Attached room" rates={data.filter((r) => r.kind === "HOSTEL")} reload={reload} />
        </div>
      )}
    </>
  );
}

function RateCard({ kind, title, placeholder, rates, reload }: { kind: Rate["kind"]; title: string; placeholder: string; rates: Rate[]; reload: () => void }) {
  const [form, setForm] = useState({ name: "", amount: "" });
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const add = async () => {
    setBusy(true);
    try {
      await apiClient.post("/accounts/service-rates", { kind, name: form.name, amount: Number(form.amount) });
      setForm({ name: "", amount: "" });
      reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not add.")); } finally { setBusy(false); }
  };
  const save = async (r: Rate, change: { amount?: number; active?: boolean }) => {
    if (change.amount !== undefined && r.students > 0 &&
      !window.confirm(`Change ${r.name} to ${inr(change.amount)} a year? The unpaid dues of the ${r.students} student${r.students === 1 ? "" : "s"} using it change at once (paid amounts stay).`)) return;
    setBusy(true);
    try {
      const res = await apiClient.put<{ studentsUpdated: number }>(`/accounts/service-rates/${r.id}`, { ...r, ...change });
      setPrices((p) => { const n = { ...p }; delete n[r.id]; return n; });
      if (change.amount !== undefined && res.data.studentsUpdated > 0) alert(`Saved. Dues of ${res.data.studentsUpdated} students updated; they have been notified.`);
      reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not save.")); } finally { setBusy(false); }
  };
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        {kind === "BUS" ? <Bus size={16} className="text-[#0B192C]" /> : <BedDouble size={16} className="text-[#0B192C]" />}
        <h2 className="font-black text-[#0B192C]">{title}</h2>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><th className={th}>{kind === "BUS" ? "Route" : "Room type"}</th><th className={th}>Price / year</th><th className={th}>Students</th><th className={th}></th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rates.length === 0 && <tr><td className={`${td} text-slate-500`} colSpan={4}>None yet. Add the first one below.</td></tr>}
          {rates.map((r) => {
            const edited = prices[r.id] !== undefined && Number(prices[r.id]) !== r.amount;
            return (
              <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                <td className={`${td} font-semibold`}>{r.name}</td>
                <td className={td}>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} step={500} aria-label={`${r.name} price`} className={`${input} max-w-[130px] text-right`}
                      value={prices[r.id] ?? String(r.amount)} onChange={(e) => setPrices({ ...prices, [r.id]: e.target.value })} />
                    {edited && <button className={btn} disabled={busy || prices[r.id] === ""} onClick={() => save(r, { amount: Number(prices[r.id]) })}>Save</button>}
                  </div>
                </td>
                <td className={td}>{r.students}</td>
                <td className={`${td} text-right`}>
                  <button className="text-xs font-bold text-[#0B192C] underline" disabled={busy} onClick={() => save(r, { active: !r.active })}>{r.active ? "Stop offering" : "Offer again"}</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="p-4 border-t border-slate-100 bg-slate-50 grid grid-cols-[1fr_130px_auto] gap-2 items-end">
        <label className="text-xs font-bold text-slate-600">New {kind === "BUS" ? "route" : "room type"}<input className={input} value={form.name} placeholder={placeholder} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="text-xs font-bold text-slate-600">Price / year<input type="number" min={0} step={500} className={input} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
        <button className={btn} onClick={add} disabled={busy || !form.name.trim() || form.amount === ""}><Plus size={14} /> Add</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- each student's bus & hostel

function ServicesView() {
  const depts = useLoad<Dept[]>("/accounts/departments").data || [];
  const rates = useLoad<Rate[]>("/accounts/service-rates").data || [];
  const [dept, setDept] = useState("");
  const [year, setYear] = useState("");
  const deptKey = dept || depts[0]?.key || "";
  const { data, error, reload } = useLoad<ServiceRow[]>(deptKey ? "/accounts/student-services" : "", { dept: deptKey, year: year || undefined });
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState({ bus: "", hostel: "" });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => setTicked(new Set()), [deptKey, year]);

  const buses = rates.filter((r) => r.kind === "BUS");
  const rooms = rates.filter((r) => r.kind === "HOSTEL");
  const options = (list: Rate[], current: number | null) => list
    .filter((r) => r.active || r.id === current)
    .map((r) => <option key={r.id} value={r.id}>{r.name} · {inr(r.amount)}</option>);

  const apply = async (regNos: string[], busRateId: string, hostelRateId: string) => {
    setBusy(true);
    try {
      const r = await apiClient.put<{ students: number; duesChanged: number }>("/accounts/student-services", {
        regNos,
        busRateId: busRateId === "" ? null : Number(busRateId),
        hostelRateId: hostelRateId === "" ? null : Number(hostelRateId),
      });
      setNote(regNos.length === 1
        ? `${data?.find((s) => s.regNo === regNos[0])?.name || regNos[0]}: saved${r.data.duesChanged ? ", dues updated" : ""}.`
        : `Saved for ${r.data.students} students; dues of ${r.data.duesChanged} updated.`);
      reload();
      return true;
    } catch (e) {
      alert(apiErrorMessage(e, "Could not save."));
      return false;
    } finally { setBusy(false); }
  };
  const applyBulk = async () => {
    if (await apply([...ticked], bulk.bus, bulk.hostel)) {
      setTicked(new Set());
      setBulk({ bus: "", hostel: "" });
    }
  };

  const rows = data || [];
  const allTicked = rows.length > 0 && rows.every((s) => ticked.has(s.regNo));
  const toggle = (reg: string) => setTicked((t) => { const n = new Set(t); if (n.has(reg)) n.delete(reg); else n.add(reg); return n; });
  return (
    <>
      <Title title="Student bus & hostel" detail="Give each student their bus route and hostel room. Their fees = the common fees of their class + their route + their room, so every student's total can be different. Pick from a row, or tick many students and set them together." />
      {rates.length === 0 && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Add the bus routes and hostel rooms with their prices first, in Bus &amp; hostel rates.
        </div>
      )}
      <div className={`${card} p-4 flex flex-wrap items-center gap-3`}>
        <select className={`${input} max-w-[260px]`} aria-label="Department" value={deptKey} onChange={(e) => setDept(e.target.value)}>
          {depts.map((d) => <option key={d.key} value={d.key}>{d.code} — {d.name}</option>)}
        </select>
        <select className={`${input} max-w-[160px]`} aria-label="Year of study" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All years</option>
          {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        {note && <span role="status" className="text-xs font-bold text-[#0B192C] flex items-center gap-1"><CheckCircle2 size={14} /> {note}</span>}
      </div>
      <div className={`${card} p-4 flex flex-wrap items-center gap-3 ${ticked.size ? "ring-2 ring-[#D4A72C]" : ""}`}>
        <span className="text-xs font-bold text-slate-600">{ticked.size ? `${ticked.size} student${ticked.size === 1 ? "" : "s"} ticked:` : "Tick students to set many at once:"}</span>
        <select className={`${input} max-w-[240px]`} aria-label="Bus for ticked students" value={bulk.bus} onChange={(e) => setBulk({ ...bulk, bus: e.target.value })}>
          <option value="">Bus: keep as is</option>
          <option value="0">No bus</option>
          {options(buses, null)}
        </select>
        <select className={`${input} max-w-[240px]`} aria-label="Hostel for ticked students" value={bulk.hostel} onChange={(e) => setBulk({ ...bulk, hostel: e.target.value })}>
          <option value="">Hostel: keep as is</option>
          <option value="0">Day scholar</option>
          {options(rooms, null)}
        </select>
        <button className={btn} disabled={busy || ticked.size === 0 || (!bulk.bus && !bulk.hostel)} onClick={applyBulk}>Apply to ticked</button>
        {ticked.size > 0 && <button className="text-xs font-bold text-slate-500 underline" onClick={() => setTicked(new Set())}>Clear ticks</button>}
      </div>
      {!data ? <Loading error={error} /> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}><input type="checkbox" aria-label="Tick all" checked={allTicked} onChange={() => setTicked(allTicked ? new Set() : new Set(rows.map((s) => s.regNo)))} /></th>
                {["Reg no", "Name", "Sem", "Bus", "Hostel", "Total fees", "Balance"].map((h) => <th key={h} className={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && <tr><td className={td} colSpan={8}>No students.</td></tr>}
              {rows.map((s) => (
                <tr key={s.regNo} className={ticked.has(s.regNo) ? "bg-amber-50/60" : ""}>
                  <td className={td}><input type="checkbox" aria-label={`Tick ${s.name}`} checked={ticked.has(s.regNo)} onChange={() => toggle(s.regNo)} /></td>
                  <td className={`${td} font-mono text-xs`}>{s.regNo}</td>
                  <td className={`${td} font-semibold whitespace-nowrap`}>{s.name}</td>
                  <td className={td}>{s.semester}{s.section ? ` ${s.section}` : ""}</td>
                  <td className={td}>
                    <select className={`${input} min-w-[190px]`} aria-label={`Bus for ${s.name}`} disabled={busy}
                      value={s.busRateId ?? 0} onChange={(e) => apply([s.regNo], e.target.value, "")}>
                      <option value={0}>No bus</option>
                      {options(buses, s.busRateId)}
                    </select>
                  </td>
                  <td className={td}>
                    <select className={`${input} min-w-[190px]`} aria-label={`Hostel for ${s.name}`} disabled={busy}
                      value={s.hostelRateId ?? 0} onChange={(e) => apply([s.regNo], "", e.target.value)}>
                      <option value={0}>Day scholar</option>
                      {options(rooms, s.hostelRateId)}
                    </select>
                  </td>
                  <td className={`${td} font-bold whitespace-nowrap`}>
                    {s.feesRaised ? inr(s.total) : <span className="text-xs font-semibold text-slate-500" title="Bus and hostel are added when the class fee structure is published">Not published yet</span>}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{s.feesRaised ? inr(s.balance) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
            <span>{rows.length} students</span>
            <span>{rows.filter((s) => s.busRateId).length} on bus</span>
            <span>{rows.filter((s) => s.hostelRateId).length} in hostel</span>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- dues & ledger

function DuesView() {
  const depts = useLoad<Dept[]>("/accounts/departments").data || [];
  const [dept, setDept] = useState("");
  const [search, setSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const { data, error } = useLoad<Due[]>("/accounts/dues", { dept: dept || undefined, search: search || undefined, overdueOnly });
  const [ledgerOf, setLedgerOf] = useState<string | null>(null);
  return (
    <>
      <Title title="Student dues" detail="Every student's fees, concessions, payments and balance. Open a student for their ledger, receipts, concessions and refunds." />
      <div className={`${card} p-4 flex flex-wrap items-center gap-3`}>
        <select className={`${input} max-w-[220px]`} value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">All departments</option>
          {depts.map((d) => <option key={d.key} value={d.key}>{d.code}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${input} pl-8`} placeholder="Register number or name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="text-xs font-bold text-slate-600 flex items-center gap-2"><input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} /> Overdue only</label>
      </div>
      {!data ? <Loading error={error} /> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr>{["Reg no", "Name", "Dept", "Fees", "Concession", "Paid", "Balance", "Overdue", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 && <tr><td className={td} colSpan={9}>No dues found.</td></tr>}
              {data.map((d) => (
                <tr key={d.regNo}>
                  <td className={`${td} font-mono`}>{d.regNo}</td><td className={td}>{d.name}</td><td className={td}>{d.deptKey.toUpperCase()} {d.section}</td>
                  <td className={td}>{inr(d.amount)}</td><td className={td}>{inr(d.concession)}</td><td className={td}>{inr(d.paid)}</td>
                  <td className={`${td} font-bold`}>{inr(d.balance)}</td>
                  <td className={`${td} ${d.overdue > 0 ? "text-red-700 font-bold" : ""}`}>{d.overdue > 0 ? inr(d.overdue) : "—"}</td>
                  <td className={`${td} text-right`}><button className="text-xs font-black text-[#0B192C] underline" onClick={() => setLedgerOf(d.regNo)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ledgerOf && <LedgerModal regNo={ledgerOf} onClose={() => setLedgerOf(null)} />}
    </>
  );
}

function LedgerModal({ regNo, onClose }: { regNo: string; onClose: () => void }) {
  const { data, error, reload } = useLoad<Ledger>(`/accounts/students/${regNo}`);
  const [phone, setPhone] = useState("");
  const [con, setCon] = useState({ demandId: "", kind: "CONCESSION", amount: "", reason: "" });
  const [ref, setRef] = useState({ paymentId: "", amount: "", reason: "" });
  useEffect(() => { if (data) setPhone(data.parentPhone || ""); }, [data?.parentPhone]);
  const run = async (f: () => Promise<unknown>, ok: string) => {
    try { await f(); alert(ok); reload(); } catch (e) { alert(apiErrorMessage(e, "Could not save.")); }
  };
  return (
    <Modal title={data ? `${data.name} (${regNo})` : regNo} onClose={onClose} wide>
      {!data ? <Loading error={error} /> : (
        <div className="space-y-5 text-sm">
          <p className={`rounded-xl px-3 py-2 text-xs font-bold ${data.clearance.hallTicketBlocked ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{data.clearance.message}</p>
          <div>
            <h4 className="font-black text-[#0B192C] mb-2">Dues</h4>
            <table className="w-full text-xs"><thead><tr>{["Head", "Structure", "Amount", "Concession", "Paid", "Balance", "Due"].map((h) => <th key={h} className="text-left py-1 text-slate-500">{h}</th>)}</tr></thead>
              <tbody>{data.demands.map((d) => (
                <tr key={d.id} className="border-t border-slate-100"><td className="py-1.5">{d.head}</td><td>{d.structure}</td><td>{inr(d.amount)}</td><td>{inr(d.concession)}</td><td>{inr(d.paid)}</td>
                  <td className="font-bold">{inr(d.balance)}</td><td className={d.overdue ? "text-red-700 font-bold" : ""}>{d.dueDate}</td></tr>
              ))}</tbody></table>
          </div>
          <div>
            <h4 className="font-black text-[#0B192C] mb-2">Payments</h4>
            {data.payments.length === 0 ? <p className="text-xs text-slate-500">No payments.</p> : (
              <table className="w-full text-xs"><tbody>{data.payments.map((p) => (
                <tr key={p.id} className="border-t border-slate-100"><td className="py-1.5">{p.paidAt || p.createdAt}</td><td>{inr(p.amount)}</td><td>{p.status}</td><td className="font-mono">{p.receiptNo || "—"}</td>
                  <td>{p.refunded > 0 ? `refunded ${inr(p.refunded)}` : ""}</td>
                  <td className="text-right">{p.receiptNo && <button className="underline font-bold" onClick={() => download(receiptFile(p.receiptNo!), `${p.receiptNo!.replace(/\//g, "_")}.pdf`)}>Receipt</button>}</td></tr>
              ))}</tbody></table>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 p-3 rounded-2xl bg-slate-50">
              <h5 className="text-xs font-black text-[#0B192C]">Parent mobile (WhatsApp)</h5>
              <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" />
              <button className={btn} onClick={() => run(() => apiClient.put(`/accounts/students/${regNo}/parent-phone`, { parentPhone: phone }), "Saved.")}>Save</button>
            </div>
            <div className="space-y-2 p-3 rounded-2xl bg-slate-50">
              <h5 className="text-xs font-black text-[#0B192C]">Concession / scholarship</h5>
              <select className={input} value={con.demandId} onChange={(e) => setCon({ ...con, demandId: e.target.value })}>
                <option value="">Choose the due</option>
                {data.demands.filter((d) => d.balance > 0).map((d) => <option key={d.id} value={d.id}>{d.head} (balance {inr(d.balance)})</option>)}
              </select>
              <select className={input} value={con.kind} onChange={(e) => setCon({ ...con, kind: e.target.value })}><option>CONCESSION</option><option>SCHOLARSHIP</option></select>
              <input className={input} type="number" placeholder="Amount" value={con.amount} onChange={(e) => setCon({ ...con, amount: e.target.value })} />
              <input className={input} placeholder="Reason" value={con.reason} onChange={(e) => setCon({ ...con, reason: e.target.value })} />
              <button className={btn} disabled={!con.demandId || !con.amount || !con.reason} onClick={() => run(() => apiClient.post("/accounts/concessions",
                { regNo, demandId: Number(con.demandId), kind: con.kind, amount: Number(con.amount), reason: con.reason }), "Sent to the Accounts head for approval.")}>Request approval</button>
            </div>
            <div className="space-y-2 p-3 rounded-2xl bg-slate-50">
              <h5 className="text-xs font-black text-[#0B192C]">Refund</h5>
              <select className={input} value={ref.paymentId} onChange={(e) => setRef({ ...ref, paymentId: e.target.value })}>
                <option value="">Choose the payment</option>
                {data.payments.filter((p) => p.status === "PAID" && p.amount > p.refunded).map((p) => <option key={p.id} value={p.id}>{p.receiptNo} ({inr(p.amount - p.refunded)})</option>)}
              </select>
              <input className={input} type="number" placeholder="Amount" value={ref.amount} onChange={(e) => setRef({ ...ref, amount: e.target.value })} />
              <input className={input} placeholder="Reason" value={ref.reason} onChange={(e) => setRef({ ...ref, reason: e.target.value })} />
              <button className={btn} disabled={!ref.paymentId || !ref.amount || !ref.reason} onClick={() => run(() => apiClient.post("/accounts/refunds",
                { paymentId: Number(ref.paymentId), amount: Number(ref.amount), reason: ref.reason }), "Sent to the Accounts head for approval.")}>Request approval</button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- payments, approvals, reports

function PaymentsView() {
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const { data, error } = useLoad<Payment[]>("/accounts/payments", { from, to });
  return (
    <>
      <Title title="Payments & receipts" detail="Online payments. A payment counts (PAID, with a receipt) only when the payment gateway confirms it." />
      <div className={`${card} p-4 flex flex-wrap gap-3 items-end`}>
        <label className="text-xs font-bold text-slate-600">From<input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-xs font-bold text-slate-600">To<input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      {!data ? <Loading error={error} /> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr>{["Date", "Reg no", "Student", "Amount", "Status", "Receipt", "Gateway ref", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 && <tr><td className={td} colSpan={8}>No payments in these dates.</td></tr>}
              {data.map((p) => (
                <tr key={p.id}>
                  <td className={td}>{p.paidAt || p.createdAt}</td><td className={`${td} font-mono`}>{p.regNo}</td><td className={td}>{p.studentName}</td>
                  <td className={`${td} font-bold`}>{inr(p.amount)}</td>
                  <td className={td}><span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${p.status === "PAID" ? "bg-emerald-100 text-emerald-800" : p.status === "FAILED" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}`}>{p.status === "CREATED" ? "NOT CONFIRMED" : p.status}</span></td>
                  <td className={`${td} font-mono text-xs`}>{p.receiptNo || "—"}</td><td className={`${td} font-mono text-xs`}>{p.paymentId || "—"}</td>
                  <td className={`${td} text-right`}>{p.receiptNo && <button className="text-xs font-black underline" onClick={() => download(receiptFile(p.receiptNo!), `${p.receiptNo!.replace(/\//g, "_")}.pdf`)}>PDF</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ApprovalsView() {
  const { data, error, reload } = useLoad<Approval[]>("/accounts/approvals");
  const user = adminAuthApi.getCurrentUser();
  const head = isAccountsHead(user);
  const decide = async (a: Approval, approve: boolean) => {
    if (!window.confirm(`${approve ? "Approve" : "Reject"} ${a.kind.toLowerCase()} of ${inr(a.amount)} for ${a.name}?`)) return;
    try {
      await apiClient.post(`/accounts/${a.kind === "REFUND" ? "refunds" : "concessions"}/${a.id}/decide`, { approve });
      reload();
    } catch (e) { alert(apiErrorMessage(e, "Could not save the decision.")); }
  };
  return (
    <>
      <Title title="Concessions, scholarships & refunds" detail={head ? "Approve or reject requests entered by the Accounts staff. You cannot approve a request you entered yourself." : "Requests you enter are approved by the Accounts head. Enter them from Student dues → Open."} />
      {!data ? <Loading error={error} /> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr>{["Type", "Student", "For", "Amount", "Reason", "Entered by", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 && <tr><td className={td} colSpan={8}>No requests.</td></tr>}
              {data.map((a) => (
                <tr key={a.kind + a.id}>
                  <td className={`${td} font-bold`}>{a.kind}</td><td className={td}>{a.name}<div className="text-[10px] font-mono text-slate-500">{a.regNo}</div></td>
                  <td className={td}>{a.detail}</td><td className={`${td} font-bold`}>{inr(a.amount)}</td><td className={td}>{a.reason}</td>
                  <td className={td}>{a.requestedBy}<div className="text-[10px] text-slate-500">{a.requestedAt}</div></td>
                  <td className={td}>{a.status}{a.decidedBy ? <div className="text-[10px] text-slate-500">by {a.decidedBy}</div> : null}</td>
                  <td className={`${td} text-right whitespace-nowrap`}>
                    {head && a.status === "PENDING" && a.requestedBy.toUpperCase() !== (user?.username || "").toUpperCase() && (
                      <>
                        <button className="mr-2 text-xs font-black text-emerald-700 inline-flex items-center gap-1" onClick={() => decide(a, true)}><CheckCircle2 size={13} /> Approve</button>
                        <button className="text-xs font-black text-red-700 inline-flex items-center gap-1" onClick={() => decide(a, false)}><X size={13} /> Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ReportsView() {
  const first = new Date();
  first.setDate(1);
  const [from, setFrom] = useState(first.toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  return (
    <>
      <Title title="Reports & Tally export" detail="Confirmed collections by fee head, as a CSV file that Tally (or Excel) imports: date, receipt (voucher) number, fee head (ledger), student and amount." />
      <div className={`${card} p-5 flex flex-wrap gap-3 items-end`}>
        <label className="text-xs font-bold text-slate-600">From<input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-xs font-bold text-slate-600">To<input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className={btn} onClick={() => download("/accounts/tally-export", `fee-collections-${from}-to-${to}.csv`, { from, to })}><Download size={14} /> Download Tally CSV</button>
      </div>
    </>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className={`bg-white w-full ${wide ? "max-w-4xl" : "max-w-xl"} rounded-3xl shadow-2xl flex flex-col max-h-[90vh]`}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-[#0B192C]">{title}</h3>
          <button aria-label="Close" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default AccountsPage;
