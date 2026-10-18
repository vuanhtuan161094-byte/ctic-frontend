import type { ConfigProviderProps } from "antd";

export interface CmpBrandPalette {
  primaryColor: string;
  darkColor: string;
  accentColor: string;
}

export const CMP_FOUNDATION = Object.freeze({
  neutral: Object.freeze({
    canvas: "#f2f6fb",
    raised: "#ffffff",
    subtle: "#f7f9fc",
    selected: "#edf5ff",
    textPrimary: "#17233b",
    textSecondary: "#5f6b7a",
    textDisabled: "#95a1b2",
    border: "#dce5f0",
    borderStrong: "#b8c6d8",
  }),
  feedback: Object.freeze({
    info: "#1767a6",
    success: "#168451",
    successTextStrong: "#00502d",
    warning: "#c56a11",
    error: "#c83b3b",
  }),
  typography: Object.freeze({
    fontFamily: '"Segoe UI Variable", "Segoe UI", "Noto Sans", Arial, sans-serif',
    bodySize: 14,
    lineHeight: 1.5,
  }),
  density: Object.freeze({
    controlHeight: 36,
    compactControlHeight: 30,
    tableCellBlock: 10,
    tableCellInline: 12,
  }),
  radius: Object.freeze({ small: 6, medium: 10, large: 14 }),
  elevation: Object.freeze({
    low: "0 5px 18px rgba(29, 62, 104, .045)",
    raised: "0 8px 24px rgba(17, 43, 77, .09)",
    overlay: "0 18px 48px rgba(17, 43, 77, .16)",
  }),
});

export const CMP_BREAKPOINTS = Object.freeze({
  phone: 480,
  mobile: 768,
  desktop: 1024,
  wide: 1250,
});

export function createCmpAntdTheme(brand: CmpBrandPalette): NonNullable<ConfigProviderProps["theme"]> {
  return {
    token: {
      colorPrimary: brand.primaryColor,
      colorInfo: brand.primaryColor,
      colorSuccess: CMP_FOUNDATION.feedback.success,
      colorSuccessText: CMP_FOUNDATION.feedback.successTextStrong,
      colorWarning: CMP_FOUNDATION.feedback.warning,
      colorError: CMP_FOUNDATION.feedback.error,
      colorTextSecondary: CMP_FOUNDATION.neutral.textSecondary,
      colorTextDescription: CMP_FOUNDATION.neutral.textSecondary,
      borderRadius: CMP_FOUNDATION.radius.medium,
      fontFamily: CMP_FOUNDATION.typography.fontFamily,
    },
    components: {
      Layout: {
        bodyBg: CMP_FOUNDATION.neutral.canvas,
        headerBg: CMP_FOUNDATION.neutral.raised,
        siderBg: brand.darkColor,
      },
      Menu: {
        darkItemBg: brand.darkColor,
        darkItemSelectedBg: CMP_FOUNDATION.neutral.raised,
        darkItemSelectedColor: brand.primaryColor,
        darkItemHoverBg: brand.accentColor,
      },
    },
  };
}
