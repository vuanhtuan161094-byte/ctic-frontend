export type NumberingLifecycleState =
  | "CURRENT"
  | "SCHEDULED"
  | "HISTORICAL"
  | "CANCELLED";

export type NumberingCapability = {
  entity_type: string;
  label: string;
  description: string;
  fallback_prefix: string;
  mandatory_for_global_readiness: boolean;
};

export type NumberingCapabilityContract = {
  contract_version: string;
  sequence_authority: "NORMALIZED_VISIBLE_PREFIX_PER_BUSINESS_YEAR";
  format_template: "{PREFIX}-{YYYY}-{SEQUENCE}";
  timezone: string;
  preview_year: number;
  configurable_entities: NumberingCapability[];
  non_configurable_entities: Array<{
    entity_type: string;
    label: string;
    reason: string;
  }>;
};

export type NumberingRuleView = {
  status: string;
  lifecycle_state: NumberingLifecycleState;
  prefix: string;
  padding: number;
  effective_from: string;
  effective_to?: string | null;
};

export function numberingCapabilityOptions(
  contract?: NumberingCapabilityContract,
) {
  return (contract?.configurable_entities ?? []).map((item) => ({
    value: item.entity_type,
    label: item.label,
  }));
}

export function numberingCapabilityLabel(
  contract: NumberingCapabilityContract | undefined,
  entityType: string,
) {
  return contract?.configurable_entities.find(
    (item) => item.entity_type === entityType,
  )?.label ?? "Loại hồ sơ không được hỗ trợ";
}

export function buildNumberingPreview(
  prefix: string | undefined,
  padding: number | undefined,
  year: number,
) {
  const normalizedPrefix = prefix?.trim().toUpperCase() || "PREFIX";
  const normalizedPadding = Math.min(12, Math.max(3, padding ?? 4));
  return `${normalizedPrefix}-${year}-${String(1).padStart(normalizedPadding, "0")}`;
}

export function groupNumberingRules<TRule extends NumberingRuleView>(
  rules: readonly TRule[],
) {
  return {
    current: rules.filter((item) => item.lifecycle_state === "CURRENT"),
    scheduled: rules.filter((item) => item.lifecycle_state === "SCHEDULED"),
    historical: rules.filter((item) =>
      item.lifecycle_state === "HISTORICAL" ||
      item.lifecycle_state === "CANCELLED"),
  };
}
