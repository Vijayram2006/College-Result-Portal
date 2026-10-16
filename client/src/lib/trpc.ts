import { useState } from "react";
import { aidsSem1Students } from "../data/aidsStudents";
import { cseSem1Students, bmeSem1Students } from "../data/dummyMarksData";

const createQueryHook = (dataSupplier: () => any) => {
  return (input?: any, options?: any) => {
    const [data, setData] = useState(dataSupplier());
    const refetch = async () => {
      const fresh = dataSupplier();
      setData(fresh);
      return { data: fresh };
    };
    return { data, refetch, isPending: false, isLoading: false };
  };
};

const createMutationHook = (actionSupplier?: (val?: any) => any) => {
  return (options?: { onSuccess?: (data?: any) => void; onError?: (err?: any) => void }) => {
    const [isPending, setIsPending] = useState(false);
    const mutate = (payload?: any) => {
      setIsPending(true);
      try {
        const res = actionSupplier ? actionSupplier(payload) : payload;
        setIsPending(false);
        if (options?.onSuccess) options.onSuccess(res);
      } catch (err) {
        setIsPending(false);
        if (options?.onError) options.onError(err);
      }
    };
    return { mutate, isPending };
  };
};

let adminUsersStore: any[] = [
  { id: 2, openId: "KV-FAC-0012", username: "KV-FAC-0012", name: "Dr. Ananya Rao", email: "faculty.ananya@kvell.edu", role: "user", portalRole: "HOD", department: "Faculty of Engineering", status: "ACTIVE" },
  { id: 3, openId: "ADMIN", username: "ADMIN", name: "System Controller", email: "admin.kvell@kvell.edu", role: "admin", portalRole: "Admin", department: "University Administration", status: "ACTIVE" },
];

const baseTrpc: any = {
  notifications: {
    list: {
      useQuery: createQueryHook(() => [
        {
          id: 1,
          title: "Semester End Results Published",
          message: "May 2025 Semester End Examination Results for B.Tech IV & VI Semesters are published.",
          isRead: 0,
        },
        {
          id: 2,
          title: "Grade Verification Request",
          message: "HOD CSE has requested verification for CS601 Deep Learning marks.",
          isRead: 0,
        },
      ]),
    },
    markRead: {
      useMutation: createMutationHook(),
    },
  },
  subjects: {
    list: {
      useQuery: createQueryHook(() => {
        try {
          const raw = localStorage.getItem("kvell_admin_subjects");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.map((s, idx) => ({
                id: s.id || idx + 1,
                code: s.code,
                name: s.title || s.name,
                semester: s.semester || "Semester I",
                section: "CSE A",
                studentCount: s.studentsEnrolled || 0,
                averageScore: 0,
              }));
            }
          }
        } catch {}
        return [];
      }),
    },
    create: {
      useMutation: createMutationHook((val) => ({ id: Date.now(), ...val })),
    },
  },
  reports: {
    rows: {
      useQuery: createQueryHook(() => []),
    },
  },
  marks: {
    saveDraft: {
      useMutation: createMutationHook(),
    },
    submitForReview: {
      useMutation: createMutationHook(),
    },
    publishResults: {
      useMutation: createMutationHook(() => ({ count: 1 })),
    },
  },
  review: {
    requests: {
      useQuery: createQueryHook(() => []),
    },
    reviewSubmission: {
      useMutation: createMutationHook(),
    },
  },
  admin: {
    users: {
      useQuery: createQueryHook(() => {
        const list = [...adminUsersStore];
        let studentsSource: any[] = [
          ...aidsSem1Students.map((s) => ({
            regNo: s.regNo,
            name: s.name,
            email: `${s.regNo.toLowerCase()}@students.kvell.edu`,
            deptName: "Artificial Intelligence & Data Science",
            status: "ACTIVE",
          })),
          ...cseSem1Students.map((s) => ({
            regNo: s.regNo,
            name: s.name,
            email: s.email,
            deptName: "Computer Science and Engineering",
            status: "ACTIVE",
          })),
          ...bmeSem1Students.map((s) => ({
            regNo: s.regNo,
            name: s.name,
            email: s.email,
            deptName: "Biomedical Engineering",
            status: "ACTIVE",
          })),
        ];

        try {
          const rawStudents = localStorage.getItem("kvell_students");
          if (rawStudents) {
            const st = JSON.parse(rawStudents);
            if (Array.isArray(st) && st.length > 0) {
              const matched = st.filter((s: any) => {
                const k = String(s.deptKey || "").toLowerCase();
                const d = String(s.deptName || "").toLowerCase();
                return (
                  k === "aids" || k === "cse" || k === "bme" ||
                  d.includes("artificial intelligence") || d.includes("aids") ||
                  d.includes("computer science") || d.includes("biomedical")
                );
              });
              if (matched.length > 0) {
                studentsSource = matched;
              }
            }
          }
        } catch {}

        studentsSource.forEach((s: any, idx: number) => {
          list.push({
            id: 1000 + idx,
            openId: s.regNo,
            username: s.regNo,
            name: s.name,
            email: s.email || `${s.regNo.toLowerCase()}@students.kvell.edu`,
            role: "user",
            portalRole: "Student",
            department: s.deptName || "Artificial Intelligence & Data Science",
            status: s.status || "ACTIVE",
          });
        });

        return list;
      }),
    },
    auditLogs: {
      useQuery: createQueryHook(() => []),
    },
    createUser: {
      useMutation: createMutationHook((payload) => {
        const newId = adminUsersStore.length ? Math.max(...adminUsersStore.map((u) => u.id)) + 1 : 1;
        const newUser = {
          id: newId,
          openId: payload?.username || `USER${newId}`,
          username: payload?.username || `USER${newId}`,
          name: payload?.name || "New User",
          email: payload?.email || "user@kvell.edu",
          role: payload?.portalRole === "Admin" ? "admin" : "user",
          portalRole: payload?.portalRole || "Faculty",
          department: payload?.department || "Computer Science & Engineering",
          status: (payload?.status || "ACTIVE").toUpperCase(),
        };
        adminUsersStore = [newUser, ...adminUsersStore];
        return { user: newUser };
      }),
    },
    updateUserRole: {
      useMutation: createMutationHook((payload) => {
        const target = adminUsersStore.find((u) => u.id === payload?.userId);
        if (target) {
          target.portalRole = payload?.portalRole || payload?.role;
          target.role = payload?.role === "Admin" ? "admin" : "user";
        }
        return { success: true };
      }),
    },
    updateUserStatus: {
      useMutation: createMutationHook((payload) => {
        const target = adminUsersStore.find((u) => u.id === payload?.userId);
        if (target) {
          target.status = (payload?.status || "ACTIVE").toUpperCase();
        }
        return { status: target?.status || "ACTIVE" };
      }),
    },
    updateUserPassword: {
      useMutation: createMutationHook(() => ({ success: true })),
    },
    deleteUser: {
      useMutation: createMutationHook((payload) => {
        if (payload?.userId) {
          adminUsersStore = adminUsersStore.filter((u) => u.id !== payload.userId);
        }
        return { success: true };
      }),
    },
    deleteAllMarks: {
      useMutation: createMutationHook(() => ({ success: true })),
    },
  },
};

// Safe Proxy wrapper so undefined procedures never crash the React render tree
const createProxyHandler = (obj: any): any => {
  return new Proxy(obj, {
    get(target, prop) {
      if (typeof prop === "symbol") return target[prop];
      if (prop in target) {
        const value = target[prop];
        if (typeof value === "object" && value !== null && !("useQuery" in value) && !("useMutation" in value)) {
          return createProxyHandler(value);
        }
        return value;
      }
      if (prop === "useQuery") {
        return createQueryHook(() => []);
      }
      if (prop === "useMutation") {
        return createMutationHook();
      }
      const fallbackObj = {};
      target[prop] = fallbackObj;
      return createProxyHandler(fallbackObj);
    },
  });
};

export const trpc: any = createProxyHandler(baseTrpc);