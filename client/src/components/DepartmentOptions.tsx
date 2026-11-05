import React from "react";
import { departmentLabel, useDepartments } from "../hooks/useDepartments";

/** The <option>s of a department dropdown, loaded from the server ("CODE – Full name"). */
export function DepartmentOptions({ allValue, allLabel = "All Departments" }: { allValue?: string; allLabel?: string }) {
  const departments = useDepartments();
  return (
    <>
      {allValue !== undefined && <option value={allValue}>{allLabel}</option>}
      {departments.map((d) => (
        <option key={d.key} value={d.key}>{departmentLabel(d)}</option>
      ))}
    </>
  );
}
