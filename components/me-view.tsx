"use client";

import Link from "next/link";
import { useI18n } from "./i18n-provider";
import { DataBackup } from "./data-backup";
import { ProfileForm } from "./profile-form";
import { ProfileId } from "./profile-id";
import { useProfile } from "./profile-provider";
import { ProfileStats } from "./profile-stats";

export function MeView() {
  const { t } = useI18n();
  const { profile } = useProfile();

  return (
    <main className="page">
      <header className="topbar">
        <Link href="/" className="btn ghost small">
          ../{t("back")}
        </Link>
      </header>

      <section className="card">
        <h2>{profile ? t("profile") : t("introduce")}</h2>
        <ProfileForm key={profile?.id ?? "new"} />
      </section>

      {profile && (
        <section className="card">
          <h2>{t("myStats")}</h2>
          <ProfileStats profile={profile} />
        </section>
      )}

      <section className="card">
        <h2>{t("data")}</h2>
        {profile && <ProfileId profile={profile} />}
        <DataBackup />
      </section>
    </main>
  );
}
