import React, { useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";

/**
 * The student's scanned answer script, shown beside the marks form so marks can be checked against the paper.
 * `fetchPdf` loads it (with the sign-in token); a 404 means none was uploaded yet.
 */
export const AnswerScriptPane: React.FC<{
  fetchPdf: () => Promise<Blob>;
  /** Changes whenever a different script should be shown (student, subject or assessment). */
  scriptKey: string;
  label: string;
  /** Shown instead of loading anything, e.g. until the assessment is chosen. */
  prompt?: string;
}> = ({ fetchPdf, scriptKey, label, prompt }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none" | "error">("loading");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (prompt) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setState("loading");
    setUrl(null);
    fetchPdf()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setUrl(objectUrl);
        setState("ready");
      })
      .catch((err) => {
        if (!cancelled) setState(err?.response?.status === 404 ? "none" : "error");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [scriptKey, reload, prompt]);

  return (
    <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-2xl flex flex-col overflow-hidden lg:w-1/2 min-h-[50vh] lg:min-h-0 lg:h-[94vh]">
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[#0B192C] text-white">
        <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
          <FileText size={15} className="text-[#D4A72C]" /> Answer script
        </span>
        <span className="text-[10px] font-semibold text-white/70 truncate">{label}</span>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[#D4A72C] hover:underline shrink-0">
            Open in new tab
          </a>
        )}
      </div>
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        {prompt ? (
          <div className="text-center px-6 space-y-2">
            <FileText size={36} className="mx-auto text-gray-300" />
            <p className="text-xs font-bold text-gray-600">{prompt}</p>
          </div>
        ) : state === "ready" && url ? (
          <iframe src={`${url}#view=FitH`} title="Answer script" className="w-full h-full min-h-[50vh] border-0" />
        ) : state === "loading" ? (
          <span className="text-xs font-bold text-gray-500 flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin" /> Loading answer script…
          </span>
        ) : (
          <div className="text-center px-6 space-y-2">
            <FileText size={36} className="mx-auto text-gray-300" />
            <p className="text-xs font-bold text-gray-600">
              {state === "none" ? "No answer script uploaded for this assessment yet." : "Could not load the answer script."}
            </p>
            <p className="text-[11px] text-gray-500">
              {state === "none"
                ? "The COE uploads scripts on the Answer Scripts page. You can still enter marks."
                : "Check that the result server is running."}
            </p>
            <button type="button" onClick={() => setReload((n) => n + 1)} className="text-[11px] font-bold text-[#B08014] hover:underline">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
