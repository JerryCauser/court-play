import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { CourtMarksProvider } from "@/components/court-marks-provider";
import { Footer } from "@/components/footer";
import { HapticFeedback } from "@/components/haptic-feedback";
import { HapticsProvider } from "@/components/haptics-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { PrefsSync } from "@/components/prefs-sync";
import { ProfileProvider } from "@/components/profile-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { WakeLock } from "@/components/wake-lock";
import { DEFAULT_COURT_MARKS } from "@/lib/court-marks";
import { pickLocale } from "@/lib/i18n";
import { PREFS_COOKIE, parsePrefsCookie } from "@/lib/prefs";
import { themeBgCss } from "@/lib/theme";
import "./globals.css";

// theme-color and the manifest link follow the active theme, so ThemeProvider renders them.
export const metadata: Metadata = {
  title: "Court Play",
  description: "Fair match rotation for badminton, tennis and other court games",
  applicationName: "Court Play",
  appleWebApp: { capable: true, title: "Court Play", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const stored = parsePrefsCookie(cookieStore.get(PREFS_COOKIE)?.value);
  const prefs = stored?.prefs ?? {};
  const locale = pickLocale(prefs.lang, headerList.get("accept-language"));
  const theme = prefs.theme ?? "system";
  return (
    <html lang={locale} data-theme={theme === "system" ? undefined : theme}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeBgCss() }} />
      </head>
      <body>
        <ThemeProvider initial={theme}>
          <I18nProvider initial={locale}>
            <ProfileProvider initial={prefs.profile ?? null}>
              <CourtMarksProvider initial={prefs.marks ?? DEFAULT_COURT_MARKS}>
                <HapticsProvider initial={prefs.haptics ?? false}>
                  {children}
                  <Footer />
                  <PrefsSync prefs={prefs} issuedAt={stored?.at ?? 0} />
                  <HapticFeedback />
                  <WakeLock />
                </HapticsProvider>
              </CourtMarksProvider>
            </ProfileProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
