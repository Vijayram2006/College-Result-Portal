import React, { useEffect, useMemo, useState } from "react";
import {
  UserSquare2, Plus, Search, Eye, Pencil, Trash2, Lock, Save, X, ArrowLeft, Upload, ImageOff, AlertCircle,
} from "lucide-react";
import {
  apiErrorMessage,
  facultyMasterApi,
  EmploymentSection,
  FacultyAddress,
  FacultyCourse,
  FacultyDetail,
  FacultyEmployment,
  FacultyInput,
  FacultyQualification,
  FacultySummary,
} from "../services/api";
import { getStoredDepartments, Department } from "./Departments";
import { isSuperAdmin } from "../utils/rbac";

type Tab = "basic" | "employment" | "courses";
type Mode = { kind: "list" } | { kind: "edit"; id: number | null } | { kind: "view"; id: number };
type ImageKind = "photo" | "signature";

const SECTIONS: { key: EmploymentSection; label: string }[] = [
  { key: "ENGINEERING", label: "Engineering (Teaching) Experience" },
  { key: "INDUSTRIAL", label: "Industrial Experience" },
  { key: "POLYTECHNIC", label: "Polytechnic Experience" },
];
const IMAGE_LIMIT_KB: Record<ImageKind, number> = { photo: 500, signature: 200 };

const emptyAddress = (): FacultyAddress => ({ doorNo: "", street: "", city: "", country: "India", state: "Tamil Nadu", district: "", pincode: "" });

const emptyForm = (): FacultyInput => ({
  title: "", name: "", relationName: "", dept: "", gender: "", dob: "", designation: "", joinedServiceOn: "",
  joinedPostOn: "", aadhaar: "", commAddress: emptyAddress(), permAddress: emptyAddress(), residentialPhone: "",
  mobile: "", email: "", qualifications: [], employment: [], courses: [],
});

const toForm = (d: FacultyDetail): FacultyInput => ({
  title: d.title, name: d.name, relationName: d.relationName || "", dept: d.deptKey, gender: d.gender, dob: d.dob,
  designation: d.designation, joinedServiceOn: d.joinedServiceOn, joinedPostOn: d.joinedPostOn, aadhaar: d.aadhaar || "",
  commAddress: { ...emptyAddress(), ...d.commAddress }, permAddress: { ...emptyAddress(), ...d.permAddress },
  residentialPhone: d.residentialPhone || "", mobile: d.mobile, email: d.email || "",
  qualifications: d.qualifications, employment: d.employment, courses: d.courses,
});

/** Same rule as the server: each row counts from its from date to its to date, both inclusive, in whole months. */
function experienceMonths(rows: FacultyEmployment[]): number {
  let months = 0;
  for (const r of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.from) || !/^\d{4}-\d{2}-\d{2}$/.test(r.to) || r.to < r.from) continue;
    const from = new Date(r.from + "T00:00:00");
    const end = new Date(r.to + "T00:00:00");
    end.setDate(end.getDate() + 1);
    let m = (end.getFullYear() - from.getFullYear()) * 12 + (end.getMonth() - from.getMonth());
    if (end.getDate() < from.getDate()) m -= 1;
    months += Math.max(0, m);
  }
  return months;
}
const formatExperience = (months: number) => `${Math.floor(months / 12)} yr ${months % 12} mo`;

const input =
  "w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-[#0B192C] focus:outline-none focus:ring-2 focus:ring-[#D4A72C] disabled:bg-gray-50 disabled:text-[#0B192C] disabled:border-gray-200";
const cell =
  "w-full px-2 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-[#0B192C] focus:outline-none focus:ring-2 focus:ring-[#D4A72C] disabled:bg-transparent disabled:border-transparent";

const Field: React.FC<{ label: string; required?: boolean; className?: string; children: React.ReactNode }> = ({ label, required, className, children }) => (
  <label className={`block space-y-1 ${className || ""}`}>
    <span className="text-[11px] font-bold text-gray-600">
      {label}
      {required && <span className="text-red-600"> *</span>}
    </span>
    {children}
  </label>
);

/** A photo or signature, fetched with the sign-in token. */
const StoredImage: React.FC<{ id: number; kind: ImageKind; version: number; className: string }> = ({ id, kind, version, className }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    facultyMasterApi
      .image(id, kind)
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, kind, version]);
  return url ? <img src={url} alt={kind} className={className} /> : <div className={`${className} flex items-center justify-center text-gray-300`}><ImageOff size={20} /></div>;
};

export const FacultyMasterPage: React.FC = () => {
  const viewOnly = isSuperAdmin();
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [rows, setRows] = useState<FacultySummary[]>([]);
  const [departments, setDepartments] = useState<Department[]>(getStoredDepartments);
  const [deptFilter, setDeptFilter] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = () => {
    setLoading(true);
    facultyMasterApi
      .list(deptFilter)
      .then(setRows)
      .catch((err) => setMessage({ type: "error", text: apiErrorMessage(err, "Could not load the faculty master.") }))
      .finally(() => setLoading(false));
  };

  useEffect(load, [deptFilter]);
  useEffect(() => {
    const refresh = () => setDepartments(getStoredDepartments());
    window.addEventListener("kvell_departments_updated", refresh);
    return () => window.removeEventListener("kvell_departments_updated", refresh);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.title} ${r.name} ${r.designation} ${r.deptName} ${r.mobile} ${r.email || ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  const remove = async (r: FacultySummary) => {
    if (!window.confirm(`Remove ${r.title} ${r.name} from the faculty master? This cannot be undone.`)) return;
    try {
      await facultyMasterApi.remove(r.id);
      setMessage({ type: "success", text: `${r.title} ${r.name} removed.` });
      load();
    } catch (err) {
      setMessage({ type: "error", text: apiErrorMessage(err, "Could not remove the faculty record.") });
    }
  };

  if (mode.kind !== "list") {
    return (
      <FacultyEditor
        key={`${mode.kind}-${mode.kind === "edit" ? mode.id ?? "new" : mode.id}`}
        id={mode.id}
        readOnly={viewOnly || mode.kind === "view"}
        departments={departments}
        onEdit={(id) => setMode({ kind: "edit", id })}
        onClose={(text) => {
          setMode({ kind: "list" });
          if (text) setMessage({ type: "success", text });
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {viewOnly && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-semibold flex items-center gap-2">
          <Lock size={15} className="shrink-0" />
          View only: the Chief COE can see the faculty master here. Faculty details are added and edited by the college's Controller of Examinations.
        </div>
      )}

      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <UserSquare2 className="text-[#D4A72C]" /> {viewOnly ? "Faculty Master (View Only)" : "Faculty Master"}
          </h1>
          <p className="text-xs text-white/70 max-w-2xl">
            Basic details, employment history and courses offered for every faculty member of the college.
          </p>
        </div>
        {!viewOnly && (
          <button
            onClick={() => setMode({ kind: "edit", id: null })}
            className="px-5 py-3 rounded-xl bg-[#D4A72C] hover:bg-[#c29823] text-[#0B192C] text-xs font-black flex items-center gap-2 shadow-md"
          >
            <Plus size={16} /> Add Faculty
          </button>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-xs font-bold border ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
          <select className={`${input} sm:max-w-xs`} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} aria-label="Department">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.key} value={d.key}>{d.name}</option>
            ))}
          </select>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className={`${input} pl-8`} placeholder="Search name, designation, mobile, e-mail" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Designation</th>
                <th className="text-left px-4 py-3">Mobile</th>
                <th className="text-left px-4 py-3">Joined Service</th>
                <th className="text-left px-4 py-3">Experience</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-[#F8F5EE]/60">
                  <td className="px-4 py-3 font-bold text-[#0B192C]">{r.title} {r.name}</td>
                  <td className="px-4 py-3">{r.deptName}</td>
                  <td className="px-4 py-3">{r.designation}</td>
                  <td className="px-4 py-3">{r.mobile}</td>
                  <td className="px-4 py-3">{r.joinedServiceOn}</td>
                  <td className="px-4 py-3">{r.totalExperience.years} yr {r.totalExperience.months} mo</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => setMode({ kind: "view", id: r.id })} className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 hover:bg-gray-50">
                        <Eye size={13} /> View
                      </button>
                      {!viewOnly && (
                        <>
                          <button onClick={() => setMode({ kind: "edit", id: r.id })} className="px-2.5 py-1.5 rounded-lg bg-[#0B192C] text-white text-[11px] font-bold flex items-center gap-1">
                            <Pencil size={13} className="text-[#D4A72C]" /> Edit
                          </button>
                          <button onClick={() => remove(r)} aria-label={`Delete ${r.name}`} className="px-2 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50">
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500 font-semibold">
                    {rows.length === 0 ? (viewOnly ? "No faculty have been added by this college yet." : "No faculty added yet. Use Add Faculty to enter the first one.") : "No faculty match the search."}
                  </td>
                </tr>
              )}
              {loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface EditorProps {
  id: number | null;
  readOnly: boolean;
  departments: Department[];
  onEdit: (id: number) => void;
  onClose: (message?: string) => void;
}

const FacultyEditor: React.FC<EditorProps> = ({ id, readOnly, departments, onEdit, onClose }) => {
  const canEdit = !isSuperAdmin();
  const [tab, setTab] = useState<Tab>("basic");
  const [form, setForm] = useState<FacultyInput>(emptyForm);
  const [detail, setDetail] = useState<FacultyDetail | null>(null);
  const [sameAddress, setSameAddress] = useState(false);
  const [pending, setPending] = useState<Record<ImageKind, File | null>>({ photo: null, signature: null });
  const [previews, setPreviews] = useState<Record<ImageKind, string | null>>({ photo: null, signature: null });
  const [imageVersion, setImageVersion] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id == null) return;
    facultyMasterApi
      .get(id)
      .then((d) => {
        setDetail(d);
        setForm(toForm(d));
      })
      .catch((err) => setError(apiErrorMessage(err, "Could not load the faculty record.")));
  }, [id]);

  useEffect(() => () => {
    Object.values(previews).forEach((u) => u && URL.revokeObjectURL(u));
  }, [previews]);

  const set = <K extends keyof FacultyInput>(key: K, value: FacultyInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setAddress = (which: "commAddress" | "permAddress", key: keyof FacultyAddress, value: string) =>
    setForm((f) => ({ ...f, [which]: { ...f[which], [key]: value } }));

  const pickImage = (kind: ImageKind, file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Photo and signature must be JPEG or PNG images.");
      return;
    }
    if (file.size > IMAGE_LIMIT_KB[kind] * 1024) {
      setError(`The ${kind} must be ${IMAGE_LIMIT_KB[kind]} KB or smaller.`);
      return;
    }
    setPending((p) => ({ ...p, [kind]: file }));
    setPreviews((p) => ({ ...p, [kind]: URL.createObjectURL(file) }));
  };

  const removeStoredImage = async (kind: ImageKind) => {
    if (id == null || !window.confirm(`Remove the stored ${kind}?`)) return;
    try {
      await facultyMasterApi.removeImage(id, kind);
      setDetail((d) => (d ? { ...d, [kind === "photo" ? "hasPhoto" : "hasSignature"]: false } : d));
    } catch (err) {
      setError(apiErrorMessage(err, `Could not remove the ${kind}.`));
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setError("");
    // Required fields may sit on another tab, where the browser cannot show its own message: open that tab first
    const invalid = e.currentTarget.querySelector("input:invalid, select:invalid") as HTMLInputElement | null;
    if (invalid) {
      const owner = invalid.closest("[data-tab]")?.getAttribute("data-tab") as Tab | null;
      if (owner) setTab(owner);
      setTimeout(() => invalid.reportValidity(), 50);
      return;
    }
    const payload: FacultyInput = { ...form, permAddress: sameAddress ? { ...form.commAddress } : form.permAddress };
    setSaving(true);
    try {
      const saved = id == null ? await facultyMasterApi.create(payload) : await facultyMasterApi.update(id, payload);
      for (const kind of ["photo", "signature"] as ImageKind[]) {
        const file = pending[kind];
        if (file) await facultyMasterApi.uploadImage(saved.id, kind, file);
      }
      onClose(`${saved.title} ${saved.name} saved to the faculty master.`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save the faculty record."));
      setImageVersion((v) => v + 1);
    } finally {
      setSaving(false);
    }
  };

  // ---- repeating rows
  const updateRow = <T,>(key: "qualifications" | "employment" | "courses", index: number, patch: Partial<T>) =>
    setForm((f) => ({ ...f, [key]: (f[key] as unknown as T[]).map((r, i) => (i === index ? { ...r, ...patch } : r)) }));
  const removeRow = (key: "qualifications" | "employment" | "courses", index: number) =>
    setForm((f) => ({ ...f, [key]: (f[key] as unknown[]).filter((_, i) => i !== index) }));

  const title = readOnly ? "Faculty Details" : id == null ? "Add Faculty" : "Edit Faculty";
  const tabs: { key: Tab; label: string }[] = [
    { key: "basic", label: "Basic Details" },
    { key: "employment", label: "Employment History" },
    { key: "courses", label: "Course Offered" },
  ];

  const imageBox = (kind: ImageKind, label: string, boxClass: string) => {
    const stored = kind === "photo" ? detail?.hasPhoto : detail?.hasSignature;
    return (
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-gray-600 block">{label}</span>
        <div className={`${boxClass} rounded-xl border border-dashed border-gray-300 bg-gray-50 overflow-hidden`}>
          {previews[kind] ? (
            <img src={previews[kind]!} alt={kind} className="w-full h-full object-contain" />
          ) : stored && id != null ? (
            <StoredImage id={id} kind={kind} version={imageVersion} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-semibold">No {kind}</div>
          )}
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-1.5">
            <label className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-gray-50">
              <Upload size={12} /> {stored || previews[kind] ? "Replace" : "Upload"}
              <input type="file" accept="image/jpeg,image/png" className="hidden" data-kind={kind}
                onChange={(e) => { pickImage(kind, e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {stored && !previews[kind] && (
              <button type="button" onClick={() => removeStoredImage(kind)} className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 text-[11px] font-bold">
                Remove
              </button>
            )}
          </div>
        )}
        {!readOnly && <span className="text-[10px] text-gray-400 block">JPEG / PNG, up to {IMAGE_LIMIT_KB[kind]} KB</span>}
      </div>
    );
  };

  const addressBlock = (which: "commAddress" | "permAddress", disabled: boolean) => {
    const a = form[which];
    const v = (k: keyof FacultyAddress) => (a[k] ?? "") as string;
    return (
      <fieldset disabled={disabled} className="min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Door No."><input className={input} maxLength={30} value={v("doorNo")} onChange={(e) => setAddress(which, "doorNo", e.target.value)} /></Field>
        <Field label="Street" className="sm:col-span-1 lg:col-span-3"><input className={input} maxLength={120} value={v("street")} onChange={(e) => setAddress(which, "street", e.target.value)} /></Field>
        <Field label="Village / City"><input className={input} maxLength={80} value={v("city")} onChange={(e) => setAddress(which, "city", e.target.value)} /></Field>
        <Field label="District"><input className={input} maxLength={60} value={v("district")} onChange={(e) => setAddress(which, "district", e.target.value)} /></Field>
        <Field label="State"><input className={input} maxLength={60} value={v("state")} onChange={(e) => setAddress(which, "state", e.target.value)} /></Field>
        <Field label="Country"><input className={input} maxLength={60} value={v("country")} onChange={(e) => setAddress(which, "country", e.target.value)} /></Field>
        <Field label="Pincode"><input className={input} inputMode="numeric" maxLength={6} pattern="[1-9][0-9]{5}" title="6-digit pincode" value={v("pincode")} onChange={(e) => setAddress(which, "pincode", e.target.value.replace(/\D/g, ""))} /></Field>
      </fieldset>
    );
  };

  return (
    <form onSubmit={save} noValidate className="space-y-6" aria-label={title}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => onClose()} className="p-2 rounded-xl border bg-white hover:bg-gray-50" aria-label="Back to faculty list">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-black text-[#0B192C]">{title}</h1>
            {detail && (
              <p className="text-[11px] text-gray-500">
                {detail.title} {detail.name} · {detail.deptName} · last updated {detail.updatedAt} by {detail.updatedBy}
              </p>
            )}
          </div>
        </div>
        {readOnly && canEdit && id != null && (
          <button type="button" onClick={() => onEdit(id)} className="px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold flex items-center gap-1.5 self-start">
            <Pencil size={13} className="text-[#D4A72C]" /> Edit
          </button>
        )}
      </div>

      {isSuperAdmin() && (
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-semibold flex items-center gap-2">
          <Lock size={14} className="shrink-0" /> View only. The Aadhaar number is masked for the Chief COE.
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl text-xs font-bold border bg-red-50 text-red-800 border-red-200 flex items-center gap-2" role="alert">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {/* Tabs, as in the COE faculty screens */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-t-xl border-b-2 -mb-px ${
              tab === t.key ? "border-[#D4A72C] bg-white text-[#0B192C]" : "border-transparent text-gray-500 hover:text-[#0B192C]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 sm:p-6">
        {/* Basic Details */}
        <div data-tab="basic" hidden={tab !== "basic"} className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <fieldset disabled={readOnly} className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
                <Field label="Title" required className="w-24 shrink-0">
                  <select className={input} required value={form.title} onChange={(e) => set("title", e.target.value)}>
                    <option value="">—</option>
                    <option>Dr.</option>
                    <option>Mr.</option>
                    <option>Ms.</option>
                  </select>
                </Field>
                <Field label="Name" required className="flex-1">
                  <input className={input} required minLength={2} maxLength={120} value={form.name} onChange={(e) => set("name", e.target.value)} />
                </Field>
              </div>
              <Field label="Father / Husband Name">
                <input className={input} maxLength={120} value={form.relationName} onChange={(e) => set("relationName", e.target.value)} />
              </Field>
              <Field label="Department" required>
                <select className={input} required value={form.dept} onChange={(e) => set("dept", e.target.value)}>
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.key} value={d.key}>{d.name}</option>
                  ))}
                  {detail && !departments.some((d) => d.key === detail.deptKey) && <option value={detail.deptKey}>{detail.deptName}</option>}
                </select>
              </Field>
              <Field label="Gender" required>
                <select className={input} required value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Date of Birth" required>
                <input type="date" className={input} required value={form.dob} onChange={(e) => set("dob", e.target.value)} />
              </Field>
              <Field label="Present Designation" required>
                <input className={input} required maxLength={80} placeholder="e.g. Assistant Professor" value={form.designation} onChange={(e) => set("designation", e.target.value)} />
              </Field>
              <Field label="Date of Joining Service" required>
                <input type="date" className={input} required value={form.joinedServiceOn} onChange={(e) => set("joinedServiceOn", e.target.value)} />
              </Field>
              <Field label="Date of Joining Present Post" required>
                <input type="date" className={input} required value={form.joinedPostOn} onChange={(e) => set("joinedPostOn", e.target.value)} />
              </Field>
              <Field label="Aadhaar Number">
                <input className={input} inputMode="numeric" maxLength={readOnly ? 20 : 14} placeholder="12 digits" value={form.aadhaar}
                  onChange={(e) => set("aadhaar", e.target.value.replace(/[^\d ]/g, ""))} />
              </Field>
              <Field label="Mobile" required>
                <input type="tel" className={input} required maxLength={15} placeholder="10-digit mobile" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
              </Field>
              <Field label="Residential Phone">
                <input type="tel" className={input} maxLength={20} value={form.residentialPhone} onChange={(e) => set("residentialPhone", e.target.value)} />
              </Field>
              <Field label="E-mail">
                <input type="email" className={input} maxLength={120} value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
            </fieldset>
            <div className="flex lg:flex-col gap-6 shrink-0">
              {imageBox("photo", "Photo", "w-32 h-40")}
              {imageBox("signature", "Signature", "w-40 h-16")}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-black text-[#0B192C] uppercase tracking-wider">Address for Communication</h3>
            {addressBlock("commAddress", readOnly)}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-black text-[#0B192C] uppercase tracking-wider">Permanent Address</h3>
              {!readOnly && (
                <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                  <input type="checkbox" checked={sameAddress} onChange={(e) => setSameAddress(e.target.checked)} /> Same as address for communication
                </label>
              )}
            </div>
            {sameAddress && !readOnly ? (
              <p className="text-xs text-gray-500">The permanent address will be saved the same as the address for communication.</p>
            ) : (
              addressBlock("permAddress", readOnly)
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-black text-[#0B192C] uppercase tracking-wider">Qualifications at the Time of Joining</h3>
            <fieldset disabled={readOnly} className="overflow-x-auto min-w-0">
              <table className="w-full text-xs min-w-[560px]">
                <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="text-left px-2 py-2 w-10">#</th>
                    <th className="text-left px-2 py-2">Qualification</th>
                    <th className="text-left px-2 py-2">Discipline / Specialisation</th>
                    <th className="text-left px-2 py-2 w-40">Month &amp; Year of Completion</th>
                    {!readOnly && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {form.qualifications.map((q, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1.5 text-gray-500">{i + 1}</td>
                      <td className="px-2 py-1.5"><input className={cell} required maxLength={60} placeholder="e.g. M.E." value={q.qualification} onChange={(e) => updateRow<FacultyQualification>("qualifications", i, { qualification: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><input className={cell} required maxLength={100} placeholder="e.g. Computer Science" value={q.discipline} onChange={(e) => updateRow<FacultyQualification>("qualifications", i, { discipline: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><input type="month" className={cell} required value={q.completedOn} onChange={(e) => updateRow<FacultyQualification>("qualifications", i, { completedOn: e.target.value })} /></td>
                      {!readOnly && (
                        <td className="px-2 py-1.5"><button type="button" onClick={() => removeRow("qualifications", i)} aria-label="Delete qualification" className="p-1.5 rounded-lg text-red-700 hover:bg-red-50"><Trash2 size={13} /></button></td>
                      )}
                    </tr>
                  ))}
                  {form.qualifications.length === 0 && (
                    <tr><td colSpan={5} className="px-2 py-4 text-center text-gray-400">No qualifications entered.</td></tr>
                  )}
                </tbody>
              </table>
            </fieldset>
            {!readOnly && form.qualifications.length < 10 && (
              <button type="button" onClick={() => set("qualifications", [...form.qualifications, { qualification: "", discipline: "", completedOn: "" }])}
                className="px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 hover:bg-gray-50">
                <Plus size={12} /> Add Qualification
              </button>
            )}
          </div>
        </div>

        {/* Employment History */}
        <div data-tab="employment" hidden={tab !== "employment"} className="space-y-8">
          {SECTIONS.map((s) => {
            const indexed = form.employment.map((r, i) => ({ r, i })).filter(({ r }) => r.section === s.key);
            return (
              <div key={s.key} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-black text-[#0B192C] uppercase tracking-wider">{s.label}</h3>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F8F5EE] border border-[#D4A72C]/40 text-[#0B192C]" data-testid={`exp-${s.key}`}>
                    Total: {formatExperience(experienceMonths(indexed.map(({ r }) => r)))}
                  </span>
                </div>
                <fieldset disabled={readOnly} className="overflow-x-auto min-w-0">
                  <table className="w-full text-xs min-w-[720px]">
                    <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="text-left px-2 py-2">Designation / Position</th>
                        <th className="text-left px-2 py-2">{s.key === "INDUSTRIAL" ? "Company" : "College"}</th>
                        <th className="text-left px-2 py-2">Location</th>
                        <th className="text-left px-2 py-2 w-36">From</th>
                        <th className="text-left px-2 py-2 w-36">To</th>
                        {!readOnly && <th className="w-10" />}
                      </tr>
                    </thead>
                    <tbody>
                      {indexed.map(({ r, i }) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1.5"><input className={cell} required maxLength={80} value={r.designation} onChange={(e) => updateRow<FacultyEmployment>("employment", i, { designation: e.target.value })} /></td>
                          <td className="px-2 py-1.5"><input className={cell} required maxLength={150} value={r.organisation} onChange={(e) => updateRow<FacultyEmployment>("employment", i, { organisation: e.target.value })} /></td>
                          <td className="px-2 py-1.5"><input className={cell} required maxLength={100} value={r.location} onChange={(e) => updateRow<FacultyEmployment>("employment", i, { location: e.target.value })} /></td>
                          <td className="px-2 py-1.5"><input type="date" className={cell} required value={r.from} onChange={(e) => updateRow<FacultyEmployment>("employment", i, { from: e.target.value })} /></td>
                          <td className="px-2 py-1.5"><input type="date" className={cell} required value={r.to} min={r.from || undefined} onChange={(e) => updateRow<FacultyEmployment>("employment", i, { to: e.target.value })} /></td>
                          {!readOnly && (
                            <td className="px-2 py-1.5"><button type="button" onClick={() => removeRow("employment", i)} aria-label="Delete employment row" className="p-1.5 rounded-lg text-red-700 hover:bg-red-50"><Trash2 size={13} /></button></td>
                          )}
                        </tr>
                      ))}
                      {indexed.length === 0 && (
                        <tr><td colSpan={6} className="px-2 py-4 text-center text-gray-400">No {s.label.toLowerCase()} entered.</td></tr>
                      )}
                    </tbody>
                  </table>
                </fieldset>
                {!readOnly && (
                  <button type="button" onClick={() => set("employment", [...form.employment, { section: s.key, designation: "", organisation: "", location: "", from: "", to: "" }])}
                    className="px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 hover:bg-gray-50">
                    <Plus size={12} /> Add Entry
                  </button>
                )}
              </div>
            );
          })}
          <div className="text-xs font-black text-[#0B192C] text-right">
            Overall experience: {formatExperience(experienceMonths(form.employment))}
          </div>
        </div>

        {/* Course Offered */}
        <div data-tab="courses" hidden={tab !== "courses"} className="space-y-8">
          {(["THEORY", "PRACTICAL"] as const).map((kind) => {
            const indexed = form.courses.map((r, i) => ({ r, i })).filter(({ r }) => r.kind === kind);
            return (
              <div key={kind} className="space-y-3">
                <h3 className="text-xs font-black text-[#0B192C] uppercase tracking-wider">{kind === "THEORY" ? "Theory Subjects Handled" : "Practical Subjects Handled"}</h3>
                <fieldset disabled={readOnly} className="overflow-x-auto min-w-0">
                  <table className="w-full text-xs min-w-[560px]">
                    <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="text-left px-2 py-2">Branch</th>
                        <th className="text-left px-2 py-2">Course</th>
                        <th className="text-left px-2 py-2 w-36">No. of Times Offered</th>
                        {!readOnly && <th className="w-10" />}
                      </tr>
                    </thead>
                    <tbody>
                      {indexed.map(({ r, i }) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1.5"><input className={cell} required maxLength={80} placeholder="e.g. B.E. CSE" value={r.branch} onChange={(e) => updateRow<FacultyCourse>("courses", i, { branch: e.target.value })} /></td>
                          <td className="px-2 py-1.5"><input className={cell} required maxLength={150} placeholder="e.g. CS3301 Data Structures" value={r.course} onChange={(e) => updateRow<FacultyCourse>("courses", i, { course: e.target.value })} /></td>
                          <td className="px-2 py-1.5"><input type="number" className={cell} required min={1} max={99} value={r.timesOffered || ""} onChange={(e) => updateRow<FacultyCourse>("courses", i, { timesOffered: Number(e.target.value) })} /></td>
                          {!readOnly && (
                            <td className="px-2 py-1.5"><button type="button" onClick={() => removeRow("courses", i)} aria-label="Delete course" className="p-1.5 rounded-lg text-red-700 hover:bg-red-50"><Trash2 size={13} /></button></td>
                          )}
                        </tr>
                      ))}
                      {indexed.length === 0 && (
                        <tr><td colSpan={4} className="px-2 py-4 text-center text-gray-400">No {kind === "THEORY" ? "theory" : "practical"} subjects entered.</td></tr>
                      )}
                    </tbody>
                  </table>
                </fieldset>
                {!readOnly && (
                  <button type="button" onClick={() => set("courses", [...form.courses, { kind, branch: "", course: "", timesOffered: 1 }])}
                    className="px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 hover:bg-gray-50">
                    <Plus size={12} /> Add Entry
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => onClose()} className="px-5 py-2.5 rounded-xl border bg-white text-xs font-bold flex items-center gap-1.5">
          <X size={14} /> {readOnly ? "Close" : "Cancel"}
        </button>
        {!readOnly && (
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
            <Save size={14} className="text-[#D4A72C]" /> {saving ? "Saving…" : "Save Profile"}
          </button>
        )}
      </div>
    </form>
  );
};
