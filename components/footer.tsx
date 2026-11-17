import { CourtMarksSwitch } from "./court-marks-switch";
import { LangSwitch } from "./lang-switch";
import { ThemeSwitch } from "./theme-switch";

export function Footer() {
  return (
    <footer className="footer">
      <ThemeSwitch />
      <LangSwitch />
      <CourtMarksSwitch />
    </footer>
  );
}
