export type SafeOrganizationBranding = { display_name: string | null; short_name: string | null; portal_title: string | null };
export function resolveOrganizationBranding<T extends { shortName: string; organizationName: string; platformName: string }>(fallback: T, profile?: SafeOrganizationBranding | null) {
  return { ...fallback, shortName: profile?.short_name?.trim() || fallback.shortName, organizationName: profile?.display_name?.trim() || fallback.organizationName, platformName: profile?.portal_title?.trim() || fallback.platformName };
}
