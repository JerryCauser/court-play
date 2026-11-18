"use client";

import { useId } from "react";
import { catchesUp, DEFAULT_MAX_STREAK, maxStreak, STREAK_CHOICES, type PlayPrefs } from "@/lib/play-prefs";
import { useI18n } from "./i18n-provider";

type Props = {
  value: PlayPrefs;
  onChange: (next: PlayPrefs) => void;
};

export function PlayPrefsFields({ value, onChange }: Props) {
  const { t } = useI18n();
  const id = useId();

  return (
    <div className="play-prefs">
      <div className="play-prefs-field">
        <span className="muted" id={`${id}-streak`}>
          {t("maxStreak")}
        </span>
        <div className="segmented" role="group" aria-labelledby={`${id}-streak`}>
          {STREAK_CHOICES.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={maxStreak(value) === n}
              onClick={() => onChange({ ...value, maxStreak: n === DEFAULT_MAX_STREAK ? undefined : n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <label className="toggle">
        <span className="toggle-text">{t("catchUp")}</span>
        <input
          className="switch"
          type="checkbox"
          role="switch"
          checked={catchesUp(value)}
          onChange={(e) => onChange({ ...value, catchUp: e.target.checked })}
        />
      </label>
    </div>
  );
}
