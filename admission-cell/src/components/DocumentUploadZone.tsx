import { useDocUrl } from "../services/admissionStorage";
import React, { useRef, useState } from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  X,
  FileCheck,
} from "lucide-react";
import { DocumentAttachment } from "../types/admission";

interface UploadZoneProps {
  label: string;
  description?: string;
  required?: boolean;
  currentDocument?: DocumentAttachment;
  onDocumentChange: (doc: DocumentAttachment | undefined) => void;
  accentColor?: string;
}

export const DocumentUploadZone: React.FC<UploadZoneProps> = ({
  label,
  description = "Upload original PDF or Image scan (Max 10MB)",
  required = false,
  currentDocument,
  onDocumentChange,
  accentColor = "#D4A72C",
}) => {
  const docUrl = useDocUrl(currentDocument?.dataUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileProcess = (file: File) => {
    setErrorMsg(null);

    // Limit to 15MB
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg("File size exceeds 15MB limit. Please upload a compressed document.");
      return;
    }

    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("Unsupported file type. Please upload a PDF, PNG, or JPG document.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const doc: DocumentAttachment = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        dataUrl: result,
        uploadedAt: new Date().toISOString(),
      };
      onDocumentChange(doc);
    };

    reader.onerror = () => {
      setErrorMsg("Failed to read the file. Please try again.");
    };

    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDocumentChange(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentDocument) return;
    const a = document.createElement("a");
    a.href = docUrl || currentDocument.dataUrl;
    a.download = currentDocument.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isPdf = currentDocument?.fileType?.includes("pdf") || currentDocument?.fileName?.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {currentDocument && (
          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 size={12} />
            Document Attached
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* If Document Is Already Attached */}
      {currentDocument ? (
        <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0 shadow-xs">
              {isPdf ? <FileText size={22} className="text-rose-600" /> : <ImageIcon size={22} className="text-sky-600" />}
            </div>
            <div className="overflow-hidden">
              <span className="text-xs font-bold text-gray-900 block truncate" title={currentDocument.fileName}>
                {currentDocument.fileName}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <span>{formatFileSize(currentDocument.fileSize)}</span>
                <span>•</span>
                <span className="uppercase font-semibold">{isPdf ? "PDF Document" : "Image Scan"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Eye size={13} className="text-sky-600" />
              <span>Preview</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download size={13} className="text-emerald-700" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
              title="Replace document"
            >
              Replace
            </button>

            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
              title="Remove file"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ) : (
        /* Empty Dropzone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center ${
            dragOver
              ? "border-[#D4A72C] bg-amber-50/60"
              : "border-gray-300 bg-gray-50/80 hover:bg-white hover:border-[#D4A72C]"
          }`}
        >
          <div className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 mb-2 shadow-2xs">
            <Upload size={18} className="text-gray-600" />
          </div>
          <p className="text-xs font-bold text-gray-800">
            Click to upload or drag & drop {label}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">{description}</p>
        </div>
      )}

      {errorMsg && (
        <p className="text-[11px] text-red-600 font-medium">{errorMsg}</p>
      )}

      {/* Modal Preview */}
      {isPreviewOpen && currentDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-gray-300">
            <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck size={18} className="text-[#D4A72C]" />
                <span className="font-bold text-xs truncate max-w-md">
                  {currentDocument.fileName}
                </span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono">
                  {formatFileSize(currentDocument.fileSize)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="px-3 py-1 rounded-lg bg-[#D4A72C] text-[#0B192C] font-bold text-xs flex items-center gap-1.5 hover:bg-amber-400"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="text-white/60 hover:text-white p-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-100 p-4 overflow-auto flex items-center justify-center">
              {isPdf ? (
                <iframe
                  src={docUrl || undefined}
                  title={currentDocument.fileName}
                  className="w-full h-full rounded-xl border border-gray-300 bg-white"
                />
              ) : (
                <img
                  src={docUrl || undefined}
                  alt={currentDocument.fileName}
                  className="max-h-full max-w-full rounded-xl object-contain shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
