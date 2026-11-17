export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 2;
export const WEIGHT_STEP = 0.05;
export const DEFAULT_WEIGHT = 1;

// Points share maps linearly onto weight: 25% → 0, 50% → 1, 75% → 2.
const SHARE_LOW = 0.25;
const SHARE_HIGH = 0.75;

export function clampWeight(v: number): number {
  const stepped = Math.round(v / WEIGHT_STEP) * WEIGHT_STEP;
  return Number(Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, stepped)).toFixed(2));
}

export function isWeight(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= MIN_WEIGHT && v <= MAX_WEIGHT;
}

export function weightFromShare(share: number): number {
  return clampWeight(((share - SHARE_LOW) / (SHARE_HIGH - SHARE_LOW)) * MAX_WEIGHT);
}

export function playerWeight(player: { weight?: number }): number {
  return player.weight ?? DEFAULT_WEIGHT;
}

export function formatWeight(v: number): string {
  return v.toFixed(2);
}
