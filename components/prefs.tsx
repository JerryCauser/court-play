import { LangSwitch } from "./lang-switch";
import { ThemeSwitch } from "./theme-switch";

export function Prefs() {
  return (
    <div className="prefs">
      <ThemeSwitch />
      <LangSwitch />
    </div>
  );
}
