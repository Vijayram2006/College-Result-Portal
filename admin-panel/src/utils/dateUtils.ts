/**
 * Returns current real local timestamp formatted as YYYY-MM-DD HH:mm or YYYY-MM-DD HH:mm:ss
 */
export const getRealLocalTimestamp = (includeSeconds = false): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return includeSeconds
    ? `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    : `${year}-${month}-${day} ${hours}:${minutes}`;
};
