import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { API_ROOT } from "../services/api";

/** Sends a browser error to the server log (no personal data: message, page path and stack only). */
export function reportClientError(message: string, stack?: string) {
  try {
    const body = JSON.stringify({ app: "coe-admin", message: message.slice(0, 500), url: window.location.pathname, stack: (stack || "").slice(0, 1500) });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API_ROOT}/v1/public/client-errors`, new Blob([body], { type: "application/json" }));
    } else {
      fetch(`${API_ROOT}/v1/public/client-errors`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
    }
  } catch {
    // reporting must never break the page
  }
}

let installed = false;
/** Reports uncaught errors and rejected promises once per page load. */
export function installGlobalErrorReporting() {
  if (installed) return;
  installed = true;
  window.addEventListener("error", (e) => reportClientError(e.message || "Script error", e.error?.stack));
  window.addEventListener("unhandledrejection", (e) => reportClientError(String(e.reason?.message || e.reason), e.reason?.stack));
}

/** Keeps one broken page from blanking the whole panel: shows a message and a reload button, and reports it. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    reportClientError(error.message, error.stack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="m-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 max-w-xl">
        <div className="flex items-center gap-2 font-black"><AlertTriangle size={18} /> This page ran into a problem</div>
        <p className="mt-2 text-sm">The error was reported. Reload the page to try again; your saved data is safe.</p>
        <button onClick={() => window.location.reload()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0B192C] px-4 py-2 text-xs font-bold text-white">
          <RotateCcw size={14} /> Reload
        </button>
      </div>
    );
  }
}
