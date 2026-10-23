import React, { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, Send } from "lucide-react";
import { apiClient, apiErrorMessage } from "../services/api";

/**
 * Course exit survey: for each subject of the semester the student rates how well each course outcome (CO1-CO6) was
 * achieved, from 1 (poor) to 5 (excellent). The answers feed the indirect CO attainment of the faculty's CO sheet.
 */

type SurveySubject = {
  subjectCode: string; subjectTitle: string; ratings: number[] | null;
  window: { opensAt: string; closesAt: string; open: boolean } | null;
};
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

const COS = ["CO1", "CO2", "CO3", "CO4", "CO5", "CO6"];
const SCALE = [
  { v: 5, label: "Excellent" },
  { v: 4, label: "Very good" },
  { v: 3, label: "Good" },
  { v: 2, label: "Satisfactory" },
  { v: 1, label: "Poor" },
];

export const StudentExitSurvey: React.FC = () => {
  const [subjects, setSubjects] = useState<SurveySubject[]>([]);
  const [drafts, setDrafts] = useState<Record<string, (number | null)[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiClient
      .get<SurveySubject[]>("/student/exit-survey")
      .then((r) => setSubjects(r.data))
      .catch((e) => setMessage({ ok: false, text: apiErrorMessage(e, "Could not load the survey.") }))
      .finally(() => setLoading(false));
  }, []);

  const valueOf = (s: SurveySubject, i: number) => (drafts[s.subjectCode] ?? s.ratings ?? [])[i] ?? null;
  const set = (s: SurveySubject, i: number, v: number) =>
    setDrafts((prev) => {
      const cur = [...(prev[s.subjectCode] ?? s.ratings ?? Array(6).fill(null))];
      cur[i] = v;
      return { ...prev, [s.subjectCode]: cur };
    });

  const submit = async (s: SurveySubject) => {
    const ratings = drafts[s.subjectCode] ?? s.ratings;
    if (!ratings || ratings.some((v) => v == null)) {
      setMessage({ ok: false, text: `Rate all six course outcomes of ${s.subjectCode} before submitting.` });
      return;
    }
    setSaving(s.subjectCode);
    setMessage(null);
    try {
      const saved = (await apiClient.put<SurveySubject>("/student/exit-survey", { subjectCode: s.subjectCode, ratings })).data;
      setSubjects((prev) => prev.map((x) => (x.subjectCode === saved.subjectCode ? saved : x)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[s.subjectCode];
        return next;
      });
      setMessage({ ok: true, text: `Thank you. Your survey for ${s.subjectCode} was submitted.` });
    } catch (e) {
      setMessage({ ok: false, text: apiErrorMessage(e, "Could not submit the survey.") });
    } finally {
      setSaving("");
    }
  };

  const done = subjects.filter((s) => s.ratings).length;

  return (
    <div className="w-full max-w-7xl space-y-5">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#B08014]">Course Exit Survey</span>
        <h2 className="text-xl font-black text-[#0B192C] mt-1 flex items-center gap-2">
          <ClipboardCheck size={20} className="text-[#D4A72C]" /> How well did each course meet its outcomes?
        </h2>
        <p className="text-xs text-slate-600 mt-1 max-w-3xl">
          For every subject of this semester, rate each course outcome (CO1 to CO6) from 5 (excellent) to 1 (poor). Your answers
          are used for the college's CO attainment. {subjects.length > 0 && `${done} of ${subjects.length} subjects submitted.`}
        </p>
      </div>

      {message && (
        <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}
      {loading && <p className="text-xs text-slate-500">Loading your subjects...</p>}
      {!loading && subjects.length === 0 && !message && <p className="text-xs text-slate-500">No course exit survey is open for your subjects right now. Your faculty will open it for a period.</p>}

      {subjects.map((s) => (
        <div key={s.subjectCode} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#0B192C]">{s.subjectCode} · {s.subjectTitle}</p>
              {s.window && (
                <p className={`text-[11px] font-bold mt-0.5 ${s.window.open ? "text-slate-600" : "text-red-700"}`}>
                  {s.window.open ? `Open until ${when(s.window.closesAt)}`
                    : new Date(s.window.opensAt) > new Date() ? `Opens ${when(s.window.opensAt)}` : `Closed on ${when(s.window.closesAt)}`}
                </p>
              )}
              {s.ratings && !drafts[s.subjectCode] && (
                <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mt-0.5"><CheckCircle2 size={12} /> Submitted (you can change it)</p>
              )}
            </div>
            <button onClick={() => submit(s)} disabled={!s.window?.open || saving === s.subjectCode || (!drafts[s.subjectCode] && !!s.ratings)}
              className="h-9 px-4 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-black inline-flex items-center gap-2 disabled:opacity-50">
              <Send size={14} /> {saving === s.subjectCode ? "Submitting..." : "Submit"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs min-w-[560px] w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 text-[10px] uppercase text-slate-500">Outcome</th>
                  {SCALE.map((x) => <th key={x.v} className="p-2 text-[10px] uppercase text-slate-500">{x.label} ({x.v})</th>)}
                </tr>
              </thead>
              <tbody>
                {COS.map((co, i) => (
                  <tr key={co} className="border-t border-slate-100">
                    <td className="p-2 font-black text-[#0B192C]">{co}</td>
                    {SCALE.map((x) => (
                      <td key={x.v} className="p-2 text-center">
                        <input type="radio" name={`${s.subjectCode}-${co}`} aria-label={`${s.subjectCode} ${co} ${x.label}`}
                          checked={valueOf(s, i) === x.v} onChange={() => set(s, i, x.v)} disabled={!s.window?.open} className="h-4 w-4 accent-[#D4A72C]" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StudentExitSurvey;
