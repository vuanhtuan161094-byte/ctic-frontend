"use client";

import type { AuthSession } from "../lib/api";
import { DashboardShell } from "./DashboardShell";
import { QueryRuntime } from "./QueryRuntime";
import { UiRuntime } from "./UiRuntime";

export function AuthenticatedRuntime({
  session,
  onLogout,
}: {
  session: AuthSession;
  onLogout: () => void;
}) {
  return (
    <UiRuntime>
      <QueryRuntime>
        <DashboardShell session={session} onLogout={onLogout} />
      </QueryRuntime>
    </UiRuntime>
  );
}
