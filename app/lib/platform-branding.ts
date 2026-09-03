const readEnv = (name: string, fallback: string) => {
  const value = import.meta.env[name] as string | undefined;
  const normalized = value?.trim();
  return normalized || fallback;
};

const normalizeCodePrefix = (value: string) => {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "")
    .toUpperCase()
    .slice(0, 12);

  return normalized || "CB";
};

const shortName = readEnv("VITE_BRAND_SHORT_NAME", "CB");
const organizationName = readEnv(
  "VITE_BRAND_ORGANIZATION_NAME",
  "TỔ CHỨC CHỨNG NHẬN",
);
const platformName = readEnv(
  "VITE_PLATFORM_NAME",
  "Nền tảng quản lý chứng nhận",
);
const platformNameEn = readEnv(
  "VITE_PLATFORM_NAME_EN",
  "Certification Management Platform",
);

export const PLATFORM_BRANDING = Object.freeze({
  shortName,
  organizationName,
  platformName,
  platformNameEn,
  supportContactLabel: readEnv(
    "VITE_SUPPORT_CONTACT_LABEL",
    "quản trị viên hệ thống",
  ),
  documentCodePrefix: normalizeCodePrefix(
    readEnv("VITE_DOCUMENT_CODE_PREFIX", shortName),
  ),
  primaryColor: readEnv("VITE_BRAND_PRIMARY_COLOR", "#0b4ba2"),
  darkColor: readEnv("VITE_BRAND_DARK_COLOR", "#082f6b"),
  accentColor: readEnv("VITE_BRAND_ACCENT_COLOR", "#1a6ac7"),
  browserTitle: readEnv(
    "VITE_BROWSER_TITLE",
    `${shortName} ${platformNameEn}`,
  ),
  browserDescription: readEnv(
    "VITE_BROWSER_DESCRIPTION",
    `${platformName} - ${organizationName}`,
  ),
});

export function applyPlatformBrandingToDocument() {
  if (typeof document === "undefined") return;

  document.title = PLATFORM_BRANDING.browserTitle;
  document.documentElement.style.setProperty(
    "--ctic-navy",
    PLATFORM_BRANDING.darkColor,
  );
  document.documentElement.style.setProperty(
    "--ctic-blue",
    PLATFORM_BRANDING.primaryColor,
  );
  document.documentElement.style.setProperty(
    "--ctic-blue-2",
    PLATFORM_BRANDING.accentColor,
  );
  document.documentElement.style.setProperty(
    "--cmp-brand-strong",
    PLATFORM_BRANDING.darkColor,
  );
  document.documentElement.style.setProperty(
    "--cmp-brand-primary",
    PLATFORM_BRANDING.primaryColor,
  );
  document.documentElement.style.setProperty(
    "--cmp-brand-accent",
    PLATFORM_BRANDING.accentColor,
  );

  let description = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );

  if (!description) {
    description = document.createElement("meta");
    description.name = "description";
    document.head.appendChild(description);
  }

  description.content = PLATFORM_BRANDING.browserDescription;
}
