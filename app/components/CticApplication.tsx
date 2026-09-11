"use client";

import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";

import {
  type AuthSession,
  SESSION_STORAGE_KEY,
} from "../lib/api";
import { applyPlatformBrandingToDocument } from "../lib/platform-branding";

const LoginRuntime = lazy(() =>
  import("./LoginRuntime").then((module) => ({ default: module.LoginRuntime })),
);

const AuthenticatedRuntime = lazy(() =>
  import("./AuthenticatedRuntime").then((module) => ({ default: module.AuthenticatedRuntime })),
);

const DevQueryRuntime = import.meta.env.DEV
  ? lazy(() => import("./QueryRuntime").then((module) => ({ default: module.QueryRuntime })))
  : null;

const DevUiRuntime = import.meta.env.DEV
  ? lazy(() => import("./UiRuntime").then((module) => ({ default: module.UiRuntime })))
  : null;

const DevCertificationCaseVisualShowcase = import.meta.env.DEV
  ? lazy(() => import("./certification-case/CertificationCaseVisualShowcase").then((module) => ({ default: module.CertificationCaseVisualShowcase })))
  : null;

const DevCapWorkspace = import.meta.env.DEV
  ? lazy(() => import("./certification-cap/DevCapWorkspace").then((module) => ({ default: module.DevCapWorkspace })))
  : null;

const DevDecisionWorkspace = import.meta.env.DEV
  ? lazy(() => import("./certification-decision/DevDecisionWorkspace").then((module) => ({ default: module.DevDecisionWorkspace })))
  : null;
const DevCertificateWorkspace = import.meta.env.DEV
  ? lazy(() => import("./certificate-workspace/DevCertificateWorkspace").then(module => ({ default: module.DevCertificateWorkspace })))
  : null;
const DevTechnicalReviewWorkspace = import.meta.env.DEV
  ? lazy(() => import("./certification-review/DevTechnicalReviewWorkspace").then((module) => ({ default: module.DevTechnicalReviewWorkspace })))
  : null;

export function isCertificateQaRoute(path: string) {
  return /^\/certifications\/[^/]+\/certificates\/[^/]+$/.test(path) || /^\/portal\/certificates(?:\/[^/]+)?$/.test(path);
}

function DevQueryBoundary({ children }: { children: ReactNode }) {
  if (!import.meta.env.DEV || !DevQueryRuntime) return children;
  return <DevQueryRuntime>{children}</DevQueryRuntime>;
}

function DevUiBoundary({ children }: { children: ReactNode }) {
  if (!import.meta.env.DEV || !DevUiRuntime) return children;
  return <DevUiRuntime>{children}</DevUiRuntime>;
}

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
    return (
      <Suspense fallback={<div className="app-loading" aria-label="Đang tải bản trình diễn" />}>
        <DevUiBoundary><DevCertificationCaseVisualShowcase /></DevUiBoundary>
      </Suspense>
    );
  }

  if (!sessionReady) {
    return <div className="app-loading" aria-label="Đang tải hệ thống" />;
  }

  if (import.meta.env.DEV && DevCertificateWorkspace && (window.location.pathname === "/__dev/certificate-workspace" || (window.sessionStorage.getItem("cmp-certificate-isolated-qa") && isCertificateQaRoute(window.location.pathname)))) {
    return <Suspense fallback={<div className="app-loading" />}><DevUiBoundary><DevQueryBoundary><DevCertificateWorkspace /></DevQueryBoundary></DevUiBoundary></Suspense>;
  }
  if (import.meta.env.DEV && DevDecisionWorkspace && (window.location.pathname === "/__dev/decision-workspace" || (window.sessionStorage.getItem("cmp-decision-isolated-qa") && !window.location.pathname.startsWith("/__dev/")))) {
    return <Suspense fallback={<div className="app-loading" />}><DevUiBoundary><DevQueryBoundary><DevDecisionWorkspace /></DevQueryBoundary></DevUiBoundary></Suspense>;
  }
  if (import.meta.env.DEV && DevTechnicalReviewWorkspace && (window.location.pathname === "/__dev/technical-review-workspace" || window.sessionStorage.getItem("cmp-review-isolated-qa"))) {
    return <Suspense fallback={<div className="app-loading" />}><DevUiBoundary><DevQueryBoundary><DevTechnicalReviewWorkspace /></DevQueryBoundary></DevUiBoundary></Suspense>;
  }

  if (import.meta.env.DEV && DevCapWorkspace && (window.location.pathname === "/__dev/cap-workspace" || window.sessionStorage.getItem("cmp-cap-isolated-qa"))) {
    return <Suspense fallback={<div className="app-loading" />}><DevUiBoundary><DevQueryBoundary><DevCapWorkspace /></DevQueryBoundary></DevUiBoundary></Suspense>;
  }

  if (!session) {
    return (
      <Suspense fallback={<div className="app-loading" aria-label="Đang tải đăng nhập" />}>
        <LoginRuntime onLogin={handleLogin} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="app-loading" aria-label="Đang tải không gian làm việc" />}>
      <AuthenticatedRuntime session={session} onLogout={handleLogout} />
    </Suspense>
  );
}

export function CticApplication() {
  return <ApplicationContent />;
}
