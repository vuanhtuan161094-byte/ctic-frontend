"use client";

import { App as AntdApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import type { ReactNode } from "react";

import "./ux-i1-accessibility-closure.css";
import { PLATFORM_BRANDING } from "../lib/platform-branding";

dayjs.locale("vi");

export function UiRuntime({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: PLATFORM_BRANDING.primaryColor,
          colorInfo: PLATFORM_BRANDING.primaryColor,
          colorSuccess: "#168451",
          colorSuccessText: "#00502d",
          colorWarning: "#c56a11",
          colorError: "#c83b3b",
          colorTextSecondary: "#5f6b7a",
          colorTextDescription: "#5f6b7a",
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
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
