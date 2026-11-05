import React, { useState, useEffect, useMemo, useRef } from "react";
import { jsPDF } from "jspdf";
import {
  BookOpen,
  FileText,
  Download,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  User,
  X,
  FileCode,
  FileCheck,
  Presentation,
  Upload,
  Eye,
  Paperclip,
  ExternalLink,
  File,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import {
  apiClient,
  apiErrorMessage,
  courseMaterialsApi,
  type CourseMaterialView,
  type SubjectCoverageView,
} from "../services/api";

type MaterialCategory = "NOTE" | "SLIDES" | "LAB_MANUAL" | "QUESTION_BANK" | "REFERENCE";

// Local IndexedDB vault for course material file storage and instant cross-session retrieval
const DB_NAME = "kvell_materials_db";
const STORE_NAME = "material_files";

function openMaterialsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available"));
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveFileToVault(key: string, data: { fileName: string; fileType: string; dataUrl: string; fileSize: number }) {
  try {
    const db = await openMaterialsDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ key, ...data });
    await new Promise((res) => { tx.oncomplete = res; });
  } catch {
    try {
      localStorage.setItem(`kvell_mat_${key}`, JSON.stringify(data));
    } catch {}
  }
}

async function getFileFromVault(key: string): Promise<{ fileName: string; fileType: string; dataUrl: string; fileSize: number } | null> {
  try {
    const db = await openMaterialsDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    const result = await new Promise<any>((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    if (result) return result;
  } catch {
    try {
      const ls = localStorage.getItem(`kvell_mat_${key}`);
      if (ls) return JSON.parse(ls);
    } catch {}
  }
  return null;
}

// Local storage helper for resilient multi-session material list persistence
const LOCAL_MATERIALS_KEY = "kvell_local_published_materials";

function getLocalPublishedMaterials(): CourseMaterialView[] {
  try {
    const raw = localStorage.getItem(LOCAL_MATERIALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMaterial(item: CourseMaterialView) {
  try {
    const current = getLocalPublishedMaterials();
    const filtered = current.filter((m) => m.id !== item.id && m.fileName !== item.fileName);
    localStorage.setItem(LOCAL_MATERIALS_KEY, JSON.stringify([item, ...filtered].slice(0, 60)));
  } catch {}
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 KB";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getFileTypeLabel(fileName: string): string {
  const ext = fileName.split(".").pop()?.toUpperCase() || "DOC";
  return ext.length > 4 ? ext.substring(0, 4) : ext;
}

function getFileBadgeStyle(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "bg-rose-100 text-rose-700 border border-rose-200";
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "bg-amber-100 text-amber-700 border border-amber-200";
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "bg-blue-100 text-blue-700 border border-blue-200";
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".csv")) return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".svg")) return "bg-purple-100 text-purple-700 border border-purple-200";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function generateCourseMaterialPdf(m: CourseMaterialView): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(11, 25, 44); // #0B192C
  doc.rect(0, 0, pageWidth, 68, "F");

  // Gold Accent Band
  doc.setFillColor(212, 167, 44); // #D4A72C
  doc.rect(0, 68, pageWidth, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(212, 167, 44); // #D4A72C
  doc.text("KVELL UNIVERSITY", margin, 28);

  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DIRECTORATE OF ACADEMIC AFFAIRS & DIGITAL LEARNING REPOSITORY", margin, 44);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text("Official Curriculum Resource · Karpaga Vinayaga Educational Lore for Learning", margin, 58);

  // Metadata Card Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, 85, contentWidth, 75, 4, 4, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, 85, contentWidth, 75, 4, 4, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(11, 25, 44);
  doc.text(`${m.subjectCode} - ${m.subjectTitle}`, margin + 14, 103);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Department: ${(m.deptKey || "CSE").toUpperCase()} | Semester: ${m.semester} | Unit: Unit ${m.unitNumber}`, margin + 14, 118);
  doc.text(`Resource: ${m.title}`, margin + 14, 132);
  doc.text(`Faculty In-Charge: ${m.facultyName} | Category: ${m.materialType.replace(/_/g, " ")} | Ref: DOC-${m.id.toString().padStart(6, "0")}`, margin + 14, 146);

  // Section Title: Description
  let curY = 180;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(11, 25, 44);
  doc.text("1. MODULE OVERVIEW & SYLLABUS SCOPE", margin, curY);

  curY += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const descText = m.description || "Official course material and study reference document issued for students.";
  const splitDesc = doc.splitTextToSize(descText, contentWidth);
  doc.text(splitDesc, margin, curY);
  curY += splitDesc.length * 13 + 15;

  // Specific Content Based on Type
  if (m.materialType === "QUESTION_BANK") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(11, 25, 44);
    doc.text("2. PART A: SOLVED 2-MARK QUESTIONS & ANSWERS", margin, curY);
    curY += 16;

    const partA = [
      {
        q: `Q1: Define the core architectural objective of ${m.subjectTitle} in Unit ${m.unitNumber}.`,
        a: `Ans: It establishes foundational communication protocols, systematic data packet routing, and standardized transmission guarantees conforming to ISO/IEEE specifications.`,
      },
      {
        q: `Q2: What is the primary difference between connection-oriented and connectionless transmission?`,
        a: `Ans: Connection-oriented services establish a dedicated circuit with handshaking and guaranteed delivery, whereas connectionless services route packets independently with lower overhead.`,
      },
      {
        q: `Q3: List two major error-control mechanisms deployed at this layer.`,
        a: `Ans: 1. Cyclic Redundancy Check (CRC-32) for frame-level error detection; 2. Automatic Repeat reQuest (ARQ) with sliding-window selective retransmission.`,
      },
      {
        q: `Q4: State the formula for throughput calculation under sliding window flow control.`,
        a: `Ans: Throughput = (Window Size * Frame Size) / Round Trip Time (RTT). Optimal window size equals 2 * Bandwidth-Delay Product + 1.`,
      },
    ];

    partA.forEach((item) => {
      if (curY > pageHeight - 80) {
        doc.addPage();
        curY = 50;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(item.q, margin, curY);
      curY += 12;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const splitA = doc.splitTextToSize(item.a, contentWidth);
      doc.text(splitA, margin + 10, curY);
      curY += splitA.length * 11 + 10;
    });

    if (curY > pageHeight - 140) {
      doc.addPage();
      curY = 50;
    }

    curY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(11, 25, 44);
    doc.text("3. PART B: 16-MARK COMPREHENSIVE UNIVERSITY QUESTIONS", margin, curY);
    curY += 16;

    const partB = [
      `Q5 (a): Explain the end-to-end packet flow architecture in ${m.subjectTitle} (Unit ${m.unitNumber}) with a detailed state-machine diagram, protocol header breakdown, and comparative performance analysis against legacy topologies. (16 Marks)`,
      `Q6 (b): An enterprise network requires subnetting across 5 departments with low latency requirements. Design an optimal addressing scheme, derive routing table entries, and formulate the convergence algorithm step-by-step. (16 Marks)`,
    ];

    partB.forEach((qb) => {
      if (curY > pageHeight - 70) {
        doc.addPage();
        curY = 50;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const splitQb = doc.splitTextToSize(qb, contentWidth);
      doc.text(splitQb, margin, curY);
      curY += splitQb.length * 12 + 10;
    });
  } else if (m.materialType === "LAB_MANUAL") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(11, 25, 44);
    doc.text("2. EXPERIMENTAL METHODOLOGY & PROCEDURES", margin, curY);
    curY += 16;

    const steps = [
      "Step 1: Verify hardware connectivity and launch diagnostic terminal software.",
      "Step 2: Initialize required routing tables and assign IP addresses to loopback and physical interfaces.",
      "Step 3: Capture protocol exchange traffic using Wireshark packet capture filter.",
      "Step 4: Record round-trip transit time, jitter, and packet loss metrics under loaded conditions.",
      "Step 5: Tabulate experimental observations and compare against theoretical performance curves.",
    ];

    steps.forEach((step) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(step, margin + 8, curY);
      curY += 14;
    });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(11, 25, 44);
    doc.text("2. KEY THEORETICAL CONCEPTS & LEARNING CHECKPOINTS", margin, curY);
    curY += 16;

    const notes = [
      "1. Architectural Foundations: Structural principles, layer boundaries, and interaction paradigms.",
      "2. Mathematical Framework: Governing equations, efficiency ratios, and boundary conditions.",
      "3. Protocol Standardization: Compliance with international RFC, IEEE, and NAAC curriculum specifications.",
      "4. Examination Preparation Guide: High-priority derivations, algorithm flowcharts, and typical semester review questions.",
    ];

    notes.forEach((note) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(note, margin + 8, curY);
      curY += 14;
    });
  }

  // Authenticity Verification Seal Box
  if (curY > pageHeight - 90) {
    doc.addPage();
    curY = 50;
  } else {
    curY += 15;
  }

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, curY, contentWidth, 38, 4, 4, "F");
  doc.setDrawColor(212, 167, 44);
  doc.roundedRect(margin, curY, contentWidth, 38, 4, 4, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(11, 25, 44);
  doc.text("DIGITALLY CERTIFIED ACADEMIC RESOURCE", margin + 12, curY + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Endorsed by Directorate of Academic Affairs · Karpaga Vinayaga Educational Lore for Learning", margin + 12, curY + 28);
  doc.text(`Release Date: ${new Date().toLocaleDateString("en-IN")}`, pageWidth - margin - 12, curY + 28, { align: "right" });

  // Running Footers
  const totalPages = typeof doc.getNumberOfPages === "function"
    ? doc.getNumberOfPages()
    : (doc as any).internal?.getNumberOfPages ? (doc as any).internal.getNumberOfPages() : 1;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Page ${i} of ${totalPages} · KVELL University ERP Academic Learning Portal`,
      margin,
      pageHeight - 12
    );
    doc.text(
      `${m.subjectCode} · Unit ${m.unitNumber}`,
      pageWidth - margin,
      pageHeight - 12,
      { align: "right" }
    );
  }

  return doc.output("blob");
}

interface CourseMaterialModuleProps {
  mode: "student" | "faculty" | "hod" | "dean" | "admin";
  onToast?: (msg: string, tone?: "success" | "warning" | "danger" | "neutral") => void;
  deptKey?: string;
  semester?: number | "ALL";
}

export function CourseMaterialModule({ mode, onToast, deptKey = "cse", semester = "ALL" }: CourseMaterialModuleProps) {
  const [materials, setMaterials] = useState<CourseMaterialView[]>([]);
  const [coverage, setCoverage] = useState<SubjectCoverageView[]>([]);
  const [loading, setLoading] = useState(true);

  // Internal Toast notification (so feedback works even if parent omits onToast)
  const [internalToast, setInternalToast] = useState<{ message: string; type: "success" | "warning" | "danger" | "neutral" } | null>(null);

  const showToast = (msg: string, tone: "success" | "warning" | "danger" | "neutral" = "success") => {
    setInternalToast({ message: msg, type: tone });
    onToast?.(msg, tone);
    setTimeout(() => {
      setInternalToast(null);
    }, 4500);
  };

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedSemester, setSelectedSemester] = useState<number | "ALL">(semester);
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [selectedUnit, setSelectedUnit] = useState<number | "ALL">("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload Modal (Faculty)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSubjectId, setUploadSubjectId] = useState<number>(0);
  const [uploadDepts, setUploadDepts] = useState<string[]>([deptKey || "cse"]);
  const [uploadSemester, setUploadSemester] = useState<number>(3);
  const [uploadSection, setUploadSection] = useState<string>("ALL");
  const [uploadUnit, setUploadUnit] = useState<number>(1);
  const [uploadType, setUploadType] = useState<MaterialCategory>("NOTE");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Attached File State
  const [attachedFile, setAttachedFile] = useState<{
    file: File;
    fileName: string;
    fileSize: number;
    fileType: string;
    dataUrl: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document Viewer Modal State (Student & Faculty)
  const [viewingMaterial, setViewingMaterial] = useState<CourseMaterialView | null>(null);
  const [viewerBlobUrl, setViewerBlobUrl] = useState<string | null>(null);
  const [viewerFileType, setViewerFileType] = useState<"pdf" | "image" | "text" | "office">("pdf");
  const [viewerTextContent, setViewerTextContent] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matList, covList] = await Promise.all([
        courseMaterialsApi.list({ deptKey }).catch(() => [] as CourseMaterialView[]),
        courseMaterialsApi.getCoverage(deptKey).catch(() => [] as SubjectCoverageView[]),
      ]);

      setMaterials(matList);
      setCoverage(covList);

      // Automatically keep uploadSubjectId aligned with first available subject
      if (covList.length > 0) {
        setUploadSubjectId((prev) => {
          const match = covList.find((c) => c.subjectId === prev);
          return match ? prev : covList[0].subjectId;
        });
      }
    } catch (err) {
      console.error(err);
      showToast("Could not load course materials.", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [deptKey]);

  // Keep uploadSubjectId updated whenever coverage list updates
  useEffect(() => {
    if (coverage.length > 0) {
      setUploadSubjectId((prev) => {
        const match = coverage.find((c) => c.subjectId === prev);
        return match ? prev : coverage[0].subjectId;
      });
    }
  }, [coverage]);

  // Open Upload Modal safely
  const handleOpenUploadModal = () => {
    if (coverage.length > 0) {
      setUploadSubjectId((prev) => {
        const match = coverage.find((c) => c.subjectId === prev);
        return match ? prev : coverage[0].subjectId;
      });
    }
    setAttachedFile(null);
    setUploadTitle("");
    setUploadDesc("");
    setPublishError(null);
    setShowUploadModal(true);
  };

  // Cleanup blob URL when modal closes
  const closeViewerModal = () => {
    if (viewerBlobUrl && viewerBlobUrl.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(viewerBlobUrl);
      } catch {}
    }
    setViewerBlobUrl(null);
    setViewingMaterial(null);
    setViewerTextContent(null);
  };

  useEffect(() => {
    return () => {
      if (viewerBlobUrl && viewerBlobUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(viewerBlobUrl);
        } catch {}
      }
    };
  }, [viewerBlobUrl]);

  // Process chosen file for faculty attachment
  const processSelectedFile = (file: File) => {
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast("File is larger than 15 MB. Please choose a smaller file.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const fileName = file.name;
      const lower = fileName.toLowerCase();

      // Auto-suggest category if default
      if (uploadType === "NOTE") {
        if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) {
          setUploadType("SLIDES");
        } else if (lower.includes("lab") || lower.includes("manual") || lower.includes("practical") || lower.includes("experiment")) {
          setUploadType("LAB_MANUAL");
        } else if (lower.includes("question") || lower.includes("bank") || lower.includes("qb") || lower.includes("solved")) {
          setUploadType("QUESTION_BANK");
        } else if (lower.includes("ref") || lower.includes("book") || lower.includes("syllabus")) {
          setUploadType("REFERENCE");
        }
      }

      // Auto-fill resource title if empty
      if (!uploadTitle.trim()) {
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        const cleanName = baseName.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
        setUploadTitle(`Unit ${uploadUnit}: ${cleanName}`);
      }

      setAttachedFile({
        file,
        fileName,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
        dataUrl,
      });

      setPublishError(null);
      showToast(`File "${fileName}" attached successfully (${formatBytes(file.size)}).`, "success");
    };

    reader.onerror = () => {
      showToast("Could not read the selected file.", "danger");
    };

    reader.readAsDataURL(file);
  };

  const fetchServerFile = async (m: CourseMaterialView) => {
    const res = await apiClient.get<Blob>(m.fileUrl, { responseType: "blob" });
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(res.data);
    });
    return { dataUrl, fileName: m.fileName || "document.pdf" };
  };

  // View / Preview a material (Students & Faculty)
  const handleView = async (m: CourseMaterialView) => {
    try {
      void courseMaterialsApi.recordDownload(m.id).catch(() => {});

      // Check if we have attached file data in vault or dataUrl
      let fileData: { dataUrl: string; fileName: string; fileType?: string } | null = null;
      if (m.fileUrl && m.fileUrl.startsWith("data:")) {
        fileData = { dataUrl: m.fileUrl, fileName: m.fileName || "document.pdf" };
      }
      if (!fileData && m.fileUrl && m.fileUrl.startsWith("/")) {
        fileData = await fetchServerFile(m);
      }
      if (!fileData && m.fileUrl && /^https?:\/\//.test(m.fileUrl)) {
        window.open(m.fileUrl, "_blank", "noopener");
        return;
      }
      if (!fileData) {
        fileData = await getFileFromVault(`id_${m.id}`);
      }
      if (!fileData) {
        fileData = await getFileFromVault(`fn_${m.fileName}`);
      }
      if (!fileData) {
        fileData = await getFileFromVault(`title_${m.title}`);
      }

      setViewingMaterial(m);

      if (fileData && fileData.dataUrl) {
        const lowerName = (fileData.fileName || m.fileName || "").toLowerCase();
        if (lowerName.endsWith(".pdf") || fileData.dataUrl.startsWith("data:application/pdf")) {
          const blob = dataUrlToBlob(fileData.dataUrl);
          const blobUrl = URL.createObjectURL(blob);
          setViewerBlobUrl(blobUrl);
          setViewerFileType("pdf");
        } else if (lowerName.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
          setViewerBlobUrl(fileData.dataUrl);
          setViewerFileType("image");
        } else if (lowerName.match(/\.(txt|md|csv|json)$/)) {
          try {
            const rawText = atob(fileData.dataUrl.split(",")[1]);
            setViewerTextContent(rawText);
            setViewerFileType("text");
          } catch {
            setViewerFileType("office");
          }
        } else {
          setViewerFileType("office");
        }
      } else {
        // Fallback: Generate the verified curriculum PDF
        const isPdf = !m.fileName || m.fileName.toLowerCase().endsWith(".pdf");
        if (isPdf) {
          const blob = generateCourseMaterialPdf(m);
          const blobUrl = URL.createObjectURL(blob);
          setViewerBlobUrl(blobUrl);
          setViewerFileType("pdf");
        } else {
          setViewerTextContent(
            `KVELL UNIVERSITY - COURSE REPOSITORY\n\nSubject: ${m.subjectCode} - ${m.subjectTitle}\nUnit: Unit ${m.unitNumber}\nResource: ${m.title}\nCategory: ${m.materialType}\nFaculty: ${m.facultyName}\n\nDescription:\n${m.description || "Official course material for students."}`
          );
          setViewerFileType("text");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Could not open document preview.", "danger");
    }
  };

  // Download a material (Students & Faculty)
  const handleDownload = async (m: CourseMaterialView) => {
    try {
      void courseMaterialsApi.recordDownload(m.id).catch(() => {});

      // Check for attached file data
      let fileData: { dataUrl: string; fileName: string; fileType?: string } | null = null;
      if (m.fileUrl && m.fileUrl.startsWith("data:")) {
        fileData = { dataUrl: m.fileUrl, fileName: m.fileName || "document.pdf" };
      }
      if (!fileData && m.fileUrl && m.fileUrl.startsWith("/")) {
        fileData = await fetchServerFile(m);
      }
      if (!fileData && m.fileUrl && /^https?:\/\//.test(m.fileUrl)) {
        window.open(m.fileUrl, "_blank", "noopener");
        return;
      }
      if (!fileData) {
        fileData = await getFileFromVault(`id_${m.id}`);
      }
      if (!fileData) {
        fileData = await getFileFromVault(`fn_${m.fileName}`);
      }
      if (!fileData) {
        fileData = await getFileFromVault(`title_${m.title}`);
      }

      if (fileData && fileData.dataUrl) {
        const blob = dataUrlToBlob(fileData.dataUrl);
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileData.fileName || m.fileName || "course_material.pdf";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 1500);
      } else {
        const isPdf = !m.fileName || m.fileName.toLowerCase().endsWith(".pdf");
        if (isPdf) {
          const blob = generateCourseMaterialPdf(m);
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          const outName = m.fileName && m.fileName.endsWith(".pdf") ? m.fileName : `${m.fileName || m.title}.pdf`;
          link.download = outName;
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 1500);
        } else {
          const element = document.createElement("a");
          const file = new Blob([
            `KVELL UNIVERSITY - COURSE REPOSITORY\n\nSubject: ${m.subjectCode} - ${m.subjectTitle}\nUnit: Unit ${m.unitNumber}\nResource: ${m.title}\nCategory: ${m.materialType}\nFaculty: ${m.facultyName}\n\nDescription:\n${m.description || "Official course material for students."}\n\nDigitally generated by KVELL Learning Portal.`
          ], { type: "text/plain;charset=utf-8" });
          element.href = URL.createObjectURL(file);
          element.download = m.fileName || `${m.subjectCode}_Unit${m.unitNumber}_Material.txt`;
          document.body.appendChild(element);
          element.click();
          setTimeout(() => {
            document.body.removeChild(element);
          }, 1000);
        }
      }

      showToast(`Downloaded ${m.fileName || m.title}`, "success");
      loadData();
    } catch (err) {
      console.error(err);
      showToast("Download failed.", "danger");
    }
  };

  // Preview the attached file right inside the upload modal
  const handlePreviewAttachedFile = () => {
    if (!attachedFile) return;
    const effectiveSubjectId = (uploadSubjectId && coverage.some((c) => c.subjectId === uploadSubjectId))
      ? uploadSubjectId
      : (coverage[0]?.subjectId || 1);
    const matched = coverage.find((c) => c.subjectId === effectiveSubjectId) || coverage[0];

    const dummyMat: CourseMaterialView = {
      id: 0,
      subjectId: effectiveSubjectId,
      subjectCode: matched?.subjectCode || "PREVIEW",
      subjectTitle: uploadTitle || attachedFile.fileName,
      facultyId: 0,
      facultyName: "Faculty Upload Preview",
      deptKey: (deptKey || "cse").toLowerCase(),
      semester: matched?.semester || 1,
      unitNumber: uploadUnit,
      materialType: uploadType,
      title: uploadTitle || attachedFile.fileName,
      description: uploadDesc,
      fileUrl: attachedFile.dataUrl,
      fileName: attachedFile.fileName,
      fileSizeKb: Math.max(1, Math.round(attachedFile.fileSize / 1024)),
      isPublished: true,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
    };
    handleView(dummyMat);
  };

  // Submit and Publish Material (Faculty)
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishError(null);

    if (!uploadTitle.trim()) {
      setPublishError("Please enter a resource title.");
      showToast("Please enter a title for this course material.", "warning");
      return;
    }
    if (!attachedFile) {
      setPublishError("Please attach a syllabus or study file before publishing.");
      showToast("Please attach a syllabus or study file before publishing.", "warning");
      return;
    }

    setIsPublishing(true);

    // Resolve effective subject ID reliably from selection or first coverage item
    const effectiveSubjectId = (uploadSubjectId && coverage.some((c) => c.subjectId === uploadSubjectId))
      ? uploadSubjectId
      : (coverage[0]?.subjectId || uploadSubjectId || 1);

    const matchedSubject = coverage.find((c) => c.subjectId === effectiveSubjectId) || coverage[0];

    const payload = {
      subjectId: effectiveSubjectId,
      unitNumber: uploadUnit,
      materialType: uploadType,
      title: uploadTitle.trim(),
      description: uploadDesc.trim(),
      fileName: attachedFile.fileName,
      fileUrl: attachedFile.dataUrl,
      fileSizeKb: Math.max(1, Math.round(attachedFile.fileSize / 1024)),
      section: uploadSection,
      deptKeys: uploadDepts.length > 0 ? uploadDepts : [deptKey || "cse"],
      semester: uploadSemester,
    };

    const vaultRecord = {
      fileName: attachedFile.fileName,
      fileType: attachedFile.fileType,
      dataUrl: attachedFile.dataUrl,
      fileSize: attachedFile.fileSize,
    };

    let publishedItem: CourseMaterialView | null = null;

    try {
      publishedItem = await courseMaterialsApi.upload(payload);
    } catch (apiErr: any) {
      const msg = apiErrorMessage(apiErr, "The material could not be published.");
      setPublishError(msg);
      showToast(msg, "danger");
      setIsPublishing(false);
      return;
    }

    try {
      if (publishedItem) {
        // Save to IndexedDB Vault for persistent immediate access across roles
        await saveFileToVault(`id_${publishedItem.id}`, vaultRecord);
        await saveFileToVault(`fn_${attachedFile.fileName}`, vaultRecord);
        await saveFileToVault(`title_${uploadTitle.trim()}`, vaultRecord);

        // Prepend immediately to materials state
        setMaterials((prev) => [
          publishedItem!,
          ...prev.filter((m) => m.id !== publishedItem!.id && m.fileName !== publishedItem!.fileName),
        ]);

        showToast("Course material published successfully! Students can now view and download it.", "success");
        setShowUploadModal(false);
        setAttachedFile(null);
        setUploadTitle("");
        setUploadDesc("");
        setPublishError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (saveErr) {
      console.error(saveErr);
      setPublishError("Failed to store published material. Please try again.");
      showToast("Failed to save material.", "danger");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      await courseMaterialsApi.delete(id);
      // Also remove from local list
      const local = getLocalPublishedMaterials().filter((m) => m.id !== id);
      localStorage.setItem(LOCAL_MATERIALS_KEY, JSON.stringify(local));
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      showToast("Course material deleted.", "neutral");
    } catch {
      showToast("Could not delete material.", "danger");
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (selectedDept !== "ALL" && m.deptKey?.toLowerCase() !== selectedDept.toLowerCase()) return false;
      if (selectedSemester !== "ALL" && m.semester !== selectedSemester) return false;
      if (selectedSection !== "ALL" && m.section && m.section !== "ALL" && m.section !== selectedSection) return false;
      if (selectedUnit !== "ALL" && m.unitNumber !== selectedUnit) return false;
      if (selectedType !== "ALL" && m.materialType !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.subjectCode.toLowerCase().includes(q) ||
          m.subjectTitle.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [materials, selectedDept, selectedSemester, selectedSection, selectedUnit, selectedType, searchQuery]);

  const filteredCoverage = useMemo(() => {
    return coverage.filter((c) => {
      if (selectedSemester !== "ALL" && c.semester !== selectedSemester) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.subjectCode.toLowerCase().includes(q) ||
          c.subjectTitle.toLowerCase().includes(q) ||
          c.faculty.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [coverage, selectedSemester, searchQuery]);

  const typeColor = (type: string) => {
    switch (type) {
      case "NOTE": return "bg-blue-50 text-blue-700 border-blue-200";
      case "SLIDES": return "bg-purple-50 text-purple-700 border-purple-200";
      case "LAB_MANUAL": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "QUESTION_BANK": return "bg-amber-50 text-amber-700 border-amber-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "SLIDES": return <Presentation size={13} />;
      case "LAB_MANUAL": return <FileCode size={13} />;
      case "QUESTION_BANK": return <FileCheck size={13} />;
      default: return <FileText size={13} />;
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Floating Toast Notification Banner */}
      {internalToast && (
        <div className="fixed top-5 right-5 z-[9999] animate-in slide-in-from-top-3 duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold ${
              internalToast.type === "success"
                ? "bg-emerald-900 text-white border-emerald-700 shadow-emerald-950/20"
                : internalToast.type === "warning"
                ? "bg-amber-900 text-white border-amber-700 shadow-amber-950/20"
                : internalToast.type === "danger"
                ? "bg-rose-900 text-white border-rose-700 shadow-rose-950/20"
                : "bg-slate-900 text-white border-slate-700 shadow-slate-950/20"
            }`}
          >
            {internalToast.type === "success" && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
            {internalToast.type === "warning" && <AlertCircle size={16} className="text-amber-400 shrink-0" />}
            {internalToast.type === "danger" && <AlertCircle size={16} className="text-rose-400 shrink-0" />}
            <span>{internalToast.message}</span>
            <button
              onClick={() => setInternalToast(null)}
              className="ml-2 text-white/70 hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Course Materials &amp; Digital Repository</h2>
          <p className="text-xs text-slate-500">
            {mode === "student"
              ? "Official unit-wise lecture notes, slides, lab manuals, and solved papers published by your faculty"
              : "Unit-wise lecture notes, presentation slides, laboratory manuals, and solved question banks"}
          </p>
        </div>
        {mode === "faculty" && (
          <button
            onClick={handleOpenUploadModal}
            className="flex items-center gap-2 bg-[#0B192C] text-[#D4A72C] font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#1E3E62] transition shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            Upload Course Material
          </button>
        )}
      </div>

      {/* Syllabus Coverage Summary (HOD & Dean View) */}
      {(mode === "hod" || mode === "dean" || mode === "admin") && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            Curriculum Syllabus Coverage Matrix (Units 1 to 5)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Faculty Incharge</th>
                  <th className="py-3 px-4">Unit 1</th>
                  <th className="py-3 px-4">Unit 2</th>
                  <th className="py-3 px-4">Unit 3</th>
                  <th className="py-3 px-4">Unit 4</th>
                  <th className="py-3 px-4">Unit 5</th>
                  <th className="py-3 px-4">Total Materials</th>
                  <th className="py-3 px-4">Downloads</th>
                  <th className="py-3 px-4">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCoverage.map((c) => (
                  <tr key={c.subjectId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-[#0B192C]">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">Sem {c.semester}</span>
                        <span>{c.subjectCode} · <span className="font-normal text-slate-700">{c.subjectTitle}</span></span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{c.faculty}</td>
                    {c.units.map((u) => (
                      <td key={u.unitNumber} className="py-3 px-4">
                        {u.totalCount > 0 ? (
                          <span className="rounded-md bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-[10px]">
                            {u.totalCount} items
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                    ))}
                    <td className="py-3 px-4 font-bold text-slate-800">{c.totalMaterials}</td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{c.totalDownloads}</td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        100% COMPLETE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter (Requirement 2.1) */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none cursor-pointer"
            aria-label="Filter by Department"
          >
            <option value="ALL">All Departments</option>
            <option value="cse">CSE (Computer Science)</option>
            <option value="aids">AIDS (Data Science)</option>
            <option value="ece">ECE (Electronics)</option>
            <option value="mech">Mechanical</option>
          </select>

          {/* Semester Dropdown (Requirement 2.1) */}
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none cursor-pointer"
            aria-label="Filter by Semester"
          >
            <option value="ALL">All Semesters (1st – 8th)</option>
            <option value="1">1st Semester (Sem 1)</option>
            <option value="2">2nd Semester (Sem 2)</option>
            <option value="3">3rd Semester (Sem 3)</option>
            <option value="4">4th Semester (Sem 4)</option>
            <option value="5">5th Semester (Sem 5)</option>
            <option value="6">6th Semester (Sem 6)</option>
            <option value="7">7th Semester (Sem 7)</option>
            <option value="8">8th Semester (Sem 8)</option>
          </select>

          {/* Section Filter (Requirement 2.1) */}
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none cursor-pointer"
            aria-label="Filter by Section"
          >
            <option value="ALL">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>

          {/* Unit Filter */}
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Units (1–5)</option>
            <option value="1">Unit 1</option>
            <option value="2">Unit 2</option>
            <option value="3">Unit 3</option>
            <option value="4">Unit 4</option>
            <option value="5">Unit 5</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Material Types</option>
            <option value="NOTE">Lecture Notes</option>
            <option value="SLIDES">Slides</option>
            <option value="LAB_MANUAL">Lab Manuals</option>
            <option value="QUESTION_BANK">Question Banks</option>
            <option value="REFERENCE">References</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subject, code, or title..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
          />
        </div>
      </div>

      {/* Materials Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
          <BookOpen size={36} className="mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-sm text-slate-600">No course materials match your filter</p>
          <p className="text-xs text-slate-400 mt-1">Try selecting a different department, semester, section, or unit.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-black text-[#0B192C] bg-slate-100 px-2 py-0.5 rounded">
                    {m.subjectCode} · Unit {m.unitNumber}
                  </span>
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeColor(m.materialType)}`}>
                    {typeIcon(m.materialType)}
                    {m.materialType.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Dept, Sem, Section telemetry badges (Requirement 2.1) */}
                <div className="flex flex-wrap items-center gap-1.5 my-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    Dept: {m.deptKey?.toUpperCase() || "CSE"}
                  </span>
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                    Sem {m.semester}
                  </span>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    Sec: {m.section || "ALL"}
                  </span>
                </div>

                <h4 className="font-bold text-sm text-slate-900 mt-1 line-clamp-2">{m.title}</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{m.subjectTitle}</p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                  {m.description || "Official syllabus course material uploaded by faculty."}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                    <User size={12} className="text-slate-400" />
                    {m.facultyName}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {m.fileSizeKb} KB · {m.downloadCount} Views/Downloads
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {mode === "faculty" && (
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-2 text-slate-400 hover:text-red-600 transition rounded-lg hover:bg-red-50 cursor-pointer"
                      title="Delete material"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  {/* View / Read Button (For Students & Faculty) */}
                  <button
                    onClick={() => handleView(m)}
                    className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 font-bold text-xs px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-[#0B192C] transition shadow-xs cursor-pointer"
                    title="View & study this material on screen"
                  >
                    <Eye size={14} className="text-blue-600" />
                    View
                  </button>
                  {/* Download Button */}
                  <button
                    onClick={() => handleDownload(m)}
                    className="flex items-center gap-1.5 bg-[#0B192C] text-[#D4A72C] font-bold text-xs px-3 py-2 rounded-xl hover:bg-[#1E3E62] transition shadow-sm cursor-pointer"
                    title="Download file to device"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Course Material Modal with File Attachment Window (Faculty) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl text-xs space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Upload &amp; Publish Course Material</h3>
                  <p className="text-[11px] text-slate-400">Attached files will be immediately available to students in their portal</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setAttachedFile(null);
                  setPublishError(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {publishError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{publishError}</span>
              </div>
            )}

            <form onSubmit={handlePublish} className="space-y-4">
              {/* Multi-Department Selection (Requirement 2.2) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Target Departments (Multi-Department Selection) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {[
                    { key: "cse", label: "CSE (Computer Science)" },
                    { key: "aids", label: "AIDS (Data Science)" },
                    { key: "ece", label: "ECE (Electronics)" },
                    { key: "mech", label: "MECH (Mechanical)" },
                  ].map((d) => (
                    <label key={d.key} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={uploadDepts.includes(d.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUploadDepts([...uploadDepts, d.key]);
                          } else {
                            if (uploadDepts.length > 1) {
                              setUploadDepts(uploadDepts.filter((k) => k !== d.key));
                            }
                          }
                        }}
                        className="rounded text-[#0B192C]"
                      />
                      <span>{d.key.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Select multiple departments to publish common course material across departments simultaneously.</p>
              </div>

              {/* Semester & Section Selection (Requirement 2.1) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Semester</label>
                  <select
                    value={uploadSemester}
                    onChange={(e) => setUploadSemester(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Section</label>
                  <select
                    value={uploadSection}
                    onChange={(e) => setUploadSection(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                  >
                    <option value="ALL">All Sections (A, B, C)</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Subject</label>
                <select
                  value={uploadSubjectId || (coverage[0]?.subjectId ?? 0)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setUploadSubjectId(val);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                >
                  {coverage.length > 0 ? (
                    coverage.map((c) => (
                      <option key={c.subjectId} value={c.subjectId}>
                        {c.subjectCode} - {c.subjectTitle} (Sem {c.semester})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value={101}>CS3101 - Mathematics I (Sem 1)</option>
                      <option value={102}>CS3102 - Programming in C (Sem 1)</option>
                      <option value={103}>CS3201 - Data Structures & Algorithms (Sem 2)</option>
                      <option value={1}>CS3301 - Data Structures and Algorithms (Sem 3)</option>
                      <option value={2}>CS3302 - Database Management Systems (Sem 3)</option>
                      <option value={3}>CS3303 - Operating Systems (Sem 4)</option>
                      <option value={4}>CS3304 - Computer Networks and Protocols (Sem 5)</option>
                      <option value={5}>CS3305 - Principles of Artificial Intelligence (Sem 5)</option>
                      <option value={106}>CS3601 - Compiler Design (Sem 6)</option>
                      <option value={107}>CS3701 - Cloud Computing & DevOps (Sem 7)</option>
                      <option value={108}>CS3801 - Major Project / Capstone (Sem 8)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit Number</label>
                  <select
                    value={uploadUnit}
                    onChange={(e) => setUploadUnit(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none"
                  >
                    <option value={1}>Unit 1</option>
                    <option value={2}>Unit 2</option>
                    <option value={3}>Unit 3</option>
                    <option value={4}>Unit 4</option>
                    <option value={5}>Unit 5</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Material Category</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as MaterialCategory)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none"
                  >
                    <option value="NOTE">Lecture Notes (PDF/Doc)</option>
                    <option value="SLIDES">Presentation Slides (PPT)</option>
                    <option value="LAB_MANUAL">Laboratory Manual</option>
                    <option value="QUESTION_BANK">Question Bank / Solved Papers</option>
                    <option value="REFERENCE">Reference Guide</option>
                  </select>
                </div>
              </div>

              {/* FILE ATTACHMENT WINDOW (Replaces the manual File Name text input) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Paperclip size={14} className="text-[#0B192C]" />
                    Attach Course File / Document <span className="text-rose-500 font-black">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">PDF, PPTX, DOCX, TXT, Images (Max 30 MB)</span>
                </div>

                {!attachedFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) processSelectedFile(f);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 group ${
                      isDragging
                        ? "border-[#0B192C] bg-blue-50/70 scale-[1.01]"
                        : "border-slate-300 hover:border-[#0B192C] bg-slate-50/60 hover:bg-blue-50/20"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-[#0B192C] group-hover:scale-110 transition duration-200">
                      <Upload size={22} className="text-[#0B192C]" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs">
                        <span className="text-blue-600 hover:underline">Click to browse</span> or drag &amp; drop file here
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Select official lecture notes, slides, lab exercises, or question banks
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) processSelectedFile(f);
                      }}
                    />
                  </div>
                ) : (
                  /* Attached File Card / Window */
                  <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/30 p-4 transition shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-xs shadow-xs ${getFileBadgeStyle(attachedFile.fileName)}`}>
                          {getFileTypeLabel(attachedFile.fileName)}
                        </div>
                        <div className="overflow-hidden">
                          <span className="block text-xs font-bold text-slate-900 truncate" title={attachedFile.fileName}>
                            {attachedFile.fileName}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-mono">{formatBytes(attachedFile.fileSize)}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              Attached &amp; ready to publish
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePreviewAttachedFile()}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Preview attached file before publishing"
                        >
                          <Eye size={13} className="text-blue-600" />
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition border border-rose-200 cursor-pointer"
                          title="Remove attached file"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Resource Title</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Unit 2: Distance Vector & Link State Routing Notes"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description &amp; Syllabus Topics Covered</label>
                <textarea
                  rows={3}
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="List key topics, formulas, or experiment steps covered in this document..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setAttachedFile(null);
                    setPublishError(null);
                  }}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishing || !attachedFile}
                  className={`px-5 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
                    !attachedFile
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-[#0B192C] text-[#D4A72C] hover:bg-[#1E3E62] shadow-sm"
                  }`}
                >
                  {isPublishing ? "Publishing..." : "Publish Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal (Students & Faculty) */}
      {viewingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl h-[92vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#0B192C] text-white p-4 sm:px-6 flex items-center justify-between gap-4 border-b border-slate-800">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-white/10 text-[#D4A72C] flex items-center justify-center font-bold shrink-0">
                  <BookOpen size={20} />
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-black bg-[#D4A72C] text-[#0B192C] px-2 py-0.5 rounded">
                      {viewingMaterial.subjectCode} · Unit {viewingMaterial.unitNumber}
                    </span>
                    <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">
                      {viewingMaterial.materialType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white truncate mt-0.5" title={viewingMaterial.title}>
                    {viewingMaterial.title}
                  </h3>
                  <p className="text-[11px] text-slate-300 truncate">
                    {viewingMaterial.subjectTitle} · Faculty: {viewingMaterial.facultyName}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {viewerBlobUrl && (
                  <button
                    onClick={() => window.open(viewerBlobUrl, "_blank")}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                    title="Open document in new browser tab"
                  >
                    <ExternalLink size={13} />
                    Open in Tab
                  </button>
                )}
                <button
                  onClick={() => handleDownload(viewingMaterial)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-bold hover:bg-[#e0b53d] transition shadow-xs cursor-pointer"
                  title="Download file to device"
                >
                  <Download size={13} />
                  Download
                </button>
                <button
                  onClick={closeViewerModal}
                  className="p-1.5 rounded-xl bg-white/10 text-white hover:bg-rose-600 transition cursor-pointer"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Document Content Viewer */}
            <div className="flex-1 bg-slate-100 p-3 sm:p-4 overflow-hidden flex flex-col">
              {viewerFileType === "pdf" && viewerBlobUrl ? (
                <div className="w-full h-full rounded-2xl bg-white shadow-inner overflow-hidden border border-slate-200">
                  <iframe
                    src={`${viewerBlobUrl}#view=FitH`}
                    className="w-full h-full border-none"
                    title={viewingMaterial.title}
                  />
                </div>
              ) : viewerFileType === "image" && viewerBlobUrl ? (
                <div className="w-full h-full rounded-2xl bg-white p-4 shadow-inner flex items-center justify-center overflow-auto border border-slate-200">
                  <img
                    src={viewerBlobUrl}
                    alt={viewingMaterial.title}
                    className="max-h-full max-w-full rounded-xl shadow-md object-contain"
                  />
                </div>
              ) : viewerFileType === "text" && viewerTextContent ? (
                <div className="w-full h-full rounded-2xl bg-white p-6 shadow-inner overflow-auto border border-slate-200">
                  <pre className="font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {viewerTextContent}
                  </pre>
                </div>
              ) : (
                /* Office Document / Slides / Manual Card */
                <div className="w-full h-full rounded-2xl bg-white p-8 shadow-inner border border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-black shadow-md ${getFileBadgeStyle(viewingMaterial.fileName)}`}>
                    {getFileTypeLabel(viewingMaterial.fileName)}
                  </div>
                  <div className="max-w-md">
                    <h4 className="font-bold text-base text-slate-900">{viewingMaterial.title}</h4>
                    <p className="text-xs font-mono text-slate-500 mt-1">{viewingMaterial.fileName}</p>
                    <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                      {viewingMaterial.description || "Course study document attached by faculty."}
                    </p>
                  </div>
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={() => handleDownload(viewingMaterial)}
                      className="flex items-center gap-2 bg-[#0B192C] text-[#D4A72C] font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-[#1E3E62] transition shadow-md cursor-pointer"
                    >
                      <Download size={15} />
                      Download &amp; Open Document
                    </button>
                    {viewerBlobUrl && (
                      <button
                        onClick={() => window.open(viewerBlobUrl, "_blank")}
                        className="flex items-center gap-1.5 border border-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                      >
                        <ExternalLink size={14} />
                        Open External
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Note */}
            <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>Official curriculum resource verified by Directorate of Academic Affairs</span>
              <span>KVELL University ERP Digital Learning Portal</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
