/**
 * Aadhar Card Validation Engine using Verhoeff Checksum Algorithm
 * Standard UIDAI Checksum implementation to eliminate typographical mistakes
 */

// Multiplication table
const d: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

// Permutation table
const p: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function validateAadharNumber(rawAadhar: string): { isValid: boolean; message: string } {
  const clean = String(rawAadhar || "").replace(/[\s-]/g, "");

  if (!clean) {
    return { isValid: false, message: "Aadhar card number is required." };
  }

  if (clean.length !== 12) {
    return { isValid: false, message: `Aadhar card must be 12 digits (currently ${clean.length} digits).` };
  }

  if (!/^\d{12}$/.test(clean)) {
    return { isValid: false, message: "Aadhar card must contain only numbers." };
  }

  // Check for repeated single digit pattern like 000000000000 or 111111111111
  if (/^(\d)\1{11}$/.test(clean)) {
    return { isValid: false, message: "Invalid Aadhar: repeated identical digits are not allowed." };
  }

  // Verhoeff checksum algorithm check
  let c = 0;
  const invertedArray = clean.split("").reverse().map(Number);

  for (let i = 0; i < invertedArray.length; i++) {
    c = d[c][p[i % 8][invertedArray[i]]];
  }

  if (c !== 0) {
    // If Verhoeff fails, return warning but indicate formatting validity
    return { isValid: false, message: "Invalid Aadhar number: Verhoeff checksum failed." };
  }

  return { isValid: true, message: "Valid 12-digit UIDAI Aadhar card format." };
}

export function formatAadharInput(raw: string): string {
  const clean = raw.replace(/\D/g, "").slice(0, 12);
  const parts = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.substring(i, i + 4));
  }
  return parts.join(" ");
}

export function maskAadharNumber(raw: string): string {
  const clean = String(raw || "").replace(/[\s-]/g, "");
  if (clean.length < 4) return clean;
  const lastFour = clean.slice(-4);
  return `XXXX-XXXX-${lastFour}`;
}
