"use client";

import type { AuthSession } from "../lib/api";
import { LoginScreen } from "./LoginScreen";
import { UiRuntime } from "./UiRuntime";

export function LoginRuntime({
  onLogin,
}: {
  onLogin: (session: AuthSession) => void;
}) {
  return (
    <UiRuntime>
      <LoginScreen onLogin={onLogin} />
    </UiRuntime>
  );
}
