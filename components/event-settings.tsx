"use client";

import { eventFormat, eventSport } from "@/lib/event";
import { saveEventDefaults } from "@/lib/event-defaults";
import { courtCount } from "@/lib/scheduler";
import { defaultFormat, formatsFor, SPORTS, type FormatId } from "@/lib/scoring";
import { MAX_COURTS } from "@/lib/validate";
import type { EventState } from "@/lib/types";
import { formatLabel } from "./game-card";
import { useI18n } from "./i18n-provider";
import { Modal } from "./modal";

type Props = {
  open: boolean;
  onClose: () => void;
  state: EventState;
  update: (fn: (s: EventState) => EventState) => void;
};

export function EventSettings({ open, onClose, state, update }: Props) {
  const { t } = useI18n();
  const sport = eventSport(state);
  const courts = courtCount(state);
  const setCourts = (n: number) => change((s) => (courtCount(s) === n ? s : { ...s, courts: n }));

  // `update` runs the function once, synchronously, so remembering the choice here is safe.
  const change = (fn: (s: EventState) => EventState) =>
    update((s) => {
      const next = fn(s);
      if (next !== s) saveEventDefaults(next);
      return next;
    });

  return (
    <Modal open={open} title={t("eventSettings")} onClose={onClose}>
      <div className="settings">
        <span className="muted">{t("sport")}</span>
        <div className="segmented" role="group" aria-label={t("sport")}>
          {SPORTS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={sport === id}
              onClick={() => change((s) => (eventSport(s) === id ? s : { ...s, sport: id, format: defaultFormat(id) }))}
            >
              {t(`sport_${id}`)}
            </button>
          ))}
        </div>
        <span className="muted">{t("format")}</span>
        <div className="segmented" role="group" aria-label={t("format")}>
          {([1, 2] as const).map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={state.teamSize === size}
              onClick={() => change((s) => (s.teamSize === size ? s : { ...s, teamSize: size }))}
            >
              {size === 1 ? t("singles") : t("doubles")}
            </button>
          ))}
        </div>
        <span className="muted">{t("courts")}</span>
        <div className="stepper" role="group" aria-label={t("courts")}>
          <button className="btn icon" type="button" aria-label="−" disabled={courts <= 1} onClick={() => setCourts(courts - 1)}>
            −
          </button>
          <span className="stepper-value">{courts}</span>
          <button
            className="btn icon"
            type="button"
            aria-label="+"
            disabled={courts >= MAX_COURTS}
            onClick={() => setCourts(courts + 1)}
          >
            +
          </button>
        </div>
        <label className="muted" htmlFor="event-scoring">
          {t("scoring")}
        </label>
        <select
          id="event-scoring"
          className="select"
          value={eventFormat(state)}
          onChange={(e) => {
            const format = e.target.value as FormatId;
            change((s) => (eventFormat(s) === format ? s : { ...s, format }));
          }}
        >
          {formatsFor(sport).map((id) => (
            <option key={id} value={id}>
              {t(formatLabel(id))}
            </option>
          ))}
        </select>
      </div>
      <label className="toggle">
        <span className="toggle-text">
          {t("autoBalance")}
          <span className="muted small">{t("autoBalanceHint")}</span>
        </span>
        <input
          className="switch"
          type="checkbox"
          role="switch"
          checked={state.balance ?? false}
          onChange={(e) => {
            const balance = e.target.checked;
            change((s) => ({ ...s, balance }));
          }}
        />
      </label>
      <button className="btn primary wide" type="button" data-autofocus onClick={onClose}>
        {t("done")}
      </button>
    </Modal>
  );
}
