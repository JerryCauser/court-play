export const percent = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
export const ratio = (a: number, b: number) => (a + b > 0 ? a / (a + b) : null);
