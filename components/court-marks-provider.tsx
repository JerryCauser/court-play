"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { CourtMarks } from "@/lib/court-marks";
import { savePrefs } from "@/lib/save-prefs";

type Ctx = { marks: CourtMarks; setMarks: (m: CourtMarks) => void };

const CourtMarksContext = createContext<Ctx | null>(null);

export function CourtMarksProvider({ initial, children }: { initial: CourtMarks; children: ReactNode }) {
  const [marks, setMarksState] = useState(initial);

  const setMarks = useCallback((m: CourtMarks) => {
    setMarksState(m);
    void savePrefs({ marks: m });
  }, []);

  const value = useMemo(() => ({ marks, setMarks }), [marks, setMarks]);
  return <CourtMarksContext.Provider value={value}>{children}</CourtMarksContext.Provider>;
}

export function useCourtMarks(): Ctx {
  const ctx = useContext(CourtMarksContext);
  if (!ctx) throw new Error("CourtMarksProvider is missing");
  return ctx;
}
