import * as XLSX from "xlsx";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Saves a workbook as a real .xlsx download. The file is built in memory, typed as Excel, and handed to the
 * browser through a link that carries the file name, so it is saved as "<name>.xlsx" (not a nameless file).
 */
export function downloadWorkbook(workbook: Parameters<typeof XLSX.write>[0], fileName: string) {
  const safe = fileName.replace(/[\\/:*?"<>|]+/g, "_").replace(/_+/g, "_");
  const name = /\.xlsx$/i.test(safe) ? safe : `${safe}.xlsx`;
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const url = URL.createObjectURL(new Blob([data], { type: XLSX_MIME }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking too early can cancel the download or lose its name; keep the file available for a minute
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
