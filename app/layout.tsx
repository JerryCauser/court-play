import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { Footer } from "@/components/footer";
import { I18nProvider } from "@/components/i18n-provider";
import { PrefsSync } from "@/components/prefs-sync";
import { ProfileProvider } from "@/components/profile-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { pickLocale } from "@/lib/i18n";
import { PREFS_COOKIE, parsePrefsCookie } from "@/lib/prefs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Court Play",
  description: "Fair match rotation for badminton, tennis and other court games",
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
      <body>
        <ThemeProvider initial={theme}>
          <I18nProvider initial={locale}>
            <ProfileProvider initial={prefs.profile ?? null}>
              {children}
              <Footer />
              <PrefsSync prefs={prefs} issuedAt={stored?.at ?? 0} />
            </ProfileProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
