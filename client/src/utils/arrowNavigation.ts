import type React from "react";

/**
 * In a marks form, ↓ / ↑ move to the mark box below / above (same column) instead of changing the number.
 * Locked (disabled) boxes are skipped; at the end of a column it continues with the next / previous box.
 */
export function handleArrowNavigation(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const current = e.target;
  if (!(current instanceof HTMLInputElement) || current.type !== "number") return;
  e.preventDefault();

  const inputs = Array.from(e.currentTarget.querySelectorAll<HTMLInputElement>('input[type="number"]')).filter(
    (i) => !i.disabled && i.offsetParent !== null
  );
  const down = e.key === "ArrowDown";
  const from = current.getBoundingClientRect();
  const centerX = from.left + from.width / 2;

  let best: HTMLInputElement | null = null;
  let bestGap = Infinity;
  for (const input of inputs) {
    if (input === current) continue;
    const box = input.getBoundingClientRect();
    const sameColumn = Math.abs(box.left + box.width / 2 - centerX) < from.width;
    const gap = down ? box.top - from.top : from.top - box.top;
    if (sameColumn && gap > 2 && gap < bestGap) {
      best = input;
      bestGap = gap;
    }
  }
  if (!best) {
    const index = inputs.indexOf(current);
    best = inputs[index + (down ? 1 : -1)] ?? null;
  }
  if (best) {
    best.focus();
    best.select();
    best.scrollIntoView({ block: "nearest" });
  }
}
