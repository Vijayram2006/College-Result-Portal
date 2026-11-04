import React, { useEffect, useMemo, useState } from "react";
import { apiClient, apiErrorMessage, authApi, facultyApi, type StudentMarkDTO } from "../services/api";
import { CheckCircle2, ClipboardList, Clock, Loader2, PenLine, RotateCcw, Search, Send } from "lucide-react";
import { SplitScreenEvaluationModal } from "./common/SplitScreenEvaluationModal";

/**
 * A faculty member's paper correction: the bundles of answer scripts the COE allotted to them (under dummy numbers).
 * They open each script beside the marks form, and forward the subject's marks to the COE when it is evaluated. The
 * server gives them only their own bundle and refuses any other script.
 */

interface MyBundle {
  deptKey: string;
  deptName: string;
  semester: string;
  subjectCode: string;
  subjectTitle: string;
  assessment: "IAT-1" | "IAT-2" | "End Semester";
  first: number;
  last: number;
  scripts: number;
  evaluated: number;
  subjectScripts: number;
  subjectEvaluated: number;
  allottedBy: string;
  allottedAt: string;
}

interface FacultyPaperCorrectionViewProps {
  currentFacultyName?: string;
  onToast?: (msg: string) => void;
}

const keyOf = (b: MyBundle) => `${b.deptKey}|${b.semester}|${b.subjectCode}|${b.assessment}`;

export const FacultyPaperCorrectionView: React.FC<FacultyPaperCorrectionViewProps> = ({ currentFacultyName = "", onToast }) => {
  const notify = (msg: string) => onToast?.(msg);
  const [bundles, setBundles] = useState<MyBundle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState("");
  const [roster, setRoster] = useState<StudentMarkDTO[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "EVALUATED">("ALL");
  const [evaluating, setEvaluating] = useState<{ code: string; slot: number } | null>(null);

  const loadBundles = React.useCallback(() => {
    apiClient.get<MyBundle[]>("/faculty/paper-allotments")
      .then((r) => { setBundles(r.data); setError(null); })
      .catch((e) => { setBundles([]); setError(apiErrorMessage(e, "Could not load your paper-correction allotments.")); });
  }, []);
  useEffect(loadBundles, [loadBundles]);

  const active = useMemo(() => bundles?.find((b) => keyOf(b) === activeKey) || bundles?.[0], [bundles, activeKey]);

  // The server returns only this evaluator's bundle, in evaluation order
  const loadRoster = React.useCallback(() => {
    if (!active) return;
    facultyApi.roster(active.semester, active.subjectCode, active.assessment, active.deptKey)
      .then(setRoster)
      .catch((e) => { setRoster([]); notify(apiErrorMessage(e, "Could not load your answer scripts.")); });
  }, [active && keyOf(active)]);
  useEffect(() => { setRoster(null); loadRoster(); }, [loadRoster]);

  const scripts = useMemo(() => (roster || []).map((m, i) => ({ mark: m, slot: (active?.first || 1) + i })), [roster, active]);
  const shown = scripts.filter(({ mark, slot }) => {
    if (filter === "PENDING" && mark.hasMarks) return false;
    if (filter === "EVALUATED" && !mark.hasMarks) return false;
    const q = search.trim().toLowerCase();
    return !q || mark.regNo.toLowerCase().includes(q) || String(slot) === q;
  });
  const done = scripts.filter((s) => s.mark.hasMarks);
  const average = done.length ? (done.reduce((n, s) => n + s.mark.grandTotal, 0) / done.length).toFixed(1) : "—";

  const refresh = () => { loadRoster(); loadBundles(); };

  const forwardToCoe = async () => {
    if (!active) return;
    if (active.subjectEvaluated < active.subjectScripts && !window.confirm(
      `Only ${active.subjectEvaluated} of ${active.subjectScripts} scripts of ${active.subjectCode} are evaluated (all evaluators). The COE cannot publish until every script has marks.\n\nForward anyway?`)) return;
    try {
      const b = await facultyApi.forward({
        semester: active.semester,
        subjectCode: active.subjectCode,
        academicYear: "2026-2027",
        assessmentType: active.assessment,
        deptKey: active.deptKey,
      });
      notify(`Forwarded the marks of ${b.totalStudents} students in ${active.subjectCode} (${active.assessment}) to the COE.`);
    } catch (e) {
      notify(apiErrorMessage(e, "The marks could not be forwarded to the COE."));
    }
  };

  // One button for every allotted subject: forwards each subject's marks to the COE
  const [forwardingAll, setForwardingAll] = useState(false);
  const forwardAll = async () => {
    if (!bundles) return;
    const ready = bundles.filter((b) => b.subjectEvaluated > 0);
    if (ready.length === 0) {
      notify("Evaluate some scripts before forwarding the marks to the COE.");
      return;
    }
    const incomplete = ready.filter((b) => b.subjectEvaluated < b.subjectScripts);
    const lines = ready.map((b) => `• ${b.subjectCode} (${b.assessment}): ${b.subjectEvaluated}/${b.subjectScripts} evaluated`).join("\n");
    const warn = incomplete.length
      ? `\n\n${incomplete.length} subject${incomplete.length === 1 ? " is" : "s are"} not fully evaluated; the COE cannot publish those until every script has marks.`
      : "";
    if (!window.confirm(`Forward the marks of ${ready.length} subject${ready.length === 1 ? "" : "s"} to the COE?\n\n${lines}${warn}`)) return;
    setForwardingAll(true);
    const done: string[] = [];
    const failed: string[] = [];
    for (const b of ready) {
      try {
        await facultyApi.forward({
          semester: b.semester,
          subjectCode: b.subjectCode,
          academicYear: "2026-2027",
          assessmentType: b.assessment,
          deptKey: b.deptKey,
        });
        done.push(b.subjectCode);
      } catch (e) {
        failed.push(`${b.subjectCode}: ${apiErrorMessage(e, "could not be forwarded")}`);
      }
    }
    setForwardingAll(false);
    if (done.length) notify(`Forwarded ${done.length} subject${done.length === 1 ? "" : "s"} to the COE: ${done.join(", ")}.`);
    if (failed.length) alert(`Not forwarded:\n${failed.join("\n")}`);
    refresh();
  };

  if (bundles === null) {
    return <div className="p-10 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading your allotments…</div>;
  }

  if (!active) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-2 shadow-sm">
        <ClipboardList size={32} className="mx-auto text-slate-300" />
        <h2 className="font-black text-[#0B192C]">No answer scripts allotted to you yet</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {error || "When the COE allots you answer scripts for correction, they appear here and you get a notification."}
        </p>
      </div>
    );
  }

  const evaluatingRow = evaluating ? roster?.find((m) => m.regNo === evaluating.code) : undefined;

  return (
    <div className="space-y-5">
      {/* My allotments */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-black text-[#0B192C] flex items-center gap-2"><ClipboardList size={16} className="text-[#D4A72C]" /> My paper-correction allotments</h2>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"><RotateCcw size={13} /> Refresh</button>
            <button onClick={forwardAll} disabled={forwardingAll || !bundles.some((b) => b.subjectEvaluated > 0)}
              className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] text-xs font-black flex items-center gap-1.5 disabled:opacity-40">
              {forwardingAll ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Forward all marks to COE
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {bundles.map((b) => {
            const selected = keyOf(b) === keyOf(active);
            const pct = b.scripts ? Math.round((b.evaluated / b.scripts) * 100) : 0;
            return (
              <button key={keyOf(b)} onClick={() => setActiveKey(keyOf(b))}
                className={`text-left p-4 rounded-2xl border-2 transition ${selected ? "border-[#D4A72C] bg-amber-50" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-[11px] px-2 py-0.5 rounded bg-[#0B192C] text-[#D4A72C]">{b.subjectCode}</span>
                  <span className="text-[10px] font-black uppercase text-slate-500">{b.assessment}</span>
                  {b.evaluated === b.scripts && b.scripts > 0 && <CheckCircle2 size={14} className="text-emerald-600 ml-auto" />}
                </div>
                <p className="mt-1.5 text-xs font-bold text-[#0B192C] line-clamp-1">{b.subjectTitle}</p>
                <p className="text-[11px] text-slate-500">{b.deptName} · {b.semester}</p>
                <p className="mt-2 text-[11px] text-slate-600">Scripts {b.first}–{b.last} · <strong>{b.evaluated}/{b.scripts}</strong> evaluated</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
              </button>
            );
          })}
        </div>
      </div>

      {/* The selected bundle */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-[#0B192C]">{active.subjectCode} — {active.subjectTitle}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {active.assessment} · {active.deptName} · allotted by {active.allottedBy} on {active.allottedAt}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Your bundle: <strong>{done.length} of {scripts.length}</strong> evaluated · your average <strong>{average}</strong> ·
              whole subject {active.subjectEvaluated}/{active.subjectScripts}
            </p>
          </div>
          <button onClick={forwardToCoe} disabled={active.subjectEvaluated === 0}
            className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] text-xs font-black flex items-center gap-1.5 disabled:opacity-40">
            <Send size={14} /> Forward subject marks to COE
          </button>
        </div>

        <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b border-slate-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dummy number or script no."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A72C]" />
          </div>
          {(["ALL", "PENDING", "EVALUATED"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-black ${filter === f ? "bg-[#0B192C] text-[#D4A72C]" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {f === "ALL" ? `All (${scripts.length})` : f === "PENDING" ? `Pending (${scripts.length - done.length})` : `Evaluated (${done.length})`}
            </button>
          ))}
        </div>

        {roster === null ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading scripts…</div>
        ) : shown.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No scripts match.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-5 py-2.5">Script no.</th>
                  <th className="text-left px-3 py-2.5">Dummy number</th>
                  <th className="text-left px-3 py-2.5">Part A</th>
                  <th className="text-left px-3 py-2.5">Part B+C</th>
                  <th className="text-left px-3 py-2.5">Total</th>
                  <th className="text-left px-3 py-2.5">Status</th>
                  <th className="text-right px-5 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map(({ mark, slot }) => (
                  <tr key={mark.regNo}>
                    <td className="px-5 py-2.5 font-mono">{slot}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-[#0B192C]">{mark.regNo}</td>
                    <td className="px-3 py-2.5">{mark.hasMarks ? mark.partATotal : "—"}</td>
                    <td className="px-3 py-2.5">{mark.hasMarks ? mark.partBCTotal : "—"}</td>
                    <td className="px-3 py-2.5 font-bold">{mark.hasMarks ? `${mark.grandTotal} (${mark.grade})` : "—"}</td>
                    <td className="px-3 py-2.5">
                      {mark.hasMarks
                        ? <span className="inline-flex items-center gap-1 text-emerald-700 font-bold"><CheckCircle2 size={12} /> Evaluated</span>
                        : <span className="inline-flex items-center gap-1 text-amber-700 font-bold"><Clock size={12} /> Pending</span>}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button onClick={() => setEvaluating({ code: mark.regNo, slot })}
                        className="px-3 py-1.5 rounded-lg bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] text-[11px] font-black inline-flex items-center gap-1">
                        <PenLine size={12} /> {mark.hasMarks ? "Review" : "Evaluate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Evaluation desk: the script beside the marks form */}
      {evaluating && (
        <SplitScreenEvaluationModal
          isOpen
          onClose={() => setEvaluating(null)}
          dummyBarcode={evaluating.code}
          isBlindValuation
          studentRegNo={evaluating.code}
          subjectCode={active.subjectCode}
          subjectTitle={active.subjectTitle}
          semester={active.semester}
          department={active.deptName}
          assessmentType={active.assessment}
          packetId={`${active.subjectCode}/${active.first}-${active.last}`}
          {...(() => {
            // A script marked before opens with its saved marks and remarks, and without the waiting time
            if (!evaluatingRow || !evaluatingRow.hasMarks) return { minSeconds: 180 };
            const bc = evaluatingRow.partBC as Record<string, { a: { i?: number; ii?: number; iii?: number }; b: { i?: number; ii?: number; iii?: number } }> | undefined;
            const cos: Record<number, string> = { 11: "CO1", 12: "CO1", 13: "CO2", 14: "CO2", 15: "CO3", 16: "CO6" };
            const sub = (x?: { i?: number; ii?: number; iii?: number }) => ({ i: x?.i ?? 0, ii: x?.ii ?? 0, iii: x?.iii ?? 0 });
            return {
              minSeconds: 0,
              initialPartA: evaluatingRow.partA,
              initialPartB: bc ? Object.fromEntries([11, 12, 13, 14, 15, 16].map((q) => [q, { a: sub(bc[String(q)]?.a), b: sub(bc[String(q)]?.b), co: cos[q] }])) : undefined,
              initialRemarks: evaluatingRow.remarks,
              initialNotAttempted: (evaluatingRow as { notAttempted?: string[] }).notAttempted,
            };
          })()}
          pdfLoader={() => facultyApi.answerScript({ semester: active.semester, subject: active.subjectCode, regNo: evaluating.code, assessment: active.assessment, dept: active.deptKey })}
          onSaveMarks={async (result) => {
            // Saved to the real marks (the server checks the bundle and the limits, and maps the dummy number to the student)
            const sub = (x: { i: number; ii: number; iii: number }) => ({ i: x.i || 0, ii: x.ii || 0, iii: x.iii || 0 });
            const partBC: Record<string, { a: { i: number; ii: number; iii: number }; b: { i: number; ii: number; iii: number } }> = {};
            for (const q of [11, 12, 13, 14, 15, 16]) {
              const d = result.partBCMarks[q];
              partBC[String(q)] = { a: sub(d ? d.a : { i: 0, ii: 0, iii: 0 }), b: sub(d ? d.b : { i: 0, ii: 0, iii: 0 }) };
            }
            try {
              await facultyApi.save({
                semester: active.semester,
                subjectCode: active.subjectCode,
                regNo: evaluating.code,
                assessmentType: active.assessment,
                partA: result.partAMarks,
                partBC,
                examinerName: authApi.currentUser()?.name || currentFacultyName,
                examinerDesignation: "Internal Examiner",
                expectedVersion: evaluatingRow?.version,
                deptKey: active.deptKey,
                remarks: result.remarks,
                notAttempted: result.notAttempted,
              } as Parameters<typeof facultyApi.save>[0]);
              notify(`Marks saved for ${evaluating.code}: ${result.grandTotal} / 100 (${result.grade}).`);
              refresh();
            } catch (e) {
              notify(apiErrorMessage(e, "The marks could not be saved."));
            }
          }}
        />
      )}
    </div>
  );
};

export default FacultyPaperCorrectionView;
