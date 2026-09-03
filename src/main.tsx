import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "../app/globals.css";

import { CticApplication } from "../app/components/CticApplication";
import { DesignSystemShowcase } from "../app/components/design-system/DesignSystemShowcase";

const showDesignSystem =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has("design-system");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {showDesignSystem ? <DesignSystemShowcase /> : <CticApplication />}
  </React.StrictMode>,
);
