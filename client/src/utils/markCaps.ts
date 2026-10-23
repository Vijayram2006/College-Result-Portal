/** R2026: each Part B question (11-15) carries 13 marks and Part C (16) 15. */
export const questionCap = (qNum: number) => (qNum === 16 ? 15 : 13);

type Sub = { i: number; ii: number; iii: number };

/** A sub-division takes only what is left of the question's marks after the other two sub-divisions of the same choice. */
export const fitSub = (sub: Sub, key: keyof Sub, val: number, qNum: number) => {
  const others = (["i", "ii", "iii"] as const).filter((k) => k !== key).reduce((s, k) => s + (Number(sub[k]) || 0), 0);
  return Math.max(0, Math.min(Number(val) || 0, questionCap(qNum) - others));
};
