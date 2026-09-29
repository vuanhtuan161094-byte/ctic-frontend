import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "../app/globals.css";
import "./expert-overlay-layering.css";

import { CticApplication } from "../app/components/CticApplication";

const showDesignSystem =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has("design-system");

const DevDesignSystemShowcase = import.meta.env.DEV
  ? lazy(() =>
      import("../app/components/design-system/DesignSystemShowcase").then(
        (module) => ({ default: module.DesignSystemShowcase }),
      ),
    )
  : null;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {showDesignSystem && DevDesignSystemShowcase ? (
      <Suspense
        fallback={
          <div className="app-loading" aria-label="Đang tải Design System" />
        }
      >
        <DevDesignSystemShowcase />
      </Suspense>
    ) : (
      <CticApplication />
    )}
  </React.StrictMode>,
);
