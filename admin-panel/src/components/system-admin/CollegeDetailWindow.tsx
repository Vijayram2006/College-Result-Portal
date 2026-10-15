import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Building2,
  Users,
  BookOpen,
  PenLine,
  FileCheck2,
  Percent,
  Clock,
  ShieldCheck,
  Activity,
  ExternalLink,
  Lock,
  Unlock,
  Search,
} from "lucide-react";
import { COLLEGES, CollegeKey } from "../../utils/rbac";
import {
  apiErrorMessage,
  collegeViewApi,
  superAdminApi,
  AdminDashboardStats,
  CollegeOverview,
  DepartmentRecord,
  OfficerAccount,
  ResultBatchRecord,
  SuperAuditEntry,
} from "../../services/api";

type WindowTab = "departments" | "results" | "logins" | "activity";

interface CollegeDetailWindowProps {
  college: CollegeKey;
  overview?: CollegeOverview;
  onClose: () => void;
}

/** COE pages a Super Admin can open for this college (switches the inspected college first). */
const MODULE_LINKS: { label: string; path: string }[] = [
  { label: "Student Data (View)", path: "/admin/results/upload" },
  { label: "Marks (View)", path: "/admin/results/validation" },
  { label: "Internal Marks (View)", path: "/admin/results/internal-marks" },
  { label: "Faculty Master (View)", path: "/admin/faculty-master" },
  { label: "Answer Scripts", path: "/admin/results/answer-scripts" },
  { label: "Publish Results", path: "/admin/results/publish" },
  { label: "Published Results", path: "/admin/results/published" },
  { label: "Analytics", path: "/admin/analytics" },
  { label: "Revaluation", path: "/admin/results/revaluation" },
  { label: "Audit Logs", path: "/admin/audit-logs" },
];

function openInCollege(college: CollegeKey, path: string) {
  localStorage.setItem("kvell_superadmin_view_college", college);
  window.location.assign(path);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

const statusPill: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  VALIDATED: "bg-sky-100 text-sky-800",
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-slate-200 text-slate-600",
  SUSPENDED: "bg-red-100 text-red-800",
};

export const CollegeDetailWindow: React.FC<CollegeDetailWindowProps> = ({ college, overview, onClose }) => {
  const col = COLLEGES[college];
  const [tab, setTab] = useState<WindowTab>("departments");
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [batches, setBatches] = useState<ResultBatchRecord[]>([]);
  const [officers, setOfficers] = useState<OfficerAccount[]>([]);
  const [audit, setAudit] = useState<SuperAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      collegeViewApi.dashboard(college),
      collegeViewApi.departments(college),
      collegeViewApi.batches(college),
      superAdminApi.officers(),
      superAdminApi.audit(300),
    ])
      .then(([s, d, b, o, a]) => {
        if (!alive) return;
        setStats(s);
        setDepartments(d);
        setBatches(b);
        setOfficers(o.filter((x) => x.collegeKey === college));
        setAudit(a.filter((x) => x.college === college));
        setError(null);
      })
      .catch((err) => alive && setError(apiErrorMessage(err, "Could not load this college's details.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [college]);

  // Esc closes; the page behind does not scroll while the window is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // Department figures from the COE dashboard joined with the department records (code, head, logins)
  const deptRows = useMemo(() => {
    const byKey = new Map((stats?.departments || []).map((r) => [r.deptKey, r]));
    const rows = departments.map((d) => ({ record: d, figures: byKey.get(d.key) }));
    const q = search.trim().toLowerCase();
    return q
      ? rows.filter(({ record }) =>
          [record.name, record.code, record.key, record.headName].some((v) => (v || "").toLowerCase().includes(q))
        )
      : rows;
  }, [departments, stats, search]);

  const sortedBatches = useMemo(
    () =>
      [...batches].sort((a, b) =>
        (b.publishedAt || b.uploadDate || "").localeCompare(a.publishedAt || a.uploadDate || "")
      ),
    [batches]
  );

  const kpis = [
    { label: "Departments", value: overview?.departments ?? departments.length, icon: Building2 },
    { label: "Students", value: overview?.students ?? stats?.totalStudents ?? 0, icon: Users },
    { label: "Without DOB", value: overview?.studentsWithoutDob ?? stats?.studentsWithoutDob ?? 0, icon: Clock },
    { label: "Subjects", value: overview?.subjects ?? stats?.totalCourses ?? 0, icon: BookOpen },
    {
      label: "Marks Entered",
      value: overview ? `${overview.marksEntered} / ${overview.expectedScripts}` : stats?.marksEntered ?? 0,
      icon: PenLine,
    },
    { label: "Published Batches", value: overview?.publishedBatches ?? stats?.publishedResults ?? 0, icon: FileCheck2 },
    { label: "Awaiting Publish", value: overview?.awaitingPublish ?? 0, icon: Clock },
    { label: "Pass %", value: `${(overview?.passPercentage ?? stats?.overallPassPercentage ?? 0).toFixed(1)}%`, icon: Percent },
  ];

  const tabs: { key: WindowTab; label: string; count?: number }[] = [
    { key: "departments", label: "Departments", count: departments.length },
    { key: "results", label: "Result Batches", count: batches.length },
    { key: "logins", label: "Officers & Logins" },
    { key: "activity", label: "Recent Activity", count: audit.length },
  ];

  // Rendered on <body> so no transformed or clipped ancestor can trap the fixed overlay
  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-[#0B192C]/60 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`${col.shortName} College details`}
    >
      <div className="bg-[#F8F5EE] w-full max-w-6xl sm:rounded-3xl shadow-2xl flex flex-col max-h-full sm:max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4 sm:p-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={col.logoUrl}
              alt=""
              className="w-12 h-12 rounded-2xl object-contain bg-slate-50 p-1 border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${col.badgeBg} ${col.badgeText}`}>
                  {col.code}
                </span>
                {overview?.lock && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      overview.lock.locked ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {overview.lock.locked ? <Lock size={11} /> : <Unlock size={11} />}
                    {overview.lock.locked ? "Frozen" : "Operational"}
                  </span>
                )}
              </div>
              <h2 className="font-extrabold text-base sm:text-lg text-[#0B192C] leading-tight mt-1">{col.name}</h2>
              <p className="text-xs text-slate-500">
                {col.coeTitle}
                {overview?.coeName ? ` · ${overview.coeName}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-bold">{error}</div>}

          {/* Figures */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                  <k.icon size={12} />
                  {k.label}
                </div>
                <div className="text-lg font-extrabold text-[#0B192C] mt-0.5">{loading && !overview ? "…" : k.value}</div>
              </div>
            ))}
          </div>

          {/* Open the COE pages of this college */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500 mb-2">Open {col.shortName} COE modules</div>
            <div className="flex flex-wrap gap-2">
              {MODULE_LINKS.map((m) => (
                <button
                  key={m.path}
                  type="button"
                  onClick={() => openInCollege(college, m.path)}
                  className="px-3 py-1.5 rounded-xl bg-[#F8F5EE] hover:bg-[#eae6db] border border-slate-200 text-xs font-bold text-[#0B192C] flex items-center gap-1"
                >
                  {m.label}
                  <ExternalLink size={11} />
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto bg-white rounded-2xl border border-slate-200 p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
                  tab === t.key ? "bg-[#0B192C] text-[#D4A72C]" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
                {t.count !== undefined && !loading ? ` (${t.count})` : ""}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading {col.shortName} details…</div>
            ) : tab === "departments" ? (
              <div>
                <div className="p-3 border-b border-slate-100">
                  <div className="relative max-w-xs">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search department"
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
                {deptRows.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {departments.length === 0 ? `No departments in ${col.shortName} yet.` : "No department matches."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                        <tr>
                          <th className="text-left px-3 py-2">Department</th>
                          <th className="text-left px-3 py-2">Head</th>
                          <th className="text-left px-3 py-2">Status</th>
                          <th className="text-right px-3 py-2">Students</th>
                          <th className="text-right px-3 py-2">No DOB</th>
                          <th className="text-right px-3 py-2">Subjects</th>
                          <th className="text-right px-3 py-2">Marks</th>
                          <th className="text-right px-3 py-2">Published</th>
                          <th className="text-right px-3 py-2">Pass %</th>
                          <th className="text-left px-3 py-2">HOD / Faculty login</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {deptRows.map(({ record, figures }) => (
                          <tr key={record.key} className="hover:bg-[#F8F5EE]">
                            <td className="px-3 py-2">
                              <div className="font-bold text-[#0B192C]">{record.name}</div>
                              <div className="text-[10px] text-slate-500">{record.code || record.key.toUpperCase()}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">{record.headName || "—"}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusPill[record.status] || ""}`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-bold">{figures?.students ?? record.totalStudents ?? 0}</td>
                            <td className="px-3 py-2 text-right">{figures?.studentsWithoutDob ?? "—"}</td>
                            <td className="px-3 py-2 text-right">{figures?.subjects ?? "—"}</td>
                            <td className="px-3 py-2 text-right">{figures?.marksEntered ?? "—"}</td>
                            <td className="px-3 py-2 text-right">{figures?.publishedBatches ?? "—"}</td>
                            <td className="px-3 py-2 text-right">
                              {figures && figures.publishedBatches > 0 ? `${figures.passPercentage.toFixed(1)}%` : "—"}
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                              {record.hodLogin || "—"} / {record.facultyLogin || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : tab === "results" ? (
              sortedBatches.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No result batches in {col.shortName} yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                      <tr>
                        <th className="text-left px-3 py-2">Subject</th>
                        <th className="text-left px-3 py-2">Department</th>
                        <th className="text-left px-3 py-2">Semester</th>
                        <th className="text-left px-3 py-2">Assessment</th>
                        <th className="text-left px-3 py-2">Status</th>
                        <th className="text-right px-3 py-2">Students</th>
                        <th className="text-right px-3 py-2">Pass %</th>
                        <th className="text-left px-3 py-2">Published</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedBatches.map((b) => (
                        <tr key={b.id} className="hover:bg-[#F8F5EE]">
                          <td className="px-3 py-2">
                            <div className="font-bold text-[#0B192C]">{b.subjectCode || "—"}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-1">{b.subjectTitle || b.batchTitle}</div>
                          </td>
                          <td className="px-3 py-2">{b.departmentName || b.departmentKey}</td>
                          <td className="px-3 py-2">{b.semester}</td>
                          <td className="px-3 py-2">{b.assessmentType || "—"}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusPill[b.publicationStatus] || ""}`}>
                              {b.publicationStatus}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">{b.totalStudents}</td>
                          <td className="px-3 py-2 text-right">{b.passPercentage.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-slate-600">
                            {b.publishedAt ? `${formatDate(b.publishedAt)}${b.publishedBy ? ` · ${b.publishedBy}` : ""}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : tab === "logins" ? (
              <div className="divide-y divide-slate-100">
                <div className="p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-2 flex items-center gap-1">
                    <ShieldCheck size={12} /> COE officers
                  </div>
                  {officers.length === 0 ? (
                    <div className="text-xs text-slate-500">No officer accounts for {col.shortName}.</div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {officers.map((o) => (
                        <div key={o.id} className="rounded-xl border border-slate-200 p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#0B192C]">{o.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusPill[o.status] || ""}`}>
                              {o.status}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-600 mt-0.5">{o.username}</div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {o.email || "no email"} · last sign-in {formatDate(o.lastLogin)}
                            {o.mustChangePassword ? " · must change password" : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-2 flex items-center gap-1">
                    <Users size={12} /> Department logins (HOD / Faculty)
                  </div>
                  {departments.length === 0 ? (
                    <div className="text-xs text-slate-500">No departments yet.</div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {departments.map((d) => (
                        <div key={d.key} className="rounded-xl border border-slate-200 p-2.5 text-xs">
                          <div className="font-bold text-[#0B192C]">{d.name}</div>
                          <div className="font-mono text-[11px] text-slate-600">
                            HOD {d.hodLogin || "—"} · Faculty {d.facultyLogin || "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 mt-2">
                    Passwords are never shown. Reset a COE password from the Officer Accounts tab.
                  </p>
                </div>
              </div>
            ) : audit.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No recorded activity for {col.shortName} yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {audit.slice(0, 100).map((a) => (
                  <li key={a.id} className="px-3 py-2.5 text-xs flex gap-3">
                    <Activity size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-bold text-[#0B192C]">
                        {a.action} <span className="font-normal text-slate-500">· {a.actorName || a.actor}</span>
                      </div>
                      <div className="text-slate-600 break-words">{a.description || a.target}</div>
                      <div className="text-[10px] text-slate-400">{formatDate(a.timestamp)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CollegeDetailWindow;
