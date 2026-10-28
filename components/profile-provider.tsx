"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Profile } from "@/lib/profile";
import { savePrefs } from "@/lib/save-prefs";
import { uuid } from "@/lib/uuid";

type ProfileData = { name: string; color: string; id?: string };

type Ctx = {
  profile: Profile | null;
  saveProfile: (data: ProfileData) => Promise<boolean>;
};

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ initial, children }: { initial: Profile | null; children: ReactNode }) {
  const [profile, setProfile] = useState(initial);

  const saveProfile = useCallback(
    async (data: ProfileData) => {
      const next: Profile = { id: data.id ?? profile?.id ?? uuid(), name: data.name, color: data.color };
      const ok = await savePrefs({ profile: next });
      if (ok) setProfile(next);
      return ok;
    },
    [profile],
  );

  const value = useMemo<Ctx>(() => ({ profile, saveProfile }), [profile, saveProfile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Ctx {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("ProfileProvider is missing");
  return ctx;
}
