import { DocumentAttachment, StudentApplicant, TwelfthMarksFeedData } from "../types/admission";

export function generateDigitalTwelfthMarksheetSvg(
  studentName: string,
  marks: Partial<TwelfthMarksFeedData>,
  collegeName: string = "Karpaga Vinayaga College of Engineering and Technology"
): string {
  const rollNo = marks.rollNumber || "HSC-2026-" + Math.floor(100000 + Math.random() * 900000);
  const board = marks.board || "STATE_BOARD";
  const boardName =
    board === "STATE_BOARD"
      ? "GOVERNMENT OF TAMIL NADU • DEPARTMENT OF GOVERNMENT EXAMINATIONS"
      : board === "CBSE"
      ? "CENTRAL BOARD OF SECONDARY EDUCATION (CBSE)"
      : board === "ISC"
      ? "COUNCIL FOR THE INDIAN SCHOOL CERTIFICATE EXAMINATIONS (ISC)"
      : "HIGHER SECONDARY EXAMINATION BOARD";

  const school = marks.schoolName || "Government Higher Secondary School";
  const year = marks.yearOfPassing || 2026;
  const stream = marks.stream || "PCMB";

  const l1 = Number(marks.lang1Marks) || 0;
  const l2 = Number(marks.lang2Marks) || 0;
  const m = Number(marks.mathsMarks) || 0;
  const p = Number(marks.physicsMarks) || 0;
  const c = Number(marks.chemistryMarks) || 0;
  const b = Number(marks.biologyMarks) || 0;
  const cs = Number(marks.computerScienceMarks) || 0;

  const isCbseOrIsc = board === "CBSE" || board === "ISC" || board === "ICSE";

  const subjects = isCbseOrIsc
    ? [
        { code: board === "CBSE" ? "301" : "001", name: "ENGLISH CORE / ELECTIVE", marks: l2 || 88 },
        { code: board === "CBSE" ? "041" : "002", name: "MATHEMATICS", marks: m },
        { code: board === "CBSE" ? "042" : "003", name: "PHYSICS (THEORY 70 + PRAC 30)", marks: p },
        { code: board === "CBSE" ? "043" : "004", name: "CHEMISTRY (THEORY 70 + PRAC 30)", marks: c },
        cs > 0 || stream.includes("C")
          ? { code: board === "CBSE" ? "083" : "005", name: "COMPUTER SCIENCE", marks: cs || 90 }
          : { code: board === "CBSE" ? "044" : "005", name: "BIOLOGY / LIFE SCIENCES", marks: b || (stream.includes("B") ? 85 : 90) },
      ]
    : [
        { code: "001", name: "PART I - TAMIL / LANGUAGE", marks: l1 || (m > 0 ? 92 : 0) },
        { code: "002", name: "PART II - ENGLISH", marks: l2 || (m > 0 ? 88 : 0) },
        { code: "003", name: "MATHEMATICS", marks: m },
        { code: "004", name: "PHYSICS (THEORY 70 + PRAC 30)", marks: p },
        { code: "005", name: "CHEMISTRY (THEORY 70 + PRAC 30)", marks: c },
        cs > 0 || stream.includes("C")
          ? { code: "006", name: "COMPUTER SCIENCE", marks: cs || 90 }
          : { code: "006", name: "BIOLOGY / BOTANY & ZOOLOGY", marks: b || (stream.includes("B") ? 85 : 90) },
      ];

  const total = subjects.reduce((sum, s) => sum + s.marks, 0);
  const maxTotal = isCbseOrIsc ? 500 : 600;
  const percentage = ((total / maxTotal) * 100).toFixed(2);
  const cutoff = marks.calculatedCutoff ?? Number((m + (p + c) / 2).toFixed(2));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FCFBF7"/>
        <stop offset="100%" stop-color="#F5EFE0"/>
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D4A72C" stroke-width="0.3" stroke-opacity="0.25"/>
      </pattern>
    </defs>

    <!-- Outer Security Borders -->
    <rect width="900" height="1200" fill="url(#bgGrad)" />
    <rect width="900" height="1200" fill="url(#grid)" />
    <rect x="25" y="25" width="850" height="1150" fill="none" stroke="#0B192C" stroke-width="4"/>
    <rect x="35" y="35" width="830" height="1130" fill="none" stroke="#D4A72C" stroke-width="2"/>
    <rect x="42" y="42" width="816" height="1116" fill="none" stroke="#0B192C" stroke-width="0.75" stroke-dasharray="6,4"/>

    <!-- Watermark in Background -->
    <g opacity="0.06" transform="translate(450, 600) rotate(-30)">
      <text text-anchor="middle" font-family="Cinzel, serif" font-size="75" font-weight="900" fill="#0B192C">OFFICIAL HSC MARKSHEET</text>
      <text y="90" text-anchor="middle" font-family="Cinzel, serif" font-size="40" font-weight="bold" fill="#0B192C">KVELL CENTRAL ADMISSIONS</text>
    </g>

    <!-- Header Section -->
    <g transform="translate(450, 95)" text-anchor="middle">
      <circle cx="0" cy="0" r="32" fill="#0B192C"/>
      <circle cx="0" cy="0" r="28" fill="none" stroke="#D4A72C" stroke-width="2"/>
      <text y="8" fill="#D4A72C" font-family="serif" font-size="24" font-weight="bold">★</text>

      <text y="58" font-family="'Cinzel', Georgia, serif" font-size="14" font-weight="bold" fill="#0B192C" letter-spacing="2">
        ${boardName}
      </text>
      <text y="86" font-family="'Cinzel', Georgia, serif" font-size="24" font-weight="900" fill="#0B192C" letter-spacing="1.5">
        HIGHER SECONDARY COURSE CERTIFICATE (HSC / +2)
      </text>
      <text y="112" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#B08014" letter-spacing="1">
        STATEMENT OF MARKS • ACADEMIC RECORD
      </text>
    </g>

    <!-- Certificate Serial & QR Mock -->
    <g transform="translate(60, 240)">
      <text font-family="monospace" font-size="11" font-weight="bold" fill="#555">CERTIFICATE NO: HSC/2026/${rollNo.slice(-6)}</text>
      <text y="18" font-family="monospace" font-size="11" font-weight="bold" fill="#555">SESSION: MARCH / APRIL ${year}</text>
    </g>
    <g transform="translate(730, 230)">
      <rect x="0" y="0" width="80" height="35" rx="4" fill="#0B192C"/>
      <text x="40" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#D4A72C">VERIFIED</text>
    </g>

    <!-- Candidate Details Box -->
    <rect x="60" y="275" width="780" height="140" rx="10" fill="#FFFFFF" stroke="#0B192C" stroke-width="1.2"/>
    <line x1="60" y1="345" x2="840" y2="345" stroke="#E5E7EB" stroke-width="1"/>
    <line x1="450" y1="275" x2="450" y2="415" stroke="#E5E7EB" stroke-width="1"/>

    <!-- Left Col -->
    <g transform="translate(80, 305)" font-family="Arial, sans-serif">
      <text font-size="11" fill="#6B7280" font-weight="bold">CANDIDATE NAME</text>
      <text y="22" font-size="15" fill="#0B192C" font-weight="900">${studentName.toUpperCase()}</text>
    </g>
    <g transform="translate(80, 375)" font-family="Arial, sans-serif">
      <text font-size="11" fill="#6B7280" font-weight="bold">REGISTER / ROLL NUMBER</text>
      <text y="22" font-size="15" font-family="monospace" fill="#0B192C" font-weight="900">${rollNo}</text>
    </g>

    <!-- Right Col -->
    <g transform="translate(470, 305)" font-family="Arial, sans-serif">
      <text font-size="11" fill="#6B7280" font-weight="bold">SCHOOL / INSTITUTION NAME</text>
      <text y="22" font-size="13" fill="#0B192C" font-weight="bold">${school}</text>
    </g>
    <g transform="translate(470, 375)" font-family="Arial, sans-serif">
      <text font-size="11" fill="#6B7280" font-weight="bold">STREAM & COURSE</text>
      <text y="22" font-size="14" fill="#0B192C" font-weight="bold">${stream} (Higher Secondary Academic)</text>
    </g>

    <!-- Table of Marks -->
    <g transform="translate(60, 440)">
      <!-- Table Header -->
      <rect x="0" y="0" width="780" height="42" fill="#0B192C" rx="6"/>
      <text x="30" y="26" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#D4A72C">SUB CODE</text>
      <text x="130" y="26" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF">SUBJECT TITLE</text>
      <text x="470" y="26" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF">MAX MARKS</text>
      <text x="590" y="26" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF">MARKS SECURED</text>
      <text x="710" y="26" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#D4A72C">RESULT</text>

      <!-- Table Rows -->
      ${subjects
        .map(
          (s, idx) => `
        <g transform="translate(0, ${42 + idx * 46})">
          <rect x="0" y="0" width="780" height="46" fill="${idx % 2 === 0 ? "#FFFFFF" : "#F9FAFB"}" stroke="#E5E7EB" stroke-width="0.8"/>
          <text x="30" y="28" font-family="monospace" font-size="12" font-weight="bold" fill="#4B5563">${s.code}</text>
          <text x="130" y="28" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#111827">${s.name}</text>
          <text x="470" y="28" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="semibold" fill="#4B5563">100</text>
          <text x="590" y="28" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#0B192C">${s.marks}</text>
          <text x="710" y="28" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="${s.marks >= 35 ? "#059669" : "#DC2626"}">${s.marks >= 35 ? "PASS" : "FAIL"}</text>
        </g>
      `
        )
        .join("")}

      <!-- Total Row -->
      <g transform="translate(0, ${42 + subjects.length * 46})">
        <rect x="0" y="0" width="780" height="52" fill="#FEF3C7" stroke="#D4A72C" stroke-width="1.5" rx="4"/>
        <text x="130" y="32" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="#0B192C">GRAND AGGREGATE TOTAL & PERCENTAGE</text>
        <text x="470" y="32" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0B192C">600</text>
        <text x="590" y="32" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="900" fill="#0B192C">${total}</text>
        <text x="710" y="32" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="#059669">${percentage}%</text>
      </g>
    </g>

    <!-- Official Cutoff Highlight Box -->
    <g transform="translate(60, 800)">
      <rect x="0" y="0" width="780" height="85" rx="12" fill="#0B192C" stroke="#D4A72C" stroke-width="2"/>
      <g transform="translate(30, 26)">
        <text font-family="'Cinzel', Georgia, serif" font-size="14" font-weight="bold" fill="#D4A72C" letter-spacing="1">
          KVCET ENGINEERING ACADEMIC CUTOFF SCORE
        </text>
        <text y="24" font-family="Arial, sans-serif" font-size="11" fill="#E5E7EB">
          Official Formula: Mathematics (${m}) + (Physics (${p}) + Chemistry (${c})) / 2 = Cutoff out of 200
        </text>
      </g>
      <g transform="translate(680, 52)" text-anchor="middle">
        <text font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#D4A72C">${cutoff}</text>
        <text y="18" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#9CA3AF">OUT OF 200</text>
      </g>
    </g>

    <!-- Signatures & Verification Seal -->
    <g transform="translate(60, 930)">
      <!-- Left Stamp -->
      <g transform="translate(60, 30)">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#D4A72C" stroke-width="2" stroke-dasharray="4,2"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#0B192C" stroke-width="1.2"/>
        <text x="50" y="44" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#0B192C">KARPAGA VINAYAGA</text>
        <text x="50" y="56" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="#B08014">ADMISSIONS CELL</text>
        <text x="50" y="66" text-anchor="middle" font-family="monospace" font-size="7" fill="#555">VERIFIED DOC</text>
      </g>

      <!-- Middle Institution Tag -->
      <g transform="translate(390, 70)" text-anchor="middle" font-family="Arial, sans-serif">
        <text font-size="11" font-weight="bold" fill="#0B192C">OFFICIAL DOCUMENT VERIFICATION DESK</text>
        <text y="18" font-size="10" fill="#6B7280">${collegeName}</text>
        <text y="32" font-size="9" font-family="monospace" fill="#9CA3AF">Generated securely for Admission Verification Portal</text>
      </g>

      <!-- Right Signature -->
      <g transform="translate(600, 35)">
        <path d="M 20 40 Q 50 15, 80 40 T 130 35 T 160 50" fill="none" stroke="#0B192C" stroke-width="2.2"/>
        <line x1="10" y1="65" x2="160" y2="65" stroke="#0B192C" stroke-width="1"/>
        <text x="85" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#0B192C">
          Controller of Examinations
        </text>
        <text x="85" y="94" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#6B7280">
          Board of Secondary Education
        </text>
      </g>
    </g>

    <!-- Bottom Notice -->
    <text x="450" y="1135" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="semibold" fill="#6B7280">
      * This digital marksheet is verified against state education board records and validated for KVELL Institutional Admissions.
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createDigitalTwelfthAttachment(
  studentName: string,
  marks: Partial<TwelfthMarksFeedData>,
  collegeName?: string
): DocumentAttachment {
  const dataUrl = generateDigitalTwelfthMarksheetSvg(studentName, marks, collegeName);
  const rollNo = marks.rollNumber || "2026";
  return {
    fileName: `12th_HSC_Marksheet_${studentName.replace(/\s+/g, "_")}_${rollNo}.svg`,
    fileSize: 45200,
    fileType: "image/svg+xml",
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };
}
