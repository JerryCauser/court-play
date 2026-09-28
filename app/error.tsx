"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useI18n();
  return (
    <main className="page center">
      <h1>{t("error")}</h1>
      <div className="row">
        <button className="btn primary" type="button" onClick={() => retry()}>
          ↻
        </button>
        <Link href="/" className="btn">
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
