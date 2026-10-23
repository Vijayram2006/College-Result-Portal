import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, KeyRound, Loader2, Plus, Save, ShieldCheck, UserPlus, Users, X } from "lucide-react";
import { apiClient, apiErrorMessage } from "../../services/api";

/**
 * The Associate Dean adds the college's faculty: the details are verified by the Dean and become a faculty sign-in
 * of their own (username = staff ID), with one department and the subjects they handle. Mark entry and the CO sheet
 * then show the faculty member only those subjects; paper correction shows the bundles the Dean allots.
 */

type HandlingSubject = { semester: string; code: string; title: string };
type FacultyAccount = {
  id: number; title: string; name: string; staffId: string | null; deptKey: string; deptName: string;
  designation: string; mobile: string; email: string | null; username: string | null; active: boolean;
  verifiedBy: string | null; verifiedAt: string | null; subjects: HandlingSubject[];
};
type Department = { key: string; name: string; code: string };
type DeptSubject = { semester: string; code: string; title: string };

const DESIGNATIONS = ["Professor", "Associate Professor", "Assistant Professor", "Assistant Professor (Sr. Grade)", "Lecturer"];
const empty = {
  title: "Dr.", name: "", staffId: "", dept: "", gender: "Male", dob: "", designation: "Assistant Professor",
  joinedOn: "", mobile: "", email: "",
};
const input = "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#0B192C]";
const label = "block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1";

function SubjectPicker({ dept, value, onChange }: { dept: string; value: string[]; onChange: (v: string[]) => void }) {
  const [subjects, setSubjects] = useState<DeptSubject[]>([]);
  useEffect(() => {
    if (!dept) return setSubjects([]);
    apiClient.get<DeptSubject[]>("/dean/faculty/subjects", { params: { dept } }).then((r) => setSubjects(r.data)).catch(() => setSubjects([]));
  }, [dept]);
  const key = (s: { semester: string; code: string }) => `${s.semester}|${s.code}`;
  if (!dept) return <p className="text-xs text-gray-500">Choose the department first.</p>;
  if (subjects.length === 0) return <p className="text-xs text-gray-500">No subjects in this department yet.</p>;
  return (
    <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
      {subjects.map((s) => (
        <label key={key(s)} className="flex items-center gap-3 px-3 py-2 text-xs cursor-pointer hover:bg-amber-50/40">
          <input type="checkbox" className="h-4 w-4 accent-[#D4A72C]" checked={value.includes(key(s))}
            onChange={(e) => onChange(e.target.checked ? [...value, key(s)] : value.filter((v) => v !== key(s)))} />
          <span className="font-mono font-bold text-[#0B192C] w-24 shrink-0">{s.code}</span>
          <span className="flex-1 text-gray-700">{s.title}</span>
          <span className="text-[10px] font-bold text-gray-500">{s.semester}</span>
        </label>
      ))}
    </div>
  );
}

const toInput = (keys: string[]) => keys.map((k) => ({ semester: k.split("|")[0], code: k.split("|")[1] }));

export function DeanFacultyManager() {
  const [rows, setRows] = useState<FacultyAccount[] | null>(null);
  const [depts, setDepts] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(empty);
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ name: string; username: string; password: string } | null>(null);
  const [editing, setEditing] = useState<FacultyAccount | null>(null);
  const [editPicked, setEditPicked] = useState<string[]>([]);

  const load = () =>
    apiClient.get<FacultyAccount[]>("/dean/faculty").then((r) => setRows(r.data))
      .catch((e) => setError(apiErrorMessage(e, "Could not load the faculty.")));
  useEffect(() => {
    load();
    apiClient.get<Department[]>("/admin/departments").then((r) => setDepts(r.data)).catch(() => setDepts([]));
  }, []);

  const shown = useMemo(() => (rows ?? []).filter((f) =>
    !q.trim() || `${f.name} ${f.staffId ?? ""} ${f.deptName} ${f.designation}`.toLowerCase().includes(q.trim().toLowerCase())), [rows, q]);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const r = await apiClient.post<{ faculty: FacultyAccount; startingPassword: string }>("/dean/faculty", { ...form, subjects: toInput(picked) });
      setCreated({ name: `${r.data.faculty.title} ${r.data.faculty.name}`, username: r.data.faculty.username ?? "", password: r.data.startingPassword });
      setAdding(false);
      setForm(empty);
      setPicked([]);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "The faculty member could not be added."));
    } finally {
      setSaving(false);
    }
  };

  const saveSubjects = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiClient.put(`/dean/faculty/${editing.id}/subjects`, toInput(editPicked));
      setEditing(null);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "The handling subjects could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-3 border-b border-gray-100 pb-4 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0"><Users size={18} /></div>
          <div className="flex-1 min-w-[220px]">
            <h2 className="font-display font-bold text-xl text-[#0B192C]">Faculty Master</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Add a faculty member with their department and handling subjects. Once you verify and add them, they sign in
              with their own staff ID (not a shared FACCSE login) and see only their handling subjects in mark entry.
            </p>
          </div>
          <button onClick={() => { setAdding(true); setCreated(null); }}
            className="h-10 px-4 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-black inline-flex items-center gap-2">
            <UserPlus size={15} /> Add faculty
          </button>
        </div>

        {created && (
          <div role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 space-y-1">
            <p className="font-black flex items-center gap-2"><CheckCircle2 size={15} /> {created.name} is verified and added as faculty.</p>
            <p className="flex items-center gap-2"><KeyRound size={13} /> Username <span className="font-mono font-black">{created.username}</span> · Starting password <span className="font-mono font-black">{created.password}</span></p>
            <p className="text-emerald-800">Give these to the faculty member; the password is shown only now and must be changed at first sign-in.</p>
          </div>
        )}
        {error && <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</p>}

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, staff ID, department or designation"
          className="mb-4 h-10 w-full sm:max-w-sm rounded-xl border border-gray-200 px-3 text-xs" />
        {rows === null && !error && <p className="py-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading...</p>}
        {rows !== null && shown.length === 0 && <p className="py-8 text-center text-xs text-gray-500">No faculty yet. Use "Add faculty".</p>}
        {shown.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500">
                <tr>{["Name", "Staff ID / Sign-in", "Department", "Designation", "Handling subjects", "Status", ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {shown.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-3 font-semibold text-[#0B192C]">{f.title} {f.name}</td>
                    <td className="px-4 py-3 font-mono">{f.username ?? "—"}</td>
                    <td className="px-4 py-3">{f.deptName}</td>
                    <td className="px-4 py-3">{f.designation}</td>
                    <td className="px-4 py-3">
                      {f.subjects.length === 0 ? <span className="text-gray-400">None</span>
                        : <div className="flex flex-wrap gap-1">{f.subjects.map((s) => <span key={s.semester + s.code} title={`${s.title} · ${s.semester}`} className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 font-mono font-bold text-[10px]">{s.code}</span>)}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {f.username ? <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><ShieldCheck size={13} /> Verified{f.active ? "" : " (suspended)"}</span>
                        : <span className="font-bold text-gray-500">Record only</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {f.username && (
                        <button onClick={() => { setEditing(f); setEditPicked(f.subjects.map((s) => `${s.semester}|${s.code}`)); }}
                          className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-gray-50">
                          <BookOpen size={12} /> Subjects
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Add faculty">
          <form onSubmit={submit} className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#0B192C] flex items-center gap-2"><Plus size={18} /> Add faculty</h3>
              <button type="button" aria-label="Close" onClick={() => setAdding(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label><span className={label}>Title</span><select className={input} value={form.title} onChange={set("title")}>{["Dr.", "Mr.", "Ms."].map((t) => <option key={t}>{t}</option>)}</select></label>
              <label className="sm:col-span-2"><span className={label}>Full name</span><input required className={input} value={form.name} onChange={set("name")} /></label>
              <label><span className={label}>Staff ID (sign-in name)</span><input required className={input} value={form.staffId} onChange={set("staffId")} placeholder="e.g. KVCET1042" /></label>
              <label><span className={label}>Department</span>
                <select required className={input} value={form.dept} onChange={(e) => { set("dept")(e); setPicked([]); }}>
                  <option value="">Choose...</option>
                  {depts.map((d) => <option key={d.key} value={d.key}>{d.code ? `${d.code} · ` : ""}{d.name}</option>)}
                </select>
              </label>
              <label><span className={label}>Designation</span><select className={input} value={form.designation} onChange={set("designation")}>{DESIGNATIONS.map((d) => <option key={d}>{d}</option>)}</select></label>
              <label><span className={label}>Gender</span><select className={input} value={form.gender} onChange={set("gender")}>{["Male", "Female", "Other"].map((g) => <option key={g}>{g}</option>)}</select></label>
              <label><span className={label}>Date of birth</span><input required type="date" className={input} value={form.dob} onChange={set("dob")} /></label>
              <label><span className={label}>Date of joining</span><input required type="date" className={input} value={form.joinedOn} onChange={set("joinedOn")} /></label>
              <label><span className={label}>Mobile</span><input required inputMode="numeric" pattern="[6-9][0-9]{9}" className={input} value={form.mobile} onChange={set("mobile")} /></label>
              <label className="sm:col-span-2"><span className={label}>Email</span><input type="email" className={input} value={form.email} onChange={set("email")} /></label>
            </div>
            <div>
              <span className={label}>Handling subjects ({picked.length})</span>
              <SubjectPicker dept={form.dept} value={picked} onChange={setPicked} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-bold">Cancel</button>
              <button type="submit" disabled={saving} className="h-10 px-4 rounded-xl bg-[#0B192C] text-white text-xs font-black inline-flex items-center gap-2 disabled:opacity-50">
                <ShieldCheck size={15} /> {saving ? "Adding..." : "Verify & add as faculty"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Handling subjects">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#0B192C]">Handling subjects · {editing.title} {editing.name}</h3>
              <button aria-label="Close" onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <SubjectPicker dept={editing.deptKey} value={editPicked} onChange={setEditPicked} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-bold">Cancel</button>
              <button onClick={saveSubjects} disabled={saving} className="h-10 px-4 rounded-xl bg-[#0B192C] text-white text-xs font-black inline-flex items-center gap-2 disabled:opacity-50">
                <Save size={15} /> Save subjects
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeanFacultyManager;
