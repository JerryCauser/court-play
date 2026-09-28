import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { cookies, headers } from "next/headers";
import { I18nProvider } from "@/components/i18n-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { LOCALE_COOKIE, pickLocale } from "@/lib/i18n";
import { THEME_COOKIE, isTheme } from "@/lib/theme";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

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
  const locale = pickLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerList.get("accept-language"));
  const stored = cookieStore.get(THEME_COOKIE)?.value;
  const theme = isTheme(stored) ? stored : "system";
  return (
    <html lang={locale} className={geist.variable} data-theme={theme === "system" ? undefined : theme}>
      <body>
        <ThemeProvider initial={theme}>
          <I18nProvider initial={locale}>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
