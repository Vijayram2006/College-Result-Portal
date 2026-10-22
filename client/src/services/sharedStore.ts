import { apiClient } from "./api";

/**
 * Keeps the examination workflow screens' data (exam timetable, Dean's notifications, paper-correction allotments
 * and evaluations, three-tier revaluation records) on the server, shared by everyone in the college. The screens keep
 * reading and writing these keys in localStorage; this module loads the server's copies into it after sign-in,
 * sends each change back to the server, and picks up other users' changes every 20 seconds.
 */
export const SHARED_KEYS = [
  "kvell_exam_timetable",
  "kvell_exam_notifications",
  "kvell_classroom_allocations",
  "kvell_paper_correction_assignments",
  "kvell_faculty_evaluated_scripts",
  "kvell_revaluation_3tier_records_v3",
];

type Doc = { key: string; data: unknown; version: number };

let ready = false;
let started = false;
const versions = new Map<string, number>();
const pending = new Map<string, ReturnType<typeof setTimeout>>();
const originalSet = Storage.prototype.setItem;
const originalRemove = Storage.prototype.removeItem;

const isShared = (storage: Storage, key: string) => storage === window.localStorage && SHARED_KEYS.includes(key);

/** Sends a changed document to the server (debounced; roles that may not change it are refused there, silently). */
function push(key: string) {
  if (!ready || !localStorage.getItem("kvell_auth_token")) return;
  clearTimeout(pending.get(key));
  pending.set(key, setTimeout(async () => {
    pending.delete(key);
    const raw = localStorage.getItem(key);
    if (raw == null) return;
    try {
      const res = await apiClient.put<{ version: number }>(`/workflow-docs/${key}`, { data: JSON.parse(raw) });
      versions.set(key, res.data.version);
    } catch {
      // Read-only for this role (403) or offline: the next pull restores the server's copy
    }
  }, 400));
}

function announce() {
  // Their screens listen for these to reload
  for (const name of ["kvell_exam_notification_updated", "kvell_timetable_updated", "kvell_paper_correction_updated", "kvell_revaluation_updated"]) {
    window.dispatchEvent(new Event(name));
  }
  window.dispatchEvent(new StorageEvent("storage"));
}

/** Loads the server's documents into localStorage (they replace any copy from an earlier session). */
async function pull(first: boolean) {
  if (!localStorage.getItem("kvell_auth_token")) return;
  try {
    const docs = (await apiClient.get<Doc[]>("/workflow-docs")).data;
    let changed = false;
    const onServer = new Set<string>();
    for (const d of docs) {
      onServer.add(d.key);
      if (pending.has(d.key) || versions.get(d.key) === d.version) continue;
      versions.set(d.key, d.version);
      originalSet.call(localStorage, d.key, JSON.stringify(d.data));
      changed = true;
    }
    if (first) {
      // Copies left from another account or college are not this college's data
      for (const k of SHARED_KEYS) if (!onServer.has(k)) originalRemove.call(localStorage, k);
      changed = true;
    }
    if (changed) announce();
  } catch {
    // Not a staff account, or the server is unreachable
  } finally {
    ready = true;
  }
}

/** Starts the sync after sign-in (safe to call more than once). */
export function startSharedStore() {
  if (started) return;
  started = true;
  Storage.prototype.setItem = function (key: string, value: string) {
    originalSet.call(this, key, value);
    if (isShared(this, key)) push(key);
  };
  void pull(true);
  setInterval(() => void pull(false), 20000);
}
