import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { I18nProvider } from "@/components/I18n";
import { LangSwitch } from "@/components/LangSwitch";
import { LANG_COOKIE, pickLang } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Court Play",
  description: "Fair match rotation for badminton, tennis and other court games",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#14161a" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = pickLang((await cookies()).get(LANG_COOKIE)?.value, (await headers()).get("accept-language"));
  return (
    <html lang={lang}>
      <body>
        <I18nProvider initial={lang}>
          <header className="topbar">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden="true" />
              Court Play
            </Link>
            <LangSwitch />
          </header>
          <main className="container">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
