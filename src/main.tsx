import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "../app/globals.css";

import { CticApplication } from "../app/components/CticApplication";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CticApplication />
  </React.StrictMode>,
);
