import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  FileSpreadsheet,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  Globe,
  AlertTriangle,
  Eye,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { adminResultsApi, ResultBatchRecord } from "../services/api";

export const ResultsPage: React.FC = () => {
  const [batches, setBatches] = useState<ResultBatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedBatch, setSelectedBatch] = useState<ResultBatchRecord | null>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const data = await adminResultsApi.getResultBatches();
      setBatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.batchTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.departmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || b.publicationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#2E7D5B]/10 text-[#2E7D5B] border border-[#2E7D5B]/30">
            <Globe size={12} /> PUBLISHED
          </span>
        );
      case "VALIDATED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#C98A18]/10 text-[#C98A18] border border-[#C98A18]/30">
            <CheckCircle2 size={12} /> VALIDATED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#172033]/10 text-[#172033] border border-[#172033]/30">
            <AlertTriangle size={12} /> DRAFT
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#D4A72C] uppercase tracking-wider mb-1">
            <FileSpreadsheet size={14} />
            Result Management Hub
          </div>
          <h1 className="text-2xl font-black text-[#0B192C]">All Examination Result Batches</h1>
          <p className="text-xs text-[#667085] mt-1">
            Manage end-semester marks uploads, verification workflows, and publication releases.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/results/upload"
            className="flex items-center gap-2 bg-[#0B192C] hover:bg-[#0B192C]/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md"
          >
            <Upload size={14} /> Student Data
          </Link>
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/results/upload"
          className="p-5 bg-gradient-to-br from-white to-blue-50/30 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0B192C] text-white flex items-center justify-center mb-3">
            <Upload size={20} />
          </div>
          <h3 className="font-bold text-sm text-[#0B192C] group-hover:text-[#D4A72C] transition flex items-center justify-between">
            1. Student Data Importer <ArrowRight size={16} />
          </h3>
          <p className="text-xs text-[#667085] mt-1">
            Upload student records (Register Number, Name, DOB) with drag & drop parsing.
          </p>
        </Link>

        <Link
          href="/admin/results/validation"
          className="p-5 bg-gradient-to-br from-white to-amber-50/30 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#C98A18] text-white flex items-center justify-center mb-3">
            <CheckCircle2 size={20} />
          </div>
          <h3 className="font-bold text-sm text-[#0B192C] group-hover:text-[#C98A18] transition flex items-center justify-between">
            2. Student Mark Entry Hub <ArrowRight size={16} />
          </h3>
          <p className="text-xs text-[#667085] mt-1">
            Question-wise evaluation sheets (Part A, B, C) and official mark confirmation.
          </p>
        </Link>

        <Link
          href="/admin/results/published"
          className="p-5 bg-gradient-to-br from-white to-emerald-50/30 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#2E7D5B] text-white flex items-center justify-center mb-3">
            <Globe size={20} />
          </div>
          <h3 className="font-bold text-sm text-[#0B192C] group-hover:text-[#2E7D5B] transition flex items-center justify-between">
            3. Published Results & Release <ArrowRight size={16} />
          </h3>
          <p className="text-xs text-[#667085] mt-1">
            Review validated drafts and trigger live visibility to Student Portal.
          </p>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, dept, batch ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-500" />
            <span className="text-xs font-bold text-gray-600">Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="VALIDATED">Validated</option>
            <option value="PUBLISHED">Published</option>
          </select>
          <button
            onClick={loadBatches}
            className="p-2 text-gray-500 hover:text-[#0B192C] rounded-lg hover:bg-gray-100 transition"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Batch ID & Title</th>
                <th className="p-4">Department & Semester</th>
                <th className="p-4">Total Students</th>
                <th className="p-4">Pass Rate</th>
                <th className="p-4">Upload Date</th>
                <th className="p-4">Publication Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 font-semibold">
                    Loading examination batches...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 font-semibold">
                    No result batches found matching your search.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50/80 transition">
                    <td className="p-4">
                      <span className="font-bold text-[#0B192C] block">{batch.batchTitle}</span>
                      <span className="text-[10px] text-gray-400 font-mono font-bold block">{batch.id}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-gray-800 block">{batch.departmentName}</span>
                      <span className="text-[11px] text-[#D4A72C] font-bold block">{batch.semester} ({batch.academicYear})</span>
                    </td>
                    <td className="p-4 font-bold text-gray-800">{batch.totalStudents} Candidates</td>
                    <td className="p-4">
                      <span className="font-extrabold text-[#2E7D5B]">{batch.passPercentage}%</span>
                      <span className="text-[10px] text-gray-400 block">{batch.passedStudents} Passed</span>
                    </td>
                    <td className="p-4 text-gray-600">{batch.uploadDate}</td>
                    <td className="p-4">{getStatusBadge(batch.publicationStatus)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedBatch(batch)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-[#0B192C] font-bold hover:bg-[#0B192C] hover:text-white transition text-xs"
                      >
                        <Eye size={13} /> View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Details Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4A72C]">
                  {selectedBatch.id}
                </span>
                <h3 className="font-black text-lg text-[#0B192C]">{selectedBatch.batchTitle}</h3>
              </div>
              <div>{getStatusBadge(selectedBatch.publicationStatus)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block">Department</span>
                <span className="font-bold text-[#0B192C]">{selectedBatch.departmentName}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block">Semester / Academic Year</span>
                <span className="font-bold text-[#0B192C]">{selectedBatch.semester} ({selectedBatch.academicYear})</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block">Total Candidates</span>
                <span className="font-bold text-[#0B192C]">{selectedBatch.totalStudents}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block">Overall Pass Percentage</span>
                <span className="font-bold text-[#2E7D5B]">{selectedBatch.passPercentage}%</span>
              </div>
            </div>

            {selectedBatch.records && selectedBatch.records.length > 0 && (
              <div className="border rounded-xl overflow-hidden mt-2">
                <div className="bg-gray-100 p-2.5 font-bold text-xs text-[#0B192C]">
                  Sample Student Scorecards ({selectedBatch.records.length})
                </div>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto text-xs">
                  {selectedBatch.records.map((rec, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-800">{rec.studentName}</span>
                        <span className="text-[10px] text-gray-400 font-mono block">{rec.regNo} | {rec.courseCode}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#0B192C]">{rec.totalMarks} Marks</span>
                        <span className="text-[10px] font-bold text-[#2E7D5B] block">Grade: {rec.grade} ({rec.resultStatus})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
              {selectedBatch.publicationStatus === "VALIDATED" && (
                <Link
                  href="/admin/results/published"
                  className="px-4 py-2 bg-[#2E7D5B] hover:bg-[#2E7D5B]/90 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Globe size={14} /> Go to Publish Screen
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
