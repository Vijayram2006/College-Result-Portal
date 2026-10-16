export interface CurriculumSubject {
  code: string;
  title: string;
  department: string;
  deptKey: string;
  credits: number;
  category: "Core Mandatory" | "Professional Elective" | "Open Elective";
  semester: string;
  faculty: string;
}

export const departmentSubjectsCatalog: Record<string, { name: string; subjects: { code: string; title: string; credits: number; category: "Core Mandatory" | "Professional Elective" | "Open Elective" }[] }> = {
  aids: {
    name: "Artificial Intelligence & Data Science",
    subjects: [
      { code: "UC26C01T", title: "Induction & Professional English", credits: 3, category: "Core Mandatory" },
      { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, category: "Core Mandatory" },
      { code: "CY26C01I", title: "Engineering Chemistry", credits: 4, category: "Core Mandatory" },
      { code: "CS26C02T", title: "Programming in C", credits: 3, category: "Core Mandatory" },
      { code: "CS26N01I", title: "Programming Laboratory", credits: 3, category: "Core Mandatory" },
      { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, category: "Core Mandatory" },
    ],
  },
  bme: {
    name: "Biomedical Engineering",
    subjects: [
      { code: "EN26C01T", title: "Professional English", credits: 3, category: "Core Mandatory" },
      { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, category: "Core Mandatory" },
      { code: "PH26C01I", title: "Engineering Physics", credits: 4, category: "Core Mandatory" },
      { code: "EE26C01T", title: "Basic Electrical and Electronics Engineering", credits: 3, category: "Core Mandatory" },
      { code: "CS26C01I", title: "Problem Solving and Python Programming", credits: 3, category: "Core Mandatory" },
      { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, category: "Core Mandatory" },
    ],
  },
  biotech: {
    name: "Biotech",
    subjects: [
      { code: "EN26C01T", title: "Professional English", credits: 3, category: "Core Mandatory" },
      { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, category: "Core Mandatory" },
      { code: "PH26C01I", title: "Engineering Physics", credits: 4, category: "Core Mandatory" },
      { code: "BT26101T", title: "Introduction to Biotechnology & Biochemistry", credits: 3, category: "Core Mandatory" },
      { code: "CS26C01I", title: "Problem Solving and Python Programming", credits: 3, category: "Core Mandatory" },
      { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, category: "Core Mandatory" },
    ],
  },
  cse: {
    name: "Computer Science and Engineering",
    subjects: [
      { code: "UC26C01T", title: "Induction & Professional English", credits: 3, category: "Core Mandatory" },
      { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, category: "Core Mandatory" },
      { code: "CY26C01I", title: "Engineering Chemistry", credits: 4, category: "Core Mandatory" },
      { code: "CS26C02T", title: "Programming in C", credits: 3, category: "Core Mandatory" },
      { code: "CS26N01I", title: "Programming Laboratory", credits: 3, category: "Core Mandatory" },
      { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, category: "Core Mandatory" },
    ],
  },
  civil: {
    name: "CIVIL Engineering",
    subjects: [
      { code: "EN26C01T", title: "Professional English", credits: 3, category: "Core Mandatory" },
      { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, category: "Core Mandatory" },
      { code: "PH26C01I", title: "Engineering Physics", credits: 4, category: "Core Mandatory" },
      { code: "ME26C01T", title: "Engineering Graphics", credits: 3, category: "Core Mandatory" },
      { code: "CS26C01I", title: "Problem Solving and Python Programming", credits: 3, category: "Core Mandatory" },
      { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, category: "Core Mandatory" },
    ],
  },
  eee: {
    name: "EEE (Electrical and Electronics Engineering)",
    subjects: [
      { code: "EN26C01T", title: "Professional English", credits: 3, category: "Core Mandatory" },
      { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, category: "Core Mandatory" },
      { code: "PH26C01I", title: "Engineering Physics", credits: 4, category: "Core Mandatory" },
      { code: "EE26C01T", title: "Basic Electrical and Electronics Engineering", credits: 3, category: "Core Mandatory" },
      { code: "CS26C01I", title: "Problem Solving and Python Programming", credits: 3, category: "Core Mandatory" },
      { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, category: "Core Mandatory" },
    ],
  },
  ece: {
    name: "ECE (Electronics and Communication Engineering)",
    subjects: [
      { code: "EN26C01T", title: "Professional English", credits: 3, category: "Core Mandatory" },
      { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, category: "Core Mandatory" },
      { code: "PH26C01I", title: "Engineering Physics", credits: 4, category: "Core Mandatory" },
      { code: "EE26C01T", title: "Basic Electrical and Electronics Engineering", credits: 3, category: "Core Mandatory" },
      { code: "CS26CN01I", title: "Problem Solving and Python Programming", credits: 3, category: "Core Mandatory" },
      { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, category: "Core Mandatory" },
    ],
  },
  mech: {
    name: "Mechanical Engineering",
    subjects: [
      { code: "EN26C01T", title: "Professional English", credits: 3, category: "Core Mandatory" },
      { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, category: "Core Mandatory" },
      { code: "PH26C01I", title: "Engineering Physics", credits: 4, category: "Core Mandatory" },
      { code: "ME26C01T", title: "Engineering Graphics", credits: 3, category: "Core Mandatory" },
      { code: "CS26C01I", title: "Problem Solving and Python Programming", credits: 3, category: "Core Mandatory" },
      { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, category: "Core Mandatory" },
    ],
  },
  robotics: {
    name: "Robotics and Automation",
    subjects: [
      { code: "EN26C01T", title: "Professional English", credits: 3, category: "Core Mandatory" },
      { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, category: "Core Mandatory" },
      { code: "PH26C01I", title: "Engineering Physics", credits: 4, category: "Core Mandatory" },
      { code: "ME26C01T", title: "Engineering Graphics", credits: 3, category: "Core Mandatory" },
      { code: "CS26C01I", title: "Problem Solving and Python Programming", credits: 3, category: "Core Mandatory" },
      { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, category: "Core Mandatory" },
    ],
  },
  auto: {
    name: "Automobile Engineering",
    subjects: [
      { code: "EN26C01T", title: "Professional English", credits: 3, category: "Core Mandatory" },
      { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, category: "Core Mandatory" },
      { code: "PH26C01I", title: "Engineering Physics", credits: 4, category: "Core Mandatory" },
      { code: "ME26C01T", title: "Engineering Graphics", credits: 3, category: "Core Mandatory" },
      { code: "CS26C01I", title: "Problem Solving and Python Programming", credits: 3, category: "Core Mandatory" },
      { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, category: "Core Mandatory" },
    ],
  },
  mba: {
    name: "Master of Business Administration (MBA)",
    subjects: [
      { code: "MB26104T", title: "Legal Aspects of Business", credits: 3, category: "Core Mandatory" },
      { code: "MB26101T", title: "Management Principles and Organizational Behaviour", credits: 3, category: "Core Mandatory" },
      { code: "MB26108T", title: "Operations Management", credits: 3, category: "Core Mandatory" },
      { code: "MB26102T", title: "Managerial Economics", credits: 3, category: "Core Mandatory" },
      { code: "MB26103T", title: "Accounting for Management", credits: 3, category: "Core Mandatory" },
      { code: "MB26106T", title: "Marketing Management", credits: 3, category: "Core Mandatory" },
      { code: "MB26105T", title: "Information Management & Analytics", credits: 3, category: "Core Mandatory" },
    ],
  },
  mca: {
    name: "Master of Computer Applications (MCA)",
    subjects: [
      { code: "MC26101T", title: "Mathematical Foundations for Computer Applications", credits: 4, category: "Core Mandatory" },
      { code: "MC26102T", title: "Advanced Data Structures & Algorithms", credits: 4, category: "Core Mandatory" },
      { code: "MC26103T", title: "Advanced Operating Systems & Architecture", credits: 3, category: "Core Mandatory" },
      { code: "MC26104T", title: "Object Oriented Software Engineering", credits: 3, category: "Core Mandatory" },
      { code: "MC26105T", title: "Full Stack Web Development & Cloud Computing", credits: 3, category: "Core Mandatory" },
      { code: "MC26106P", title: "Data Structures & Algorithms Laboratory", credits: 2, category: "Core Mandatory" },
      { code: "MC26107P", title: "Full Stack Web Development Laboratory", credits: 2, category: "Core Mandatory" },
    ],
  },
};

// Flattened list of all curriculum subjects for Subjects management directory
export const allCurriculumSubjects = Object.entries(departmentSubjectsCatalog).flatMap(
  ([deptKey, deptObj]) =>
    deptObj.subjects.map((s, idx) => ({
      id: `${deptKey}_${s.code}`,
      code: s.code,
      title: s.title,
      category: s.category,
      credits: s.credits,
      department: deptObj.name,
      deptKey,
      semester: "Semester I",
      academicYear: "2026-27",
      faculty: "Faculty In-Charge",
      status: "COE FINALIZED" as const,
      studentsEnrolled: deptKey === "aids" ? 50 : 0,
    }))
);
