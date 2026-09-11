"use client";

import type { AuthSession } from "../lib/api";
import { DashboardShell } from "./DashboardShell";
import { QueryRuntime } from "./QueryRuntime";

export function AuthenticatedRuntime({
  session,
  onLogout,
}: {
  session: AuthSession;
  onLogout: () => void;
}) {
  return (
    <QueryRuntime>
      <DashboardShell session={session} onLogout={onLogout} />
    </QueryRuntime>
  );
}
