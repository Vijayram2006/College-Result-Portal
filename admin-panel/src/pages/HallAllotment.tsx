import React, { useEffect, useMemo, useState } from "react";
import { Armchair, CheckCircle2, Clock, Eye, Lock, Plus, Send, Trash2, X } from "lucide-react";
import { apiClient, apiErrorMessage } from "../services/api";
import { SEMESTER_OPTIONS } from "../utils/semesters";
import { isSuperAdmin } from "../utils/rbac";

/*
 * Examination Classroom Allotment Matrix (requirements REQ-06/07/08/09). The COE seats the students of the chosen
 * departments in the halls (taken department by department in turn), checks the matrix and publishes it with a seal.
 * Published allotments cascade to the Associate Dean (read-only) and the HODs, who validate them for the faculty,
 * who publish them to the students' seating card. The hall monitor grants extra minutes to a disrupted hall.
 */

type DeptStep = { deptKey: string; deptName: string; students: number; hodValidatedBy: string | null; hodValidatedAt: string | null; facultyPublishedBy: string | null; facultyPublishedAt: string | null };
type HallSummary = { hall: string; students: number; extraMinutes: number; extensionReason: string | null };
type Plan = {
  id: number; title: string; semester: string; assessmentType: string; examDate: string; session: string; startTime: string;
  durationMinutes: number; reportingMinutes: number; status: "DRAFT" | "PUBLISHED"; seal: string | null; createdBy: string;
  publishedBy: string | null; publishedAt: string | null; departments: DeptStep[]; halls: HallSummary[];
};
type Seat = { hall: string; bench: string; regNo: string; name: string; deptKey: string };
type Department = { key: string; name: string; code: string };

const input = "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#0B192C]";
const label = "block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1";
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");

export const HallAllotmentPage: React.FC = () => {
  const viewOnly = isSuperAdmin();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [depts, setDepts] = useState<Department[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "End Semester Examinations – Nov/Dec 2026", semester: "Semester I", assessmentType: "End Semester",
    examDate: new Date(Date.now() + 864e5).toISOString().slice(0, 10), session: "FN", startTime: "09:30",
    durationMinutes: 180, reportingMinutes: 30,
  });
  const [picked, setPicked] = useState<string[]>([]);
  const [halls, setHalls] = useState<{ name: string; capacity: number }[]>([{ name: "Hall A101", capacity: 40 }, { name: "Hall A102", capacity: 40 }]);
  const [open, setOpen] = useState<Plan | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [ext, setExt] = useState<{ plan: Plan; hall: string; minutes: number; reason: string } | null>(null);

  const load = () => apiClient.get<Plan[]>("/admin/hall-plans").then((r) => setPlans(r.data)).catch((e) => setError(apiErrorMessage(e, "Could not load the allotments.")));
  useEffect(() => {
    load();
    apiClient.get<Department[]>("/admin/departments").then((r) => setDepts(r.data)).catch(() => setDepts([]));
  }, []);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, "The action failed."));
    } finally {
      setBusy(false);
    }
  };

  const create = () => act(async () => {
    await apiClient.post("/admin/hall-plans", { ...form, depts: picked, halls });
    setCreating(false);
  });

  const view = async (p: Plan) => {
    setOpen(p);
    setSeats([]);
    try {
      setSeats((await apiClient.get<Seat[]>(`/admin/hall-plans/${p.id}/seats`)).data);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not load the seats."));
    }
  };

  const byHall = useMemo(() => {
    const m = new Map<string, Seat[]>();
    seats.forEach((s) => m.set(s.hall, [...(m.get(s.hall) ?? []), s]));
    return Array.from(m.entries());
  }, [seats]);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0"><Armchair size={18} /></div>
          <div className="flex-1 min-w-[240px]">
            <h2 className="font-display font-bold text-xl text-[#0B192C]">Examination Classroom Allotment Matrix</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Seat the students in the halls and publish the allotment. It then goes to the Associate Dean (view only) and
              the HODs; each HOD validates it for the faculty, who publish it to the students' seating card.
            </p>
          </div>
          {!viewOnly && (
            <button onClick={() => setCreating(true)} className="h-10 px-4 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-black inline-flex items-center gap-2">
              <Plus size={15} /> New allotment
            </button>
          )}
        </div>
        {error && <p role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</p>}
      </div>

      {plans?.length === 0 && <p className="text-xs text-gray-500">No hall allotments yet.</p>}
      {plans?.map((p) => (
        <div key={p.id} className="bg-white rounded-3xl border border-[#E5E1D8] p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <p className="text-sm font-black text-[#0B192C]">{p.title}</p>
              <p className="text-[11px] text-gray-600 font-semibold">
                {p.semester} · {p.assessmentType} · {new Date(p.examDate + "T00:00:00").toLocaleDateString("en-IN", { dateStyle: "medium" })} {p.session} ·
                {" "}{p.startTime.slice(0, 5)} for {p.durationMinutes} min · report {p.reportingMinutes} min before · {p.halls.length} halls, {p.halls.reduce((a, h) => a + h.students, 0)} students
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${p.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              {p.status === "PUBLISHED" ? "Published" : "Draft"}
            </span>
            <button onClick={() => view(p)} className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-bold inline-flex items-center gap-1.5"><Eye size={14} /> Matrix</button>
            {!viewOnly && p.status === "DRAFT" && (
              <>
                <button disabled={busy} onClick={() => act(() => apiClient.post(`/admin/hall-plans/${p.id}/publish`))}
                  className="h-9 px-3 rounded-xl bg-[#0B192C] text-white text-xs font-black inline-flex items-center gap-1.5 disabled:opacity-50"><Send size={14} /> Finalise &amp; publish</button>
                <button disabled={busy} aria-label="Delete draft" onClick={() => window.confirm("Delete this draft allotment?") && act(() => apiClient.delete(`/admin/hall-plans/${p.id}`))}
                  className="h-9 w-9 rounded-xl border border-red-200 text-red-700 inline-flex items-center justify-center"><Trash2 size={14} /></button>
              </>
            )}
          </div>
          {p.status === "PUBLISHED" && (
            <>
              <p className="text-[11px] text-gray-500 flex items-center gap-1.5"><Lock size={12} /> Sealed {p.seal?.slice(0, 16)}… by {p.publishedBy} on {when(p.publishedAt)}</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500">
                    <tr><th className="px-3 py-2">Department</th><th className="px-3 py-2">Students</th><th className="px-3 py-2">HOD validation</th><th className="px-3 py-2">Published to students</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {p.departments.map((d) => (
                      <tr key={d.deptKey}>
                        <td className="px-3 py-2 font-semibold">{d.deptName}</td>
                        <td className="px-3 py-2">{d.students}</td>
                        <td className="px-3 py-2">{d.hodValidatedAt ? <span className="text-emerald-700 font-bold">✓ {d.hodValidatedBy} · {when(d.hodValidatedAt)}</span> : <span className="text-amber-700 font-bold">Waiting for the HOD</span>}</td>
                        <td className="px-3 py-2">{d.facultyPublishedAt ? <span className="text-emerald-700 font-bold">✓ {d.facultyPublishedBy} · {when(d.facultyPublishedAt)}</span> : <span className="text-gray-500">Not yet</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* REQ-09: real-time hall monitor with time extension */}
              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-[10px] font-black uppercase text-gray-500 mb-2 flex items-center gap-1.5"><Clock size={12} /> Hall monitor · standard window {p.durationMinutes} minutes</p>
                <div className="flex flex-wrap gap-2">
                  {p.halls.map((h) => (
                    <div key={h.hall} className={`rounded-xl border px-3 py-2 text-xs ${h.extraMinutes ? "border-emerald-300 bg-emerald-50" : "border-gray-200"}`}>
                      <p className="font-black text-[#0B192C]">{h.hall} <span className="font-bold text-gray-500">· {h.students}</span></p>
                      <p className="text-[11px] text-gray-600">{h.extraMinutes ? `+${h.extraMinutes} min · ${h.extensionReason}` : "No extension"}</p>
                      {!viewOnly && (
                        <button onClick={() => setExt({ plan: p, hall: h.hall, minutes: h.extraMinutes || 10, reason: h.extensionReason ?? "" })}
                          className="mt-1 text-[11px] font-black text-[#B08014] underline">Grant extra time</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="New allotment">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#0B192C]">New hall allotment</h3>
              <button aria-label="Close" onClick={() => setCreating(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="sm:col-span-3"><span className={label}>Title</span><input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label><span className={label}>Semester</span><select className={input} value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>{SEMESTER_OPTIONS.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label><span className={label}>Assessment</span><select className={input} value={form.assessmentType} onChange={(e) => setForm({ ...form, assessmentType: e.target.value })}>{["IAT-1", "IAT-2", "End Semester"].map((s) => <option key={s}>{s}</option>)}</select></label>
              <label><span className={label}>Date</span><input type="date" className={input} value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} /></label>
              <label><span className={label}>Session</span><select className={input} value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value, startTime: e.target.value === "FN" ? "09:30" : "13:30" })}><option value="FN">FN (forenoon)</option><option value="AN">AN (afternoon)</option></select></label>
              <label><span className={label}>Start time</span><input type="time" className={input} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></label>
              <label><span className={label}>Duration (minutes)</span><input type="number" min={30} max={360} className={input} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} /></label>
              <label><span className={label}>Report before (minutes)</span><input type="number" min={0} max={120} className={input} value={form.reportingMinutes} onChange={(e) => setForm({ ...form, reportingMinutes: Number(e.target.value) })} /></label>
            </div>
            <div>
              <span className={label}>Departments ({picked.length})</span>
              <div className="flex flex-wrap gap-1.5">
                {depts.map((d) => (
                  <button key={d.key} type="button" onClick={() => setPicked((p) => (p.includes(d.key) ? p.filter((x) => x !== d.key) : [...p, d.key]))}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${picked.includes(d.key) ? "bg-[#0B192C] text-white border-[#0B192C]" : "bg-white border-gray-200"}`}>
                    {d.code || d.key.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={label}>Halls (capacity {halls.reduce((a, h) => a + (h.capacity || 0), 0)})</span>
              <div className="space-y-2">
                {halls.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <input className={input} value={h.name} aria-label={`Hall ${i + 1} name`} onChange={(e) => setHalls(halls.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
                    <input type="number" min={1} max={300} className={`${input} w-28`} aria-label={`Hall ${i + 1} seats`} value={h.capacity} onChange={(e) => setHalls(halls.map((x, k) => (k === i ? { ...x, capacity: Number(e.target.value) } : x)))} />
                    <button type="button" aria-label="Remove hall" onClick={() => setHalls(halls.filter((_, k) => k !== i))} className="h-10 w-10 rounded-xl border border-gray-200 inline-flex items-center justify-center shrink-0"><X size={14} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setHalls([...halls, { name: `Hall A${101 + halls.length}`, capacity: 40 }])} className="text-xs font-black text-[#B08014] underline">+ Add hall</button>
              </div>
            </div>
            {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setCreating(false)} className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-bold">Cancel</button>
              <button onClick={create} disabled={busy || picked.length === 0} className="h-10 px-4 rounded-xl bg-[#0B192C] text-white text-xs font-black disabled:opacity-50">
                {busy ? "Allotting..." : "Allot seats (draft)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Seating matrix">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#0B192C]">{open.title} · seating matrix</h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-bold">Print</button>
                <button aria-label="Close" onClick={() => setOpen(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
              </div>
            </div>
            {seats.length === 0 && <p className="text-xs text-gray-500">Loading...</p>}
            {byHall.map(([hall, list]) => (
              <div key={hall}>
                <p className="text-xs font-black text-[#0B192C] mb-1.5">{hall} · {list.length} students</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-1.5">
                  {list.map((s) => (
                    <div key={s.regNo} className="rounded-lg border border-gray-200 px-2 py-1.5 text-[10.5px]">
                      <span className="font-black text-[#B08014]">{s.bench}</span> <span className="font-mono">{s.regNo}</span>
                      <span className="block truncate text-gray-600">{s.name} · {s.deptKey.toUpperCase().replace(/^AIDS$/, "ADS")}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ext && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Extra time">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-3 shadow-2xl">
            <h3 className="font-display font-bold text-lg text-[#0B192C]">Extra time · {ext.hall}</h3>
            <p className="text-xs text-gray-600">The students' timers in this hall move by these minutes at once. 0 removes the extension.</p>
            <label className="block"><span className={label}>Extra minutes</span><input type="number" min={0} max={120} className={input} value={ext.minutes} onChange={(e) => setExt({ ...ext, minutes: Number(e.target.value) })} /></label>
            <label className="block"><span className={label}>Reason (incident)</span><input className={input} value={ext.reason} onChange={(e) => setExt({ ...ext, reason: e.target.value })} placeholder="e.g. power failure 10:05-10:20" /></label>
            {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setExt(null)} className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-bold">Cancel</button>
              <button disabled={busy} onClick={() => act(async () => {
                await apiClient.put(`/admin/hall-plans/${ext.plan.id}/extension`, { hall: ext.hall, extraMinutes: ext.minutes, reason: ext.reason });
                setExt(null);
              })} className="h-10 px-4 rounded-xl bg-[#0B192C] text-white text-xs font-black inline-flex items-center gap-1.5 disabled:opacity-50"><CheckCircle2 size={14} /> Broadcast</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HallAllotmentPage;
