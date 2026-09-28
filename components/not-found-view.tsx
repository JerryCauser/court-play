"use client";

import Link from "next/link";
import { useI18n } from "./i18n-provider";

export function NotFoundView() {
  const { t } = useI18n();
  return (
    <main className="page center">
      <h1>{t("notFound")}</h1>
      <p className="muted">{t("notFoundHint")}</p>
      <Link href="/" className="btn primary">
        {t("home")}
      </Link>
    </main>
  );
}
