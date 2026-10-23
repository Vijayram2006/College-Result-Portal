import React, { useMemo, useState } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity } from "lucide-react";
import type { MarkRow } from "../../utils/analytics";

/*
 * Bell-curve analytics (requirements EES-ADD-REQ-v1.4, REQ-11/14/16): the normal distribution of the marks beside the
 * real distribution, in three tiers (department-wise, subject-wise, examiner-wise), switchable between absolute mark
 * bands and letter grades, with cohort filters (all students, arrear category, top rank holders).
 * Mean, median and standard deviation are computed over the filtered marks (population SD: sqrt(sum (x - mean)^2 / N)).
 */

type Tier = "department" | "subject" | "examiner";
type Axis = "bands" | "grades";
type Cohort = "all" | "arrear" | "top";

const BANDS = [
  { label: "0-40", min: 0, max: 40 },
  { label: "41-60", min: 40.01, max: 60 },
  { label: "61-80", min: 60.01, max: 80 },
  { label: "81-100", min: 80.01, max: 100 },
];
const GRADE_AXIS = ["O", "A+", "A", "B+", "B", "C", "RA"];
const gradeOf = (r: MarkRow) => (r.passed ? r.grade : "RA");

const round = (v: number) => Math.round(v * 100) / 100;

export function curveStats(values: number[]) {
  const n = values.length;
  if (!n) return { n: 0, mean: 0, median: 0, sd: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sorted = [...values].sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
  return { n, mean: round(mean), median: round(median), sd: round(sd) };
}

const normal = (x: number, mean: number, sd: number) =>
  sd > 0 ? Math.exp(-((x - mean) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI)) : 0;

function cohortOf(rows: MarkRow[], cohort: Cohort) {
  if (cohort === "arrear") return rows.filter((r) => !r.passed);
  if (cohort === "top") {
    const sorted = [...rows].sort((a, b) => b.total - a.total);
    return sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.1)));
  }
  return rows;
}

const btn = (on: boolean) =>
  `px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${on ? "bg-[#0B192C] text-white border-[#0B192C]" : "bg-white text-[#0B192C] border-[#E5E1D8] hover:bg-amber-50"}`;

/** Performance zones on the class's own curve (z = standard deviations from the mean); red to green via dark yellow. */
export const ZONES = [
  { key: "z0", label: "Low to non performers", from: -Infinity, to: -1.28, color: "#DC2626" },
  { key: "z1", label: "Below average", from: -1.28, to: -0.5, color: "#EA580C" },
  { key: "z2", label: "Average", from: -0.5, to: 0.5, color: "#CA8A04" },
  { key: "z3", label: "Above average", from: 0.5, to: 0.84, color: "#65A30D" },
  { key: "z4", label: "High performers", from: 0.84, to: Infinity, color: "#16A34A" },
] as const;

const zoneOf = (z: number) => ZONES.findIndex((zn) => z >= zn.from && z < zn.to);

/** The performance bell curve: one smooth curve, shaded by zone, with a fixed centre line at the mean. */
const PerformanceCurve: React.FC<{ rows: MarkRow[]; height: number; st: ReturnType<typeof curveStats> }> = ({ rows, height, st }) => {
  const data = useMemo(() => {
    const pts: Record<string, number | null>[] = [];
    if (st.sd <= 0) return pts;
    for (let x = 0; x <= 100; x += 0.5) {
      const y = round(normal(x, st.mean, st.sd) * st.n * 5);
      const z = (x - st.mean) / st.sd;
      const pt: Record<string, number | null> = { x };
      ZONES.forEach((zn, i) => {
        // each zone also takes its edge points so the coloured areas meet without a gap
        const zPrev = (x - 0.5 - st.mean) / st.sd;
        const zNext = (x + 0.5 - st.mean) / st.sd;
        pt[zn.key] = zoneOf(z) === i || zoneOf(zPrev) === i || zoneOf(zNext) === i ? y : null;
      });
      pts.push(pt);
    }
    return pts;
  }, [st.mean, st.sd, st.n]);
  const shares = ZONES.map((_, i) => rows.filter((r) => zoneOf(st.sd > 0 ? (r.total - st.mean) / st.sd : 0) === i).length);
  const pctOf = (c: number) => (rows.length ? Math.round((c * 1000) / rows.length) / 10 : 0);
  if (st.sd <= 0) return <p className="py-10 text-center text-xs text-slate-500">All marks are the same; there is no spread to draw.</p>;
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 18, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEE9DE" vertical={false} />
          <XAxis dataKey="x" type="number" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fontSize: 10 }} />
          <YAxis hide />
          <Tooltip formatter={(v: number) => [v, "Expected students per 5 marks"]} labelFormatter={(x) => `${x} marks`} />
          {ZONES.map((zn) => (
            <Area key={zn.key} type="monotone" dataKey={zn.key} stroke={zn.color} strokeWidth={2} fill={zn.color}
              fillOpacity={0.85} dot={false} activeDot={false} connectNulls={false} isAnimationActive={false} />
          ))}
          <ReferenceLine x={st.mean} stroke="#0B192C" strokeWidth={2.5}
            label={{ value: `Average μ ${st.mean}`, fontSize: 11, fontWeight: 800, fill: "#0B192C", position: "top" }} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-5 gap-1 mt-2">
        {ZONES.map((zn, i) => (
          <div key={zn.key} className="rounded-lg px-1.5 py-1.5 text-center border" style={{ borderColor: zn.color, background: `${zn.color}14` }}>
            <p className="text-[9px] font-black uppercase leading-tight" style={{ color: zn.color }}>{zn.label}</p>
            <p className="text-base font-black text-[#0B192C]">{pctOf(shares[i])}%</p>
            <p className="text-[10px] font-bold text-slate-500">{shares[i]} students</p>
          </div>
        ))}
      </div>
    </>
  );
};

const Curve: React.FC<{ title: string; rows: MarkRow[]; axis: Axis; height?: number }> = ({ title, rows, axis, height = 240 }) => {
  const st = curveStats(rows.map((r) => r.total));
  const data = useMemo(() => {
    // Grades on the axis: counts per grade with the expected count from the curve at each grade's mid-mark
    const mids: Record<string, number> = { O: 95, "A+": 85, A: 75, "B+": 65, B: 55, C: 50, RA: 25 };
    return GRADE_AXIS.map((g) => ({
      x: g,
      count: rows.filter((r) => gradeOf(r) === g).length,
      curve: round(normal(mids[g], st.mean, st.sd) * st.n * 10),
    }));
  }, [rows, st.mean, st.sd, st.n]);
  return (
    <div className="rounded-2xl border border-[#E5E1D8] bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <p className="text-xs font-black text-[#0B192C]">{title}</p>
        <p className="text-[11px] font-bold text-slate-600">
          N {st.n} · Mean (μ) {st.mean} · Median {st.median} · SD (σ) {st.sd}
        </p>
      </div>
      {st.n === 0 ? (
        <p className="py-10 text-center text-xs text-slate-500">No marks for this selection.</p>
      ) : st.n < 20 && axis === "bands" ? (
        <>
          <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mb-2">
            Only {st.n} students: the curve is indicative only.
          </p>
          <PerformanceCurve rows={rows} height={height} st={st} />
        </>
      ) : axis === "bands" ? (
        <PerformanceCurve rows={rows} height={height} st={st} />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE9DE" />
            <XAxis dataKey="x" type="category" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number, n: string) => [v, n === "curve" ? "Normal curve" : "Students"]} />
            <Bar dataKey="count" fill="#CA8A04" fillOpacity={0.6} radius={[4, 4, 0, 0]} barSize={28} />
            <Area type="monotone" dataKey="curve" stroke="#16A34A" strokeWidth={2.5} fill="#16A34A" fillOpacity={0.08} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export const BellCurveAnalytics: React.FC<{ rows: MarkRow[] }> = ({ rows }) => {
  const [tier, setTier] = useState<Tier>("department");
  const [axis, setAxis] = useState<Axis>("bands");
  const [cohort, setCohort] = useState<Cohort>("all");
  const scoped = useMemo(() => cohortOf(rows, cohort), [rows, cohort]);

  const groups = useMemo(() => {
    const key = (r: MarkRow) =>
      tier === "department" ? r.deptKey.toUpperCase().replace(/^AIDS$/, "ADS") : tier === "subject" ? `${r.subjectCode} · ${r.subjectTitle}` : r.examiner || "Examiner not named";
    const m = new Map<string, MarkRow[]>();
    scoped.forEach((r) => m.set(key(r), [...(m.get(key(r)) ?? []), r]));
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [scoped, tier]);

  // Examiner leniency: each examiner's mean against the overall mean of the same selection
  const overall = curveStats(scoped.map((r) => r.total));
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#E5E1D8] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[#D4A72C]" />
          <h3 className="font-display font-black text-sm text-[#0B192C]">Bell-curve distribution</h3>
          <span className="text-[11px] text-slate-500">Normal curve (blue) over the real number of students (gold), for the filters above.</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500 mr-1">Tier</span>
            <button className={btn(tier === "department")} onClick={() => setTier("department")}>Department-wise</button>
            <button className={btn(tier === "subject")} onClick={() => setTier("subject")}>Subject-wise</button>
            <button className={btn(tier === "examiner")} onClick={() => setTier("examiner")}>Examiner-wise</button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500 mr-1">Axis</span>
            <button className={btn(axis === "bands")} onClick={() => setAxis("bands")}>Performance curve</button>
            <button className={btn(axis === "grades")} onClick={() => setAxis("grades")}>Letter grades</button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500 mr-1">Cohort</span>
            <button className={btn(cohort === "all")} onClick={() => setCohort("all")}>All students</button>
            <button className={btn(cohort === "arrear")} onClick={() => setCohort("arrear")}>Arrear category</button>
            <button className={btn(cohort === "top")} onClick={() => setCohort("top")}>Top rank holders (top 10%)</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BANDS.map((b) => {
            const c = scoped.filter((r) => r.total >= b.min && r.total <= b.max).length;
            return (
              <div key={b.label} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-[10px] font-black uppercase text-slate-500">{b.label} marks</p>
                <p className="text-lg font-black text-[#0B192C]">{c} <span className="text-[11px] font-bold text-slate-500">({scoped.length ? Math.round((c * 1000) / scoped.length) / 10 : 0}%)</span></p>
              </div>
            );
          })}
        </div>
      </div>

      <Curve title="Overall (current filters)" rows={scoped} axis={axis} height={280} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {groups.slice(0, 12).map(([name, list]) => {
          const s = curveStats(list.map((r) => r.total));
          const diff = round(s.mean - overall.mean);
          const tag = tier === "examiner" && list.length >= 5
            ? diff >= 5 ? " · lenient" : diff <= -5 ? " · stringent" : " · balanced"
            : tier === "subject" ? (s.mean < 50 ? " · difficult" : s.mean >= 75 ? " · easy" : " · moderate") : "";
          return <Curve key={name} title={`${name}${tag}${tier === "examiner" ? ` (${diff >= 0 ? "+" : ""}${diff} vs mean)` : ""}`} rows={list} axis={axis} />;
        })}
      </div>
      {groups.length > 12 && <p className="text-[11px] text-slate-500">Showing the 12 largest of {groups.length}; narrow the filters to see others.</p>}
    </div>
  );
};

export default BellCurveAnalytics;
