import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { PLATFORM_BRANDING } from './platform-branding';
import { resolveOrganizationBranding, type SafeOrganizationBranding } from './organization-branding';

export function useOrganizationBranding() {
  const query = useQuery({ queryKey: ['platform-branding'], queryFn: async () => (await api.get<SafeOrganizationBranding>('/platform-branding')).data, staleTime: 60_000, retry: false });
  return resolveOrganizationBranding(PLATFORM_BRANDING, query.data);
}
