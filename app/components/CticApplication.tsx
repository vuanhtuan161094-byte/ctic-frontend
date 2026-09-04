"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { lazy, Suspense, useEffect, useState } from "react";

import {
  type AuthSession,
  SESSION_STORAGE_KEY,
} from "../lib/api";
import {
  applyPlatformBrandingToDocument,
  PLATFORM_BRANDING,
} from "../lib/platform-branding";
import { DashboardShell } from "./DashboardShell";
import { LoginScreen } from "./LoginScreen";

dayjs.locale("vi");

const DevCertificationCaseVisualShowcase = import.meta.env.DEV
  ? lazy(() => import("./certification-case/CertificationCaseVisualShowcase").then((module) => ({ default: module.CertificationCaseVisualShowcase })))
  : null;

function ApplicationContent() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    applyPlatformBrandingToDocument();
  }, []);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      const rawSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

      if (rawSession) {
        try {
          setSession(JSON.parse(rawSession) as AuthSession);
        } catch {
          window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }

      setSessionReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      setSession(null);
    };

    window.addEventListener("ctic:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("ctic:unauthorized", handleUnauthorized);
    };
  }, []);

  const handleLogin = (newSession: AuthSession) => {
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(newSession),
    );
    setSession(newSession);
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
  };

  if (import.meta.env.DEV && window.location.pathname === "/__dev/certification-case-showcase" && DevCertificationCaseVisualShowcase) {
    return <Suspense fallback={<div className="app-loading" aria-label="Đang tải bản trình diễn" />}><DevCertificationCaseVisualShowcase /></Suspense>;
  }

  if (!sessionReady) {
    return <div className="app-loading" aria-label="Đang tải hệ thống" />;
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <DashboardShell session={session} onLogout={handleLogout} />;
}

export function CticApplication() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: PLATFORM_BRANDING.primaryColor,
          colorInfo: PLATFORM_BRANDING.primaryColor,
          colorSuccess: "#168451",
          colorWarning: "#c56a11",
          colorError: "#c83b3b",
          borderRadius: 10,
          fontFamily:
            'Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        },
        components: {
          Layout: {
            bodyBg: "#f2f6fb",
            headerBg: "#ffffff",
            siderBg: PLATFORM_BRANDING.darkColor,
          },
          Menu: {
            darkItemBg: PLATFORM_BRANDING.darkColor,
            darkItemSelectedBg: "#ffffff",
            darkItemSelectedColor: PLATFORM_BRANDING.primaryColor,
            darkItemHoverBg: PLATFORM_BRANDING.accentColor,
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AntdApp>
          <ApplicationContent />
        </AntdApp>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
