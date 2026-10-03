import { useState } from "react";

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
  { id: 1, openId: "KVELL2025CSE041", username: "KVELL2025CSE041", name: "Aarav Sharma", email: "aarav.sharma@students.kvell.edu", role: "user", portalRole: "Student", department: "Computer Science & Engineering", status: "ACTIVE" },
  { id: 2, openId: "KV-FAC-0012", username: "KV-FAC-0012", name: "Dr. Ananya Rao", email: "faculty.ananya@kvell.edu", role: "user", portalRole: "HOD", department: "Computer Science & Engineering", status: "ACTIVE" },
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
      useQuery: createQueryHook(() => [
        { id: 1, code: "CS601", name: "Deep Learning & Neural Networks", semester: "VI", section: "CSE A", studentCount: 64, averageScore: 82 },
        { id: 2, code: "CS602", name: "Compiler Design & Language Processors", semester: "VI", section: "CSE A", studentCount: 64, averageScore: 78 },
        { id: 3, code: "CS603", name: "Cloud Computing & Distributed Systems", semester: "VI", section: "CSE B", studentCount: 58, averageScore: 74 },
        { id: 4, code: "CS604", name: "Cyber Security & Cryptography", semester: "VI", section: "CSE B", studentCount: 58, averageScore: 85 },
      ]),
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
      useQuery: createQueryHook(() => [...adminUsersStore]),
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