"use client";

import { App as AntdApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import type { ReactNode } from "react";

import "./design-system/runtime-overrides.css";
import { createCmpAntdTheme } from "./design-system/theme";
import { PLATFORM_BRANDING } from "../lib/platform-branding";

dayjs.locale("vi");

export function UiRuntime({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider locale={viVN} theme={createCmpAntdTheme(PLATFORM_BRANDING)}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
