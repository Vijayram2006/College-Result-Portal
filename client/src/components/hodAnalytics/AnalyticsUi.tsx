// Copy of admin-panel/src/components/analytics/AnalyticsUi.tsx (keep the two in step).
import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Search } from "lucide-react";
import { exportCsv, exportSheets, Sheet } from "./analytics";

/* ---------- Colours (validated reference palette; see the dataviz notes in Analytics.tsx) ---------- */

/** Assessments are identities: categorical slots 1-3, which stay distinguishable for colour-blind readers. */
export const ASSESSMENT_COLORS: Record<string, string> = { "IAT-1": "#2a78d6", "IAT-2": "#eb6834", "End Semester": "#1baf7a" };
/** Grades are ordered: one blue ramp from dark (O) to light (C); F takes the reserved "critical" red. */
export const GRADE_COLORS: Record<string, string> = {
  O: "#104281", "A+": "#1c5cab", A: "#2a78d6", "B+": "#5598e7", B: "#6da7ec", C: "#86b6ef", F: "#d03b3b",
};
export const SERIES = "#2a78d6";
export const CRITICAL = "#d03b3b";
export const GOOD = "#006300";
export const AXIS = { stroke: "#c3c2b7", tick: { fill: "#6b6a65", fontSize: 11 } };
export const GRID = "#e1e0d9";

export const Card: React.FC<{ title?: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  title, subtitle, actions, className = "", children,
}) => (
  <section className={`bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-5 sm:p-6 min-w-0 ${className}`}>
    {(title || actions) && (
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          {title && <h3 className="font-display font-black text-base text-[#0B192C]">{title}</h3>}
          {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

export const Kpi: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; tone?: "default" | "good" | "bad" }> = ({
  label, value, hint, icon, tone = "default",
}) => (
  <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm p-4 min-w-0">
    <div className="flex items-center justify-between gap-2 text-gray-400">
      <span className="text-[10px] font-black uppercase tracking-wider truncate">{label}</span>
      {icon && <span className="w-7 h-7 rounded-lg bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center shrink-0">{icon}</span>}
    </div>
    <div className="font-display font-black text-2xl sm:text-[1.7rem] text-[#0B192C] mt-1 leading-none">{value}</div>
    {hint && (
      <div className={`text-[11px] font-semibold mt-1.5 ${tone === "good" ? "text-[#006300]" : tone === "bad" ? "text-[#b42318]" : "text-gray-500"}`}>{hint}</div>
    )}
  </div>
);

/** Horizontal bar inside a table cell for a 0-100 value, with the number beside it. */
export const PctBar: React.FC<{ value: number; danger?: number }> = ({ value, danger = 50 }) => (
  <div className="flex items-center gap-2 min-w-[7rem]">
    <div className="flex-1 h-1.5 rounded-full bg-[#EFECE4] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: value < danger ? CRITICAL : SERIES }} />
    </div>
    <span className="tabular-nums font-bold text-[#0B192C] w-11 text-right">{value}%</span>
  </div>
);

export const GradeChip: React.FC<{ grade: string }> = ({ grade }) => (
  <span
    className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-md text-[11px] font-black text-white"
    style={{ background: GRADE_COLORS[grade] ?? "#898781" }}
  >
    {grade}
  </span>
);

export const ResultChip: React.FC<{ passed: boolean }> = ({ passed }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${passed ? "bg-[#E8F3EA] text-[#006300]" : "bg-[#FDECEC] text-[#b42318]"}`}>
    {passed ? "✓ PASS" : "✕ FAIL"}
  </span>
);

export const AssessmentDot: React.FC<{ name: string }> = ({ name }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ASSESSMENT_COLORS[name] ?? "#898781" }} />
    {name}
  </span>
);

/** Recharts tooltip in the panel's style: values in ink, the coloured swatch carries identity. */
export const ChartTooltip: React.FC<any> = ({ active, payload, label, unit = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-[#E5E1D8] shadow-lg rounded-xl px-3 py-2 text-xs">
      {label !== undefined && <div className="font-black text-[#0B192C] mb-1">{label}</div>}
      {payload.map((p: any) => (
        <div key={p.dataKey ?? p.name} className="flex items-center gap-2 text-gray-600">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color || p.payload?.fill }} />
          <span>{p.name}</span>
          <span className="ml-auto pl-3 font-bold text-[#0B192C] tabular-nums">
            {p.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
};

export const ExportButtons: React.FC<{ fileName: string; sheet: () => Sheet; filters?: Record<string, string> }> = ({ fileName, sheet, filters }) => (
  <div className="flex items-center gap-1.5">
    <button
      type="button"
      onClick={() => exportSheets(fileName, [sheet()], filters)}
      className="px-2.5 py-1.5 rounded-lg border border-[#E5E1D8] bg-[#F8F5EE] hover:bg-[#EFE9DA] text-[11px] font-bold text-[#0B192C] flex items-center gap-1"
      title="Download this table as an Excel workbook"
    >
      <FileSpreadsheet size={13} className="text-[#1d7a45]" /> Excel
    </button>
    <button
      type="button"
      onClick={() => exportCsv(fileName, sheet())}
      className="px-2.5 py-1.5 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#F8F5EE] text-[11px] font-bold text-[#0B192C] flex items-center gap-1"
      title="Download this table as CSV"
    >
      <FileText size={13} className="text-gray-500" /> CSV
    </button>
  </div>
);

export interface Column<T> {
  key: string;
  label: string;
  /** Value used for sorting and searching. */
  value: (row: T) => string | number;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}

/** Sortable, searchable, paginated table with Excel/CSV download of every row (not only the visible page). */
export function DataTable<T>({
  rows, columns, rowKey, onRowClick, initialSort, initialDir = "desc", pageSize = 12, searchPlaceholder = "Search…",
  emptyText = "No data for the selected filters.", rowTone,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  initialSort?: string;
  initialDir?: "asc" | "desc";
  pageSize?: number;
  searchPlaceholder?: string;
  emptyText?: string;
  rowTone?: (row: T) => "bad" | "good" | undefined;
}) {
  const [sortKey, setSortKey] = useState<string | undefined>(initialSort);
  const [dir, setDir] = useState<"asc" | "desc">(initialDir);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(pageSize);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q ? rows.filter((r) => columns.some((c) => String(c.value(r)).toLowerCase().includes(q))) : rows;
    const col = columns.find((c) => c.key === sortKey);
    if (col) {
      list = [...list].sort((a, b) => {
        const x = col.value(a), y = col.value(b);
        const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
        return dir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [rows, columns, sortKey, dir, query]);

  const pages = Math.max(1, Math.ceil(shown.length / size));
  const current = Math.min(page, pages - 1);
  const visible = shown.slice(current * size, current * size + size);

  const sortBy = (key: string) => {
    if (sortKey === key) setDir(dir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setDir("desc"); }
    setPage(0);
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <label className="relative flex-1 min-w-[12rem] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50"
          />
        </label>
        <span className="text-[11px] text-gray-500 font-semibold">
          {shown.length === rows.length ? `${rows.length} rows` : `${shown.length} of ${rows.length} rows`}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#E5E1D8]">
        <table className="w-full text-xs">
          <thead className="bg-[#0B192C] text-white">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => sortBy(c.key)}
                  className={`px-3 py-2.5 font-bold whitespace-nowrap cursor-pointer select-none hover:bg-white/10 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sortKey === c.key ? (dir === "asc" ? <ArrowUp size={11} className="text-[#D4A72C]" /> : <ArrowDown size={11} className="text-[#D4A72C]" />) : <ArrowUpDown size={11} className="opacity-30" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-gray-400 font-semibold">{emptyText}</td>
              </tr>
            )}
            {visible.map((r, i) => {
              const tone = rowTone?.(r);
              return (
                <tr
                  key={rowKey(r)}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={`border-t border-[#EFECE4] ${i % 2 ? "bg-[#FCFBF8]" : "bg-white"} ${onRowClick ? "cursor-pointer hover:bg-[#FFF6DD]" : ""} ${tone === "bad" ? "!bg-[#FFF5F5]" : ""}`}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2 align-middle ${c.align === "right" ? "text-right tabular-nums" : c.align === "center" ? "text-center" : "text-left"} ${c.className ?? ""}`}
                    >
                      {c.render ? c.render(r) : c.value(r)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {shown.length > 10 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[11px] font-semibold text-gray-600">
          <label className="flex items-center gap-1.5">
            Rows per page
            <select
              value={size}
              onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
              className="px-2 py-1 rounded-lg border border-[#E5E1D8] bg-white font-bold"
            >
              {[10, 12, 25, 50, 100, 500].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="p-1.5 rounded-lg border border-[#E5E1D8] bg-white disabled:opacity-30">
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 tabular-nums">Page {current + 1} / {pages}</span>
            <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="p-1.5 rounded-lg border border-[#E5E1D8] bg-white disabled:opacity-30">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Full-screen sheet for drill-downs (a subject or a student). Closes on Escape or the backdrop. */
export const Drawer: React.FC<{ open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }> = ({
  open, onClose, title, subtitle, actions, children,
}) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#0B192C]/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-5xl h-full bg-[#F8F5EE] shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0B192C] text-white px-5 sm:px-7 py-4 border-b-4 border-[#D4A72C] flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display font-black text-lg leading-tight">{title}</h2>
            {subtitle && <p className="text-[11px] text-[#D4A72C] font-semibold mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold">
              Close ✕
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-5">{children}</div>
      </div>
    </div>
  );
};
