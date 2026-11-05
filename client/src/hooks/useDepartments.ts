import { useEffect, useState } from "react";
import { apiClient } from "../services/api";

/** A department of the signed-in user's college, from the server (never a fixed list). */
export interface DepartmentOption {
  key: string;
  code: string;
  name: string;
}

let cache: DepartmentOption[] | null = null;

/** The departments for filters and pickers; the label is "CODE – Full name" (for example "ADS – Artificial Intelligence & Data Science"). */
export function useDepartments(): DepartmentOption[] {
  const [list, setList] = useState<DepartmentOption[]>(cache ?? []);
  useEffect(() => {
    if (cache) return;
    apiClient
      .get<DepartmentOption[]>("/departments")
      .then((r) => {
        cache = r.data;
        setList(r.data);
      })
      .catch(() => setList([]));
  }, []);
  return list;
}

export const departmentLabel = (d: DepartmentOption) => `${d.code} – ${d.name}`;

/** The short code of a department key ("aids" -> "ADS"), from the loaded list; until it loads, the key in capitals. */
export function deptCode(key?: string | null): string {
  if (!key) return "";
  const found = cache?.find((d) => d.key === key.toLowerCase());
  return found ? found.code : key.toUpperCase().replace(/^AIDS$/, "ADS");
}
