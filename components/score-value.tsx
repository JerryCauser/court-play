"use client";

import { useState } from "react";
import { useI18n } from "./i18n-provider";

type Props = {
  value: number;
  onChange: (value: number) => void;
};

export function ScoreValue({ value, onChange }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = Number.parseInt(draft, 10);
    if (Number.isFinite(parsed)) onChange(Math.min(999, Math.max(0, parsed)));
    setDraft(null);
  };

  if (draft === null) {
    return (
      <button
        className="score-value"
        type="button"
        aria-label={t("editScore")}
        title={t("editScore")}
        onClick={() => setDraft(String(value))}
      >
        {value}
      </button>
    );
  }

  return (
    <input
      className="score-value score-input"
      type="number"
      inputMode="numeric"
      min={0}
      max={999}
      value={draft}
      aria-label={t("editScore")}
      autoFocus
      onFocus={(e) => e.target.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setDraft(null);
      }}
    />
  );
}
