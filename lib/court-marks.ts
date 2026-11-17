// How a game card shows which service court each player stands in.
// none: not shown; tag: R/L joined to the front of the chip; halves: the team block
// split into two court halves.
export const COURT_MARKS = ["none", "tag", "halves"] as const;
export type CourtMarks = (typeof COURT_MARKS)[number];

export const DEFAULT_COURT_MARKS: CourtMarks = "none";

/** Styles the footer switch offers; pressing the active one again turns marks off. */
export const SHOWN_COURT_MARKS = ["tag", "halves"] as const satisfies readonly CourtMarks[];

export function isCourtMarks(v: unknown): v is CourtMarks {
  return typeof v === "string" && (COURT_MARKS as readonly string[]).includes(v);
}
