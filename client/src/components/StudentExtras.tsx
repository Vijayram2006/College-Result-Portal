import React, { useEffect, useState } from "react";
import { Armchair, Clock, MessageSquareText, ShieldAlert } from "lucide-react";
import { apiClient, type SemesterResultDTO } from "../services/api";

/**
 * Student portal additions from the requirements addendum: the seating allotment card (REQ-06/07/08, with the
 * COE's extra time, REQ-09), the withheld notice (REQ-15) and the evaluators' remarks (REQ-04).
 */

type SeatingCard = {
  planId: number; title: string; semester: string; assessmentType: string; examDate: string; session: string;
  reportingTime: string; startTime: string; endTime: string; durationMinutes: number; extraMinutes: number;
  extensionReason: string | null; hall: string; bench: string; publishedBy: string;
};

const hm = (t: string) => t.slice(0, 5);
const day = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/** The live time left in the hall's examination window, when the examination is today and under way. */
function useCountdown(card: SeatingCard) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const start = new Date(`${card.examDate}T${card.startTime}`);
  const end = new Date(`${card.examDate}T${card.endTime}`);
  if (now < start || now > end) return null;
  const left = Math.max(0, Math.round((end.getTime() - now.getTime()) / 1000));
  return `${Math.floor(left / 3600)}:${String(Math.floor((left % 3600) / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
}

const Card: React.FC<{ c: SeatingCard }> = ({ c }) => {
  const left = useCountdown(c);
  return (
    <div className="rounded-2xl border-2 border-[#D4A72C] bg-white overflow-hidden">
      <div className="bg-[#0B192C] text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-black">{c.title}</span>
        <span className="text-[10px] font-bold text-[#D4A72C] uppercase">{c.assessmentType} · {c.semester}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
        <div><p className="text-[10px] font-black uppercase text-slate-500">Hall No</p><p className="text-xl font-black text-[#0B192C]">{c.hall}</p></div>
        <div><p className="text-[10px] font-black uppercase text-slate-500">Bench ID</p><p className="text-xl font-black text-[#0B192C]">{c.bench}</p></div>
        <div><p className="text-[10px] font-black uppercase text-slate-500">Session</p><p className="text-sm font-black text-[#0B192C]">{day(c.examDate)} · {c.session}</p><p className="text-[11px] text-slate-600">{hm(c.startTime)} – {hm(c.endTime)}</p></div>
        <div><p className="text-[10px] font-black uppercase text-slate-500">Reporting time</p><p className="text-xl font-black text-rose-700">{hm(c.reportingTime)}</p></div>
      </div>
      {(c.extraMinutes > 0 || left) && (
        <div className="px-4 pb-3 flex flex-wrap items-center gap-3 text-xs">
          {c.extraMinutes > 0 && (
            <span className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-bold text-emerald-800">
              +{c.extraMinutes} minutes granted by the COE{c.extensionReason ? `: ${c.extensionReason}` : ""}
            </span>
          )}
          {left && <span className="inline-flex items-center gap-1 font-black text-[#0B192C]"><Clock size={13} /> Time left {left}</span>}
        </div>
      )}
    </div>
  );
};

export const StudentSeatingCards: React.FC = () => {
  const [cards, setCards] = useState<SeatingCard[]>([]);
  useEffect(() => {
    const load = () => apiClient.get<SeatingCard[]>("/student/seating").then((r) => setCards(r.data)).catch(() => setCards([]));
    load();
    // the COE's extra time reaches the card without a reload
    const t = window.setInterval(load, 60000);
    return () => window.clearInterval(t);
  }, []);
  if (cards.length === 0) return null;
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
      <h3 className="text-sm font-black text-[#0B192C] flex items-center gap-2"><Armchair size={16} className="text-[#D4A72C]" /> Seating Allotment</h3>
      {cards.map((c) => <Card key={`${c.planId}`} c={c} />)}
    </div>
  );
};

/** Shown above the statement of marks: the withheld notice, or the evaluators' remarks of the shown assessment. */
export const StudentResultNotes: React.FC<{ result: SemesterResultDTO | null }> = ({ result }) => {
  if (!result) return null;
  if (result.result === "WITHHELD") {
    return (
      <div role="alert" className="w-full max-w-7xl rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 flex items-start gap-3">
        <ShieldAlert size={20} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-black">Your {result.semesterLabel} {result.assessmentType} result is withheld ({result.withheldCode}).</p>
          {result.withheldReason && <p className="text-xs mt-0.5">{result.withheldReason}</p>}
          <p className="text-xs mt-1">Contact the Office of the Controller of Examinations to have it released.</p>
        </div>
      </div>
    );
  }
  const withRemarks = result.subjects.filter((s) => s.remarks && Object.keys(s.remarks).length > 0);
  if (withRemarks.length === 0) return null;
  const order = (k: string) => (k === "overall" ? 99 : Number(k.slice(1)));
  return (
    <div className="w-full max-w-7xl bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
      <h3 className="text-sm font-black text-[#0B192C] flex items-center gap-2"><MessageSquareText size={16} className="text-[#D4A72C]" /> Evaluator's remarks</h3>
      {withRemarks.map((s) => (
        <div key={s.code} className="rounded-2xl border border-slate-100 p-3">
          <p className="text-xs font-black text-[#0B192C]">{s.code} · {s.title} <span className="text-slate-500 font-bold">· {s.total}/100 · {s.grade}</span></p>
          <ul className="mt-1.5 space-y-1">
            {Object.entries(s.remarks!).sort((a, b) => order(a[0]) - order(b[0])).map(([k, v]) => (
              <li key={k} className="text-xs text-slate-700"><span className="font-black text-[#0B192C]">{k === "overall" ? "Overall" : `Question ${k.slice(1)}`}:</span> {v}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
