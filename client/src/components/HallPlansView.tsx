import React, { useState } from "react";
import { useEffect } from "react";
import { Armchair, CheckCircle2, Eye, Lock, Send, X } from "lucide-react";
import { apiClient, apiErrorMessage } from "../services/api";

/**
 * The COE's published examination hall allotments as they cascade (REQ-06/07/08): the Associate Dean oversees them
 * read-only, the HOD validates their department's seats for the faculty, and the faculty publish them to the
 * students' seating card.
 */

type DeptStep = { deptKey: string; deptName: string; students: number; hodValidatedBy: string | null; hodValidatedAt: string | null; facultyPublishedBy: string | null; facultyPublishedAt: string | null };
type HallSummary = { hall: string; students: number; extraMinutes: number; extensionReason: string | null };
type Plan = {
  id: number; title: string; semester: string; assessmentType: string; examDate: string; session: string; startTime: string;
  durationMinutes: number; reportingMinutes: number; status: string; seal: string | null; publishedBy: string | null;
  publishedAt: string | null; departments: DeptStep[]; halls: HallSummary[];
};
type Seat = { hall: string; bench: string; regNo: string; name: string; deptKey: string };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");

export const HallPlansView: React.FC<{ mode: "dean" | "hod" | "faculty"; deptKey?: string; onToast?: (m: string) => void }> = ({ mode, deptKey, onToast }) => {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Plan | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);

  const load = () => apiClient.get<Plan[]>(`/${mode}/hall-plans`).then((r) => setPlans(r.data))
    .catch((e) => { setPlans([]); setError(apiErrorMessage(e, "Could not load the hall allotments.")); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [mode]);

  const step = (p: Plan) => p.departments.find((d) => d.deptKey === deptKey);
  const act = async (path: string, done: string) => {
    setBusy(true);
    setError("");
    try {
      await apiClient.post(path);
      onToast?.(done);
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, "The action failed."));
    } finally {
      setBusy(false);
    }
  };
  const view = async (p: Plan) => {
    setOpen(p);
    setSeats([]);
    try {
      setSeats((await apiClient.get<Seat[]>(`/${mode}/hall-plans/${p.id}/seats`)).data);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not load the seats."));
    }
  };

  return (
    <div className="w-full max-w-7xl space-y-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#0B192C] flex items-center gap-2"><Armchair size={20} className="text-[#D4A72C]" /> Examination Hall Allotment</h2>
        <p className="text-xs text-slate-600 mt-1">
          {mode === "dean" ? "Allotments published by the COE (view only). Each HOD validates their department, then the faculty publish the seats to the students."
            : mode === "hod" ? "The COE's allotment for your department. Check the seats and validate them; the faculty then publish them to the students."
            : "After your HOD validates the allotment, publish it so that the students see their seating card."}
        </p>
        {error && <p role="alert" className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</p>}
      </div>
      {plans === null && <p className="text-xs text-slate-500">Loading...</p>}
      {plans?.length === 0 && !error && <p className="text-xs text-slate-500">No hall allotment has been published yet.</p>}
      {plans?.map((p) => {
        const mine = step(p);
        return (
          <div key={p.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px]">
                <p className="text-sm font-black text-[#0B192C]">{p.title}</p>
                <p className="text-[11px] text-slate-600 font-semibold">
                  {p.semester} · {p.assessmentType} · {new Date(p.examDate + "T00:00:00").toLocaleDateString("en-IN", { dateStyle: "medium" })} {p.session} · {p.startTime.slice(0, 5)} · {p.durationMinutes} min
                </p>
                <p className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-0.5"><Lock size={11} /> Published by {p.publishedBy} on {when(p.publishedAt)} · seal {p.seal?.slice(0, 12)}…</p>
              </div>
              <button onClick={() => view(p)} className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold inline-flex items-center gap-1.5"><Eye size={14} /> Seats</button>
              {mode === "hod" && mine && !mine.hodValidatedAt && (
                <button disabled={busy} onClick={() => act(`/hod/hall-plans/${p.id}/validate`, "Validated and sent to the faculty.")}
                  className="h-9 px-3 rounded-xl bg-[#0B192C] text-white text-xs font-black inline-flex items-center gap-1.5 disabled:opacity-50"><CheckCircle2 size={14} /> Validate &amp; send to faculty</button>
              )}
              {mode === "faculty" && mine && mine.hodValidatedAt && !mine.facultyPublishedAt && (
                <button disabled={busy} onClick={() => act(`/faculty/hall-plans/${p.id}/publish`, "Published to the students.")}
                  className="h-9 px-3 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-black inline-flex items-center gap-1.5 disabled:opacity-50"><Send size={14} /> Publish to students</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(mode === "dean" ? p.departments : p.departments.filter((d) => d.deptKey === deptKey)).map((d) => (
                <div key={d.deptKey} className="rounded-xl border border-slate-200 px-3 py-2 text-[11px]">
                  <p className="font-black text-[#0B192C]">{d.deptName} · {d.students} students</p>
                  <p>HOD: {d.hodValidatedAt ? <span className="text-emerald-700 font-bold">validated by {d.hodValidatedBy}</span> : <span className="text-amber-700 font-bold">waiting</span>}</p>
                  <p>Students: {d.facultyPublishedAt ? <span className="text-emerald-700 font-bold">published by {d.facultyPublishedBy}</span> : <span className="text-slate-500">not yet</span>}</p>
                </div>
              ))}
              {mode === "faculty" && mine && !mine.hodValidatedAt && <p className="text-[11px] font-semibold text-amber-700 self-center">Waiting for the HOD to validate.</p>}
            </div>
            {p.halls.some((h) => h.extraMinutes > 0) && (
              <p className="text-[11px] font-semibold text-emerald-800">
                Extra time: {p.halls.filter((h) => h.extraMinutes > 0).map((h) => `${h.hall} +${h.extraMinutes} min`).join(", ")}
              </p>
            )}
          </div>
        );
      })}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Seats">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-[#0B192C]">{open.title} · seats</h3>
              <button aria-label="Close" onClick={() => setOpen(null)} className="p-2 rounded-lg hover:bg-slate-100"><X size={16} /></button>
            </div>
            {seats.length === 0 && <p className="text-xs text-slate-500">Loading...</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-1.5">
              {seats.map((s) => (
                <div key={s.regNo} className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10.5px]">
                  <span className="font-black text-[#B08014]">{s.hall} · {s.bench}</span>
                  <span className="block font-mono">{s.regNo}</span>
                  <span className="block truncate text-slate-600">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HallPlansView;
