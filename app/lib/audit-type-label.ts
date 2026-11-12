/** Customer-facing names for audit-type codes; identifiers stay unchanged in API payloads. */
export function auditTypeLabel(value?: string | null) {
  const key = (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const labels: Record<string, string> = {
    stage1: "Giai đoạn 1",
    stage2: "Giai đoạn 2",
    surveillance1: "Giám sát lần 1",
    surveillance_1: "Giám sát lần 1",
    surveillance2: "Giám sát lần 2",
    surveillance_2: "Giám sát lần 2",
    giam_sat: "Đánh giá giám sát",
    recertification: "Tái chứng nhận",
    special: "Đánh giá đặc biệt",
  };
  return labels[key] ?? (value || "Đánh giá");
}
