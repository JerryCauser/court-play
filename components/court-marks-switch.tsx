"use client";

import { SHOWN_COURT_MARKS } from "@/lib/court-marks";
import { useCourtMarks } from "./court-marks-provider";
import { useI18n } from "./i18n-provider";

// Two styles, or neither: pressing the active button again hides the marks.
export function CourtMarksSwitch() {
  const { t } = useI18n();
  const { marks, setMarks } = useCourtMarks();
  return (
    <div className="segmented small" role="group" aria-label={t("courtMarks")} title={t("courtMarks")}>
      {SHOWN_COURT_MARKS.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={m === marks}
          aria-label={t(`marks_${m}`)}
          title={t(`marks_${m}`)}
          onClick={() => setMarks(m === marks ? "none" : m)}
        >
          {t(`marksShort_${m}`)}
        </button>
      ))}
    </div>
  );
}
