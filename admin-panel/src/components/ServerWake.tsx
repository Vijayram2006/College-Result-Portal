import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/*
 * The hosted backend (Render free plan) sleeps after 15 idle minutes and takes up to a minute to start again on the
 * next request. wakeServer() pings it as soon as the page opens and keeps trying until it answers; while that takes
 * longer than a moment, <ServerWakeBanner /> tells the user the server is starting. The API client waits for the
 * wake-up and retries reads and sign-ins that failed only because the server was still asleep.
 * (Copy of client/src/components/ServerWake.tsx except for the API address; keep the two in step.)
 */

const API = (import.meta.env.VITE_API_URL || "http://localhost:8080/api").replace(/\/+$/, "");
const PING = `${API}/v1/public/summary`;
const SHOW_BANNER_AFTER_MS = 2500;
const GIVE_UP_AFTER_MS = 180000;
const EVENT = "kvell:server-waking";

let waking: Promise<boolean> | null = null;

/** Resolves true once the server answers (false if it still has not after 3 minutes). Concurrent calls share one wake-up. */
export function wakeServer(): Promise<boolean> {
  if (waking) return waking;
  waking = (async () => {
    const started = Date.now();
    const banner = window.setTimeout(() => window.dispatchEvent(new CustomEvent(EVENT, { detail: true })), SHOW_BANNER_AFTER_MS);
    try {
      while (Date.now() - started < GIVE_UP_AFTER_MS) {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 20000);
        try {
          const res = await fetch(PING, { cache: "no-store", signal: controller.signal });
          if (res.ok) return true;
        } catch {
          // still asleep or starting: try again
        } finally {
          window.clearTimeout(timer);
        }
        await new Promise((r) => window.setTimeout(r, 3000));
      }
      return false;
    } finally {
      window.clearTimeout(banner);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: false }));
      waking = null;
    }
  })();
  return waking;
}

/** Shown at the top of the page while the hosted server is starting up. */
export const ServerWakeBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const onWaking = (e: Event) => setVisible(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener(EVENT, onWaking);
    return () => window.removeEventListener(EVENT, onWaking);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setSeconds(0);
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) return null;
  return (
    <div role="status" aria-live="polite"
      className="fixed top-0 inset-x-0 z-[200] bg-[#0B192C] text-white text-xs font-bold px-4 py-2.5 flex items-center justify-center gap-2 shadow-lg border-b-2 border-[#D4A72C]">
      <Loader2 size={15} className="animate-spin text-[#D4A72C] shrink-0" />
      <span>Starting the result server… this can take up to a minute after a quiet spell. The page continues by itself.</span>
      <span className="text-white/60 font-semibold tabular-nums">{seconds}s</span>
    </div>
  );
};
