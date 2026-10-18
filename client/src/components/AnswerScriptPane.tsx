import React, { useEffect, useRef, useState } from "react";
import { Download, FileText, Minus, Plus, RefreshCw } from "lucide-react";

/**
 * Phones can't show a PDF inside a page: Android Chrome only offers an "Open" button (which can't open an
 * in-memory blob), and iOS shows just the first page. There, and on touch devices generally, the pages are drawn
 * with pdf.js instead; desktop browsers keep their built-in viewer.
 */
const drawPagesOurselves = () =>
  typeof navigator === "undefined" ||
  (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled !== true ||
  window.matchMedia?.("(pointer: coarse)").matches;

/** Every page of the PDF as a canvas, fitted to the pane width (times the zoom), crisp on high-DPI screens. */
const PdfPages: React.FC<{ blob: Blob; zoom: number; onError: () => void }> = ({ blob, zoom, onError }) => {
  const box = useRef<HTMLDivElement>(null);
  // Canvases go into this element, which React never renders children into
  const pages = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!box.current) return;
    // Redraw only on a real resize (e.g. rotating the phone). Small changes, like the scrollbar appearing once the
    // pages are drawn, would otherwise trigger an endless redraw loop.
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.floor(entry.contentRect.width);
      setWidth((prev) => (prev === 0 || Math.abs(next - prev) > 48 ? next : prev));
    });
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = pages.current;
    if (!container || width === 0) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    (async () => {
      // Loaded only when needed, so desktop users never download pdf.js
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
      destroy = () => void task.destroy();
      const doc = await task.promise;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      for (let n = 1; n <= doc.numPages && !cancelled; n++) {
        const page = await doc.getPage(n);
        const cssWidth = (width - 16) * zoom;
        const viewport = page.getViewport({ scale: (cssWidth / page.getViewport({ scale: 1 }).width) * dpr });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(cssWidth)}px`;
        canvas.className = "block mx-auto mb-2 bg-white shadow";
        canvas.setAttribute("aria-label", `Answer script page ${n} of ${doc.numPages}`);
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
        // Show pages as they finish instead of waiting for the whole script; a redraw (zoom, rotation) swaps the
        // old pages out only once its first page is ready, so nothing flickers
        if (!cancelled) {
          if (n === 1) {
            container.replaceChildren();
            setDrawn(true);
          }
          container.appendChild(canvas);
        }
      }
      if (!cancelled) container.dataset.renders = String(Number(container.dataset.renders || 0) + 1);
    })().catch(() => {
      if (!cancelled) onError();
    });
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [blob, width, zoom]);

  return (
    <div ref={box} className="w-full p-2">
      {!drawn && (
        <span className="text-xs font-bold text-gray-500 flex items-center justify-center gap-2 py-10">
          <RefreshCw size={14} className="animate-spin" /> Rendering pages…
        </span>
      )}
      <div ref={pages} data-testid="answer-script-pages" />
    </div>
  );
};

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
  const [blob, setBlob] = useState<Blob | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none" | "error">("loading");
  const [reload, setReload] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [ownViewer] = useState(drawPagesOurselves);

  useEffect(() => {
    if (prompt) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setState("loading");
    setUrl(null);
    setBlob(null);
    fetchPdf()
      .then((data) => {
        if (cancelled) return;
        const pdf = new Blob([data], { type: "application/pdf" });
        objectUrl = URL.createObjectURL(pdf);
        setBlob(pdf);
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

  const fileName = `Answer-script-${label.replace(/[^A-Za-z0-9-]+/g, "_").replace(/^_|_$/g, "") || "script"}.pdf`;
  const zoomButton = "p-1 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-40";

  return (
    <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-2xl flex flex-col overflow-hidden lg:w-1/2 min-h-[50vh] lg:min-h-0 lg:h-[94vh]">
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[#0B192C] text-white">
        <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider shrink-0">
          <FileText size={15} className="text-[#D4A72C]" /> Answer script
        </span>
        <span className="text-[10px] font-semibold text-white/70 truncate min-w-0">{label}</span>
        {url && (
          <span className="flex items-center gap-2 shrink-0">
            {ownViewer && (
              <>
                <button type="button" aria-label="Zoom out" className={zoomButton} disabled={zoom <= 1}
                  onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>
                  <Minus size={13} />
                </button>
                <button type="button" aria-label="Zoom in" className={zoomButton} disabled={zoom >= 3}
                  onClick={() => setZoom((z) => Math.min(3, z + 0.5))}>
                  <Plus size={13} />
                </button>
              </>
            )}
            {ownViewer ? (
              <a href={url} download={fileName} className="text-[10px] font-bold text-[#D4A72C] hover:underline inline-flex items-center gap-1">
                <Download size={12} /> Download
              </a>
            ) : (
              <a href={url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[#D4A72C] hover:underline">
                Open in new tab
              </a>
            )}
          </span>
        )}
      </div>
      <div className={`flex-1 bg-gray-100 flex ${state === "ready" && ownViewer ? "items-start overflow-auto [scrollbar-gutter:stable] max-h-[75vh] lg:max-h-none" : "items-center justify-center"}`}>
        {prompt ? (
          <div className="text-center px-6 space-y-2">
            <FileText size={36} className="mx-auto text-gray-300" />
            <p className="text-xs font-bold text-gray-600">{prompt}</p>
          </div>
        ) : state === "ready" && url && blob ? (
          ownViewer ? (
            <PdfPages blob={blob} zoom={zoom} onError={() => setState("error")} />
          ) : (
            <iframe src={`${url}#view=FitH`} title="Answer script" className="w-full h-full min-h-[50vh] border-0" />
          )
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
            <button type="button" onClick={() => setReload((n) => n + 1)} className="text-[11px] font-bold text-[#8A6410] hover:underline">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
