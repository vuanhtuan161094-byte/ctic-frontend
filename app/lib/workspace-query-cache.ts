import type { QueryClient } from "@tanstack/react-query";

/**
 * Refresh every projection that can be affected by a workflow mutation.
 * Prefix invalidation intentionally covers all status/severity variants.
 */
export async function invalidatePersonalWorkflowQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["work-tasks", "me"] }),
    queryClient.invalidateQueries({ queryKey: ["personal-workspace"] }),
    queryClient.invalidateQueries({ queryKey: ["notifications", "me"] }),
  ]);
}
