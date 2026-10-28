"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "./i18n-provider";
import { Modal } from "./modal";
import { PlayerChip } from "./player-chip";
import { ProfileForm } from "./profile-form";
import { useProfile } from "./profile-provider";

export function ProfileButton() {
  const { t } = useI18n();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);

  if (profile) {
    return (
      <Link href="/me" className="profile-link" title={t("profile")}>
        <PlayerChip player={{ ...profile, active: true }} />
      </Link>
    );
  }

  return (
    <>
      <button className="btn small" type="button" onClick={() => setOpen(true)}>
        {t("introduce")}
      </button>
      <Modal open={open} title={t("introduce")} onClose={() => setOpen(false)}>
        <ProfileForm onSaved={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </Modal>
    </>
  );
}
