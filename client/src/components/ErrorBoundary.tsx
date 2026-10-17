import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";
import { API_ROOT } from "../services/api";

/** Sends a browser error to the server log (message, page path and stack only; no personal data). */
export function reportClientError(message: string, stack?: string) {
  try {
    const body = JSON.stringify({ app: "portal", message: message.slice(0, 500), url: window.location.pathname, stack: (stack || "").slice(0, 1500) });
    const url = `${API_ROOT}/v1/public/client-errors`;
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    else fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
  } catch {
    // reporting must never break the page
  }
}

let installed = false;
/** Reports uncaught errors and rejected promises (once per page load). */
export function installGlobalErrorReporting() {
  if (installed) return;
  installed = true;
  window.addEventListener("error", (e) => reportClientError(e.message || "Script error", e.error?.stack));
  window.addEventListener("unhandledrejection", (e) => reportClientError(String(e.reason?.message || e.reason), e.reason?.stack));
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Keeps a crash from blanking the portal: a short message and a reload button; the details go to the server log. */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    reportClientError(error.message, error.stack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="flex items-center justify-center min-h-screen p-8 bg-[#F8F5EE]">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle size={44} className="mx-auto text-red-600" />
          <h2 className="text-xl font-black text-[#0B192C]">Something went wrong on this page</h2>
          <p className="text-sm text-slate-600">The problem was reported. Reload the page to try again; your results and marks are safe.</p>
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl bg-[#0B192C] px-5 py-2.5 text-sm font-bold text-white">
            <RotateCcw size={16} /> Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
