import React, { useEffect, useState } from "react";
import { CheckCircle2, ListChecks, Save, X } from "lucide-react";
import { apiClient, apiErrorMessage } from "../services/api";

/**
 * The subject faculty's online quiz for one IAT cycle: 25 one-mark multiple-choice questions (the CO of each is fixed
 * by its position, as in the R2026 workbook) and the period it is open to the students. The students answer it in
 * the student portal and each score fills the CO sheet's quiz column automatically.
 */

export type QuizQuestion = { q: string; options: string[]; answer: number | null; co: string };
export type Quiz = {
  id: number; semester: string; subjectCode: string; subjectTitle: string; cycle: string; title: string;
  questions: QuizQuestion[]; opensAt: string; closesAt: string; open: boolean; createdBy: string; attempts: number;
  myScore: number | null;
};

export const QUIZ_QUESTIONS = 25;
const coOf = (cycle: string, i: number) =>
  cycle === "IAT-2" ? (i < 5 ? "CO3" : i < 15 ? "CO4" : "CO5") : i < 10 ? "CO1" : i < 20 ? "CO2" : "CO3";
const blank = (cycle: string): QuizQuestion[] =>
  Array.from({ length: QUIZ_QUESTIONS }, (_, i) => ({ q: "", options: ["", "", "", ""], answer: null, co: coOf(cycle, i) }));
const local = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export const QuizEditor: React.FC<{
  mode: "faculty" | "hod"; semester: string; subjectCode: string; cycle: string;
  onLoaded?: (exists: boolean) => void; onToast?: (m: string) => void;
}> = ({ mode, semester, subjectCode, cycle, onLoaded, onToast }) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>(blank(cycle));
  const [opens, setOpens] = useState(local(new Date().toISOString()));
  const [closes, setCloses] = useState(local(new Date(Date.now() + 2 * 864e5).toISOString()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    apiClient.get<Quiz[]>(`/${mode}/quizzes`, { params: { semester, subject: subjectCode } })
      .then((r) => {
        const q = r.data.find((x) => x.cycle === cycle) ?? null;
        setQuiz(q);
        onLoaded?.(!!q);
      })
      .catch((e) => setError(apiErrorMessage(e, "Could not load the quiz.")));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [semester, subjectCode, cycle]);

  const startEdit = () => {
    setTitle(quiz?.title ?? (cycle === "IAT-2" ? "Technical Quiz II" : "Technical Quiz 1"));
    setQuestions(quiz ? quiz.questions.map((x) => ({ ...x, options: [...x.options] })) : blank(cycle));
    if (quiz) { setOpens(local(quiz.opensAt)); setCloses(local(quiz.closesAt)); }
    setError("");
    setEditing(true);
  };

  const setQ = (i: number, patch: Partial<QuizQuestion>) =>
    setQuestions((prev) => prev.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const save = async () => {
    const bad = questions.findIndex((x) => !x.q.trim() || x.options.some((o) => !o.trim()) || x.answer == null);
    if (bad >= 0) {
      setError(`Question ${bad + 1}: write the question, all four options and choose the correct one.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = (await apiClient.put<Quiz>(`/${mode}/quizzes`, {
        semester, subjectCode, cycle, title, questions,
        opensAt: new Date(opens).toISOString(), closesAt: new Date(closes).toISOString(),
      })).data;
      setQuiz(saved);
      onLoaded?.(true);
      setEditing(false);
      onToast?.(`The ${cycle} quiz of ${subjectCode} is set for the students.`);
    } catch (e) {
      setError(apiErrorMessage(e, "The quiz could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <ListChecks size={16} className="text-[#B08014]" />
        <div className="flex-1 min-w-[220px]">
          <p className="font-black text-[#0B192C]">Online quiz for the students ({cycle})</p>
          {quiz ? (
            <p className="text-slate-600">
              {quiz.title} · {quiz.open ? "open now" : new Date(quiz.opensAt) > new Date() ? `opens ${when(quiz.opensAt)}` : "closed"} · {when(quiz.opensAt)} to {when(quiz.closesAt)} · {quiz.attempts} answered.
              The marks below fill in from the students' answers.
            </p>
          ) : (
            <p className="text-slate-600">Write {QUIZ_QUESTIONS} multiple-choice questions and open them to the students for a period; their scores fill this sheet automatically.</p>
          )}
        </div>
        <button onClick={startEdit} className="h-9 px-4 rounded-xl bg-[#D4A72C] text-[#0B192C] font-black">
          {quiz ? (quiz.attempts > 0 ? "Change period" : "Edit quiz") : "Prepare quiz"}
        </button>
      </div>
      {error && !editing && <p role="alert" className="font-semibold text-red-700">{error}</p>}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Online quiz">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-display font-bold text-lg text-[#0B192C]">{subjectCode} · {cycle} online quiz</h3>
              <button aria-label="Close" onClick={() => setEditing(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block"><span className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Title</span>
                  <input className="h-10 w-full rounded-xl border border-slate-200 px-3" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
                <label className="block"><span className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Opens</span>
                  <input type="datetime-local" className="h-10 w-full rounded-xl border border-slate-200 px-3" value={opens} onChange={(e) => setOpens(e.target.value)} /></label>
                <label className="block"><span className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Closes</span>
                  <input type="datetime-local" className="h-10 w-full rounded-xl border border-slate-200 px-3" value={closes} onChange={(e) => setCloses(e.target.value)} /></label>
              </div>
              {quiz && quiz.attempts > 0 && (
                <p className="rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 font-semibold text-sky-900">Students have already answered; only the period can change.</p>
              )}
              <fieldset disabled={!!quiz && quiz.attempts > 0} className="space-y-3">
                {questions.map((x, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#0B192C] w-8">Q{i + 1}</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#D4A72C]/20">{x.co}</span>
                      <input className="flex-1 h-9 rounded-lg border border-slate-200 px-3" placeholder="Question" aria-label={`Question ${i + 1}`}
                        value={x.q} onChange={(e) => setQ(i, { q: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
                      {x.options.map((o, k) => (
                        <label key={k} className="flex items-center gap-2">
                          <input type="radio" name={`ans-${i}`} className="h-4 w-4 accent-emerald-600" checked={x.answer === k}
                            onChange={() => setQ(i, { answer: k })} aria-label={`Question ${i + 1} correct option ${k + 1}`} />
                          <input className="flex-1 h-8 rounded-lg border border-slate-200 px-2" placeholder={`Option ${String.fromCharCode(65 + k)}`}
                            aria-label={`Question ${i + 1} option ${k + 1}`} value={o}
                            onChange={(e) => setQ(i, { options: x.options.map((v, m) => (m === k ? e.target.value : v)) })} />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </fieldset>
            </div>
            <div className="p-5 border-t border-slate-100 flex items-center gap-3">
              {error && <p role="alert" className="flex-1 font-semibold text-red-700">{error}</p>}
              <span className="flex-1 text-slate-500">{!error && "Choose the correct option of every question with the green button."}</span>
              <button onClick={() => setEditing(false)} className="h-10 px-4 rounded-xl border border-slate-200 font-bold">Cancel</button>
              <button onClick={save} disabled={busy} className="h-10 px-4 rounded-xl bg-[#0B192C] text-white font-black inline-flex items-center gap-2 disabled:opacity-50">
                <Save size={14} /> {busy ? "Saving..." : "Save & open to students"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Student portal: the open quizzes of the semester; one attempt each, the score fills the CO sheet. */
export const StudentQuizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, (number | null)[]>>({});
  const [busy, setBusy] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => apiClient.get<Quiz[]>("/student/quizzes").then((r) => setQuizzes(r.data))
    .catch((e) => { setQuizzes([]); setMessage({ ok: false, text: apiErrorMessage(e, "Could not load the quizzes.") }); });
  useEffect(() => { load(); }, []);

  const submit = async (q: Quiz) => {
    const a = answers[q.id] ?? [];
    if (a.length < q.questions.length || a.some((v) => v == null)) {
      setMessage({ ok: false, text: `Answer all ${q.questions.length} questions of ${q.subjectCode} before submitting.` });
      return;
    }
    if (!window.confirm("Submit your answers? You can answer this quiz only once.")) return;
    setBusy(q.id);
    setMessage(null);
    try {
      const saved = (await apiClient.post<Quiz>(`/student/quizzes/${q.id}`, { answers: a })).data;
      setMessage({ ok: true, text: `Submitted. Your score in ${q.subjectCode}: ${saved.myScore}/${q.questions.length}.` });
      load();
    } catch (e) {
      setMessage({ ok: false, text: apiErrorMessage(e, "Could not submit the quiz.") });
    } finally {
      setBusy(0);
    }
  };

  return (
    <div className="w-full max-w-5xl space-y-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#B08014]">Online Quiz</span>
        <h2 className="text-xl font-black text-[#0B192C] mt-1 flex items-center gap-2"><ListChecks size={20} className="text-[#D4A72C]" /> Technical quizzes</h2>
        <p className="text-xs text-slate-600 mt-1">Your subject faculty opens each quiz for a period. Every question carries one mark; you can answer a quiz only once.</p>
      </div>
      {message && (
        <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{message.text}</div>
      )}
      {quizzes === null && <p className="text-xs text-slate-500">Loading...</p>}
      {quizzes?.length === 0 && <p className="text-xs text-slate-500">No quiz is open for your subjects right now.</p>}
      {quizzes?.map((q) => (
        <div key={q.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black text-[#0B192C]">{q.subjectCode} · {q.subjectTitle} · {q.title} ({q.cycle})</p>
              <p className="text-[11px] font-bold text-slate-600">
                {q.myScore != null ? `Answered · score ${q.myScore}/${QUIZ_QUESTIONS}` : q.open ? `Open until ${when(q.closesAt)}`
                  : new Date(q.opensAt) > new Date() ? `Opens ${when(q.opensAt)}` : `Closed on ${when(q.closesAt)}`}
              </p>
            </div>
            {q.myScore != null && <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-black"><CheckCircle2 size={14} /> Submitted</span>}
          </div>
          {q.open && q.myScore == null && q.questions.length > 0 && (
            <>
              <ol className="space-y-3">
                {q.questions.map((x, i) => (
                  <li key={i} className="rounded-2xl border border-slate-100 p-3">
                    <p className="text-xs font-bold text-[#0B192C]">{i + 1}. {x.q}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2">
                      {x.options.map((o, k) => (
                        <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input type="radio" name={`quiz-${q.id}-${i}`} className="h-4 w-4 accent-[#D4A72C]"
                            checked={(answers[q.id] ?? [])[i] === k}
                            onChange={() => setAnswers((prev) => {
                              const cur = [...(prev[q.id] ?? Array(q.questions.length).fill(null))];
                              cur[i] = k;
                              return { ...prev, [q.id]: cur };
                            })} />
                          <span>{String.fromCharCode(65 + k)}. {o}</span>
                        </label>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
              <button onClick={() => submit(q)} disabled={busy === q.id}
                className="h-10 px-5 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-black disabled:opacity-50">
                {busy === q.id ? "Submitting..." : "Submit answers"}
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default QuizEditor;
