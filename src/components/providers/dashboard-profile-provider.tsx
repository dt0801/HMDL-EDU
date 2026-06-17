"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, type ReactNode } from "react";

import type { Profile } from "@/types/database.types";

const DashboardProfileContext = createContext<Profile | null>(null);

export function DashboardProfileProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.setQueryData(["current-profile"], profile);
  }, [profile, queryClient]);

  return (
    <DashboardProfileContext.Provider value={profile}>
      {children}
    </DashboardProfileContext.Provider>
  );
}

export function useDashboardProfile() {
  const profile = useContext(DashboardProfileContext);
  if (!profile) {
    throw new Error("useDashboardProfile must be used inside DashboardProfileProvider");
  }
  return profile;
}
