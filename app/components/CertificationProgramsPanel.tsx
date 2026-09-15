"use client";

import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  StopOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";

const { Text } = Typography;
const base = "/master-data-configuration";

type Scheme = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: string;
  effective_from?: string | null;
  effective_to?: string | null;
};

type Standard = {
  id: string;
  scheme_id: string;
  standard_code: string;
  standard_name: string;
  edition: string;
  status: string;
  effective_from: string;
  withdrawn_at?: string | null;
  scheme: Scheme;
};

type SchemeConfig = {
  id: string;
  scheme_id: string;
  version_no: number;
  status: string;
  effective_from: string;
  effective_to?: string | null;
  cycle_duration_months: number;
  surveillance_frequency_months: number;
  stage1_applicable: boolean;
  validity_duration_months: number;
  renewal_window_days: number;
  reminder_lead_days: number;
  required_audit_types: string[] | string;
  required_decision_types: string[] | string;
};

type ReadinessItem = {
  id: string;
  code: string;
  status: "READY" | "NEEDS_ATTENTION";
  issues: string[];
  active_configuration?: SchemeConfig | null;
};

type ConfigurationReadiness = {
  schemes: {
    ready: boolean;
    items: ReadinessItem[];
  };
};

type SchemeFormValues = {
  code: string;
  name: string;
  description?: string;
};

type StandardFormValues = {
  scheme_id: string;
  standard_code: string;
  standard_name: string;
  edition: string;
  effective_from: dayjs.Dayjs;
  withdrawn_at?: dayjs.Dayjs | null;
};

type RuleFormValues = {
  scheme_id: string;
  version_no: number;
  effective_from: dayjs.Dayjs;
  cycle_duration_months: number;
  surveillance_frequency_months: number;
  stage1_applicable: boolean;
  validity_duration_months: number;
  renewal_window_days: number;
  reminder_lead_days: number;
  required_audit_types: string[];
  required_decision_types: string[];
};

type StandardFamily = {
  key: string;
  code: string;
  name: string;
  editions: Standard[];
};

const builtInProgramNames: Record<string, string> = {
  QMS: "Hệ thống quản lý chất lượng",
  EMS: "Hệ thống quản lý môi trường",
  OHSMS: "Hệ thống quản lý an toàn và sức khỏe nghề nghiệp",
};

const auditTypeLabels: Record<string, string> = {
  INITIAL_STAGE_1: "Chứng nhận lần đầu – Giai đoạn 1",
  INITIAL_STAGE_2: "Chứng nhận lần đầu – Giai đoạn 2",
  SURVEILLANCE: "Giám sát",
  RECERTIFICATION: "Tái chứng nhận",
  SPECIAL: "Đánh giá đặc biệt",
};

const decisionTypeLabels: Record<string, string> = {
  GRANT: "Cấp chứng nhận",
  MAINTAIN: "Duy trì chứng nhận",
  RENEW: "Tái chứng nhận",
  EXTEND_SCOPE: "Mở rộng phạm vi",
  REDUCE_SCOPE: "Thu hẹp phạm vi",
};

function programName(row: Scheme) {
  const canonical = builtInProgramNames[row.code.trim().toUpperCase()];
  if (!canonical) return row.name;
  if (!row.name.trim() || /hệ thống quản lý chứng nhận/i.test(row.name)) return canonical;
  return row.name;
}

function normalizeStandardCode(codeValue: unknown, editionValue: unknown) {
  const edition = String(editionValue ?? "").trim();
  let code = String(codeValue ?? "").trim();
  if (!edition) return code;
  const escaped = edition.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  code = code.replace(new RegExp(`\\s*[:\\-]?\\s*${escaped}$`, "i"), "").trim();
  return code;
}

function standardEditionLabel(row: Pick<Standard, "standard_code" | "edition">) {
  const code = String(row.standard_code ?? "").trim();
  const edition = String(row.edition ?? "").trim();
  if (!edition) return code;
  return code.includes(edition) ? code : `${code}:${edition}`;
}

function hasPassedStopDate(row: Standard) {
  return Boolean(
    row.withdrawn_at
    && !dayjs(row.withdrawn_at).endOf("day").isAfter(dayjs()),
  );
}

function isStoppedStandard(row: Standard) {
  return row.status !== "ACTIVE" || hasPassedStopDate(row);
}

function canRestoreStandard(row: Standard) {
  return row.status === "WITHDRAWN"
    || (row.status === "ACTIVE" && hasPassedStopDate(row));
}

function isWaitingStandard(row: Standard) {
  return !isStoppedStandard(row)
    && dayjs(row.effective_from).startOf("day").isAfter(dayjs().startOf("day"));
}

function isAppliedStandard(row: Standard) {
  return !isStoppedStandard(row) && !isWaitingStandard(row);
}

function StandardStatus({ row }: { row: Standard }) {
  if (isStoppedStandard(row)) return <Tag>Ngừng áp dụng</Tag>;
  if (isWaitingStandard(row)) return <Tag color="cyan">Chờ hiệu lực</Tag>;
  return <Tag color="success">Đang áp dụng</Tag>;
}

function standardDateText(row: Standard) {
  const effective = dayjs(row.effective_from).format("DD/MM/YYYY");
  if (isStoppedStandard(row) && row.withdrawn_at) {
    return `Áp dụng ${effective} · Ngừng ${dayjs(row.withdrawn_at).format("DD/MM/YYYY")}`;
  }
  if (isWaitingStandard(row)) return `Hiệu lực từ ${effective}`;
  if (row.withdrawn_at) return `Áp dụng ${effective} · Dự kiến ngừng ${dayjs(row.withdrawn_at).format("DD/MM/YYYY")}`;
  return `Áp dụng từ ${effective}`;
}

function ProgramStatus({ value }: { value: string }) {
  return value === "ACTIVE"
    ? <Tag color="blue">Đang sử dụng</Tag>
    : <Tag>Ngừng sử dụng</Tag>;
}

function readinessText(issue: string) {
  if (/phiên bản tiêu chuẩn/i.test(issue)) return "Chưa có phiên bản tiêu chuẩn đang áp dụng";
  if (/quy tắc|configuration|ACTIVE/i.test(issue)) return "Chưa có bộ quy tắc chứng nhận đang áp dụng";
  return issue.replace(/ACTIVE/g, "đang áp dụng");
}

function isCurrentRule(row: SchemeConfig) {
  if (row.status !== "ACTIVE") return false;
  const today = dayjs().startOf("day");
  const from = dayjs(row.effective_from).startOf("day");
  const to = row.effective_to ? dayjs(row.effective_to).endOf("day") : null;
  return !from.isAfter(today) && (!to || !to.isBefore(today));
}

function isScheduledRule(row: SchemeConfig) {
  return row.status === "ACTIVE"
    && dayjs(row.effective_from).startOf("day").isAfter(dayjs().startOf("day"));
}

function nextRuleVersion(rows: SchemeConfig[]) {
  return rows.reduce((max, row) => Math.max(max, Number(row.version_no) || 0), 0) + 1;
}

export function CertificationProgramsPanel() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [standardOpen, setStandardOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null);
  const [editingStandard, setEditingStandard] = useState<Standard | null>(null);
  const [standardFamilyPreset, setStandardFamilyPreset] = useState<StandardFamily | null>(null);
  const [ruleScheme, setRuleScheme] = useState<Scheme | null>(null);
  const [schemeForm] = Form.useForm<SchemeFormValues>();
  const [standardForm] = Form.useForm<StandardFormValues>();
  const [ruleForm] = Form.useForm<RuleFormValues>();

  const schemes = useQuery({
    queryKey: ["master-schemes"],
    queryFn: async () => (await api.get<Scheme[]>(`${base}/schemes`)).data,
  });
  const standards = useQuery({
    queryKey: ["master-standards"],
    queryFn: async () => (await api.get<Standard[]>(`${base}/standards`)).data,
  });
  const configs = useQuery({
    queryKey: ["scheme-configs"],
    queryFn: async () => (await api.get<SchemeConfig[]>(`${base}/scheme-configurations`)).data,
  });
  const readiness = useQuery({
    queryKey: ["configuration-readiness"],
    queryFn: async () => (await api.get<ConfigurationReadiness>(`${base}/configuration-readiness`)).data,
  });

  const invalidate = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["master-schemes"] }),
    queryClient.invalidateQueries({ queryKey: ["master-standards"] }),
    queryClient.invalidateQueries({ queryKey: ["scheme-configs"] }),
    queryClient.invalidateQueries({ queryKey: ["configuration-readiness"] }),
  ]);

  const familiesByScheme = useMemo(() => {
    const grouped = new Map<string, Map<string, Standard[]>>();
    for (const row of standards.data ?? []) {
      const schemeRows = grouped.get(row.scheme_id) ?? new Map<string, Standard[]>();
      const familyKey = normalizeStandardCode(row.standard_code, row.edition).trim().toUpperCase();
      const familyRows = schemeRows.get(familyKey) ?? [];
      familyRows.push(row);
      schemeRows.set(familyKey, familyRows);
      grouped.set(row.scheme_id, schemeRows);
    }

    const result = new Map<string, StandardFamily[]>();
    for (const [schemeId, familyMap] of grouped.entries()) {
      const families = Array.from(familyMap.entries()).map(([key, editions]) => {
        editions.sort((left, right) => dayjs(right.effective_from).valueOf() - dayjs(left.effective_from).valueOf());
        const latest = editions[0];
        return {
          key,
          code: normalizeStandardCode(latest.standard_code, latest.edition),
          name: latest.standard_name,
          editions,
        };
      });
      families.sort((left, right) => left.code.localeCompare(right.code, "vi", { numeric: true }));
      result.set(schemeId, families);
    }
    return result;
  }, [standards.data]);

  const configsByScheme = useMemo(() => {
    const grouped = new Map<string, SchemeConfig[]>();
    for (const row of configs.data ?? []) {
      const rows = grouped.get(row.scheme_id) ?? [];
      rows.push(row);
      grouped.set(row.scheme_id, rows);
    }
    for (const rows of grouped.values()) {
      rows.sort((left, right) => dayjs(right.effective_from).valueOf() - dayjs(left.effective_from).valueOf());
    }
    return grouped;
  }, [configs.data]);

  const readinessByScheme = useMemo(
    () => new Map((readiness.data?.schemes.items ?? []).map((item) => [item.id, item])),
    [readiness.data],
  );

  const saveScheme = useMutation({
    mutationFn: async (values: SchemeFormValues) => {
      if (editingScheme) {
        return api.patch(`${base}/schemes/${editingScheme.id}`, {
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
        });
      }
      return api.post(`${base}/schemes`, {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        status: "ACTIVE",
      });
    },
    onSuccess: async () => {
      await invalidate();
      setSchemeOpen(false);
      setEditingScheme(null);
      schemeForm.resetFields();
      messageApi.success("Đã lưu chương trình");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const toggleScheme = useMutation({
    mutationFn: async (row: Scheme) => api.patch(`${base}/schemes/${row.id}`, {
      status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
    }),
    onSuccess: async (_, row) => {
      await invalidate();
      messageApi.success(row.status === "ACTIVE" ? "Đã ngừng sử dụng chương trình" : "Đã đưa chương trình vào sử dụng");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const saveStandard = useMutation({
    mutationFn: async (values: StandardFormValues) => {
      const edition = values.edition.trim();
      const standardCode = normalizeStandardCode(values.standard_code, edition);
      if (!standardCode) throw new Error("Mã tiêu chuẩn không hợp lệ. Ví dụ: ISO 9001.");
      const duplicate = (standards.data ?? []).find((item) =>
        item.id !== editingStandard?.id
        && item.scheme_id === values.scheme_id
        && normalizeStandardCode(item.standard_code, item.edition).toUpperCase() === standardCode.toUpperCase()
        && item.edition.trim().toUpperCase() === edition.toUpperCase(),
      );
      if (duplicate) throw new Error(`${standardEditionLabel(duplicate)} đã tồn tại trong chương trình ${duplicate.scheme.code}.`);
      const payload = {
        scheme_id: values.scheme_id,
        standard_code: standardCode,
        standard_name: values.standard_name.trim(),
        edition,
        effective_from: values.effective_from.format("YYYY-MM-DD"),
        ...(editingStandard ? {
          withdrawn_at: values.withdrawn_at ? values.withdrawn_at.format("YYYY-MM-DD") : null,
        } : {}),
      };
      return editingStandard
        ? api.patch(`${base}/standards/${editingStandard.id}`, payload)
        : api.post(`${base}/standards`, payload);
    },
    onSuccess: async () => {
      const wasEditing = Boolean(editingStandard);
      await invalidate();
      setStandardOpen(false);
      setEditingStandard(null);
      setStandardFamilyPreset(null);
      standardForm.resetFields();
      messageApi.success(wasEditing ? "Đã cập nhật phiên bản tiêu chuẩn" : "Đã thêm phiên bản tiêu chuẩn");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const stopStandard = useMutation({
    mutationFn: async (row: Standard) => api.post(`${base}/standards/${row.id}/stop`),
    onSuccess: async () => {
      await invalidate();
      messageApi.success("Đã ngừng áp dụng phiên bản tiêu chuẩn");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const restoreStandard = useMutation({
    mutationFn: async (row: Standard) => api.post(`${base}/standards/${row.id}/restore`),
    onSuccess: async () => {
      await invalidate();
      messageApi.success("Đã khôi phục áp dụng phiên bản tiêu chuẩn");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const deleteStandard = useMutation({
    mutationFn: async (row: Standard) => api.delete(`${base}/standards/${row.id}`),
    onSuccess: async () => {
      await invalidate();
      messageApi.success("Đã xóa phiên bản tiêu chuẩn");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const saveRule = useMutation({
    mutationFn: async (values: RuleFormValues) => api.post(`${base}/scheme-configurations`, {
      ...values,
      effective_from: values.effective_from.format("YYYY-MM-DD"),
    }),
    onSuccess: async () => {
      await invalidate();
      setRuleOpen(false);
      setRuleScheme(null);
      ruleForm.resetFields();
      messageApi.success("Đã tạo phiên bản quy tắc chứng nhận");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const openNewScheme = () => {
    setEditingScheme(null);
    schemeForm.resetFields();
    setSchemeOpen(true);
  };

  const openEditScheme = (row: Scheme) => {
    setEditingScheme(row);
    schemeForm.setFieldsValue({
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
    });
    setSchemeOpen(true);
  };

  const openNewFamily = (schemeId: string) => {
    setEditingStandard(null);
    setStandardFamilyPreset(null);
    standardForm.resetFields();
    standardForm.setFieldsValue({ scheme_id: schemeId });
    setStandardOpen(true);
  };

  const openNewEdition = (schemeId: string, family: StandardFamily) => {
    setEditingStandard(null);
    setStandardFamilyPreset(family);
    standardForm.resetFields();
    standardForm.setFieldsValue({
      scheme_id: schemeId,
      standard_code: family.code,
      standard_name: family.name,
    });
    setStandardOpen(true);
  };

  const openEditStandard = (row: Standard) => {
    setEditingStandard(row);
    setStandardFamilyPreset(null);
    standardForm.resetFields();
    standardForm.setFieldsValue({
      scheme_id: row.scheme_id,
      standard_code: normalizeStandardCode(row.standard_code, row.edition),
      standard_name: row.standard_name,
      edition: row.edition,
      effective_from: dayjs(row.effective_from),
      withdrawn_at: row.withdrawn_at ? dayjs(row.withdrawn_at) : null,
    });
    setStandardOpen(true);
  };

  const openRule = (scheme: Scheme) => {
    const rows = configsByScheme.get(scheme.id) ?? [];
    setRuleScheme(scheme);
    ruleForm.resetFields();
    ruleForm.setFieldsValue({
      scheme_id: scheme.id,
      version_no: nextRuleVersion(rows),
      effective_from: dayjs().startOf("day"),
      cycle_duration_months: 36,
      surveillance_frequency_months: 12,
      stage1_applicable: true,
      validity_duration_months: 36,
      renewal_window_days: 90,
      reminder_lead_days: 60,
      required_audit_types: ["INITIAL_STAGE_1", "INITIAL_STAGE_2", "SURVEILLANCE", "RECERTIFICATION"],
      required_decision_types: ["GRANT", "MAINTAIN", "RENEW"],
    });
    setRuleOpen(true);
  };

  const confirmToggleScheme = (row: Scheme) => {
    const stopping = row.status === "ACTIVE";
    Modal.confirm({
      title: stopping ? `Ngừng sử dụng ${row.code}?` : `Đưa ${row.code} vào sử dụng?`,
      content: stopping
        ? "Chương trình sẽ không còn được chọn cho nghiệp vụ mới. Hồ sơ lịch sử vẫn được giữ nguyên."
        : "Chương trình sẽ được mở lại. Hệ thống vẫn kiểm tra trạng thái sẵn sàng trước khi dùng cho nghiệp vụ mới.",
      okText: stopping ? "Ngừng sử dụng" : "Đưa vào sử dụng",
      okButtonProps: stopping ? { danger: true } : undefined,
      cancelText: "Hủy",
      onOk: async () => toggleScheme.mutateAsync(row),
    });
  };

  const confirmStop = (row: Standard) => {
    Modal.confirm({
      title: `Ngừng áp dụng ${standardEditionLabel(row)}?`,
      content: "Phiên bản sẽ không còn được chọn cho nghiệp vụ mới. Dữ liệu lịch sử vẫn được giữ nguyên.",
      okText: "Ngừng áp dụng",
      okButtonProps: { danger: true },
      cancelText: "Giữ nguyên",
      onOk: async () => stopStandard.mutateAsync(row),
    });
  };

  const confirmRestore = (row: Standard) => {
    Modal.confirm({
      title: `Khôi phục áp dụng ${standardEditionLabel(row)}?`,
      content: "Phiên bản sẽ trở lại danh sách có thể sử dụng cho nghiệp vụ mới theo ngày hiệu lực đã cấu hình.",
      okText: "Khôi phục áp dụng",
      cancelText: "Hủy",
      onOk: async () => restoreStandard.mutateAsync(row),
    });
  };

  const confirmDelete = (row: Standard) => {
    Modal.confirm({
      title: `Xóa ${standardEditionLabel(row)}?`,
      content: "Chỉ phiên bản chưa được sử dụng mới có thể xóa. Nếu đã có hồ sơ, chứng chỉ hoặc dữ liệu năng lực liên quan, hệ thống sẽ chặn để bảo vệ lịch sử.",
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => deleteStandard.mutateAsync(row),
    });
  };

  const allSchemes = schemes.data ?? [];
  const readyCount = allSchemes.filter((row) => readinessByScheme.get(row.id)?.status === "READY").length;
  const needsSetupCount = allSchemes.filter((row) => row.status === "ACTIVE" && readinessByScheme.get(row.id)?.status !== "READY").length;
  const loadError = schemes.isError
    ? getErrorMessage(schemes.error)
    : standards.isError
      ? getErrorMessage(standards.error)
      : configs.isError
        ? getErrorMessage(configs.error)
        : null;

  return (
    <div>
      {contextHolder}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <Text type="secondary">
          {allSchemes.length} chương trình · {readyCount} sẵn sàng · {needsSetupCount} cần thiết lập
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNewScheme}>Thêm chương trình</Button>
      </div>

      {loadError ? (
        <Card size="small" style={{ marginBottom: 12, borderColor: "#ffccc7" }}>
          <Text type="danger">Không tải được cấu hình: {loadError}</Text>
        </Card>
      ) : null}

      {!loadError && !schemes.isLoading && !allSchemes.length ? (
        <Card size="small">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Text type="secondary">Chưa có chương trình chứng nhận.</Text>
            <Button type="primary" size="small" onClick={openNewScheme}>Thêm chương trình đầu tiên</Button>
          </div>
        </Card>
      ) : null}

      <Space orientation="vertical" size={10} style={{ width: "100%" }}>
        {allSchemes.map((scheme) => {
          const families = familiesByScheme.get(scheme.id) ?? [];
          const schemeReadiness = readinessByScheme.get(scheme.id);
          const issues = schemeReadiness?.issues ?? [];
          const restoreCandidate = families
            .flatMap((family) => family.editions)
            .find(canRestoreStandard);
          const schemeConfigs = configsByScheme.get(scheme.id) ?? [];
          const currentRule = schemeConfigs.find(isCurrentRule) ?? null;
          const scheduledRule = [...schemeConfigs]
            .filter(isScheduledRule)
            .sort((left, right) => dayjs(left.effective_from).valueOf() - dayjs(right.effective_from).valueOf())[0] ?? null;

          return (
            <Card
              key={scheme.id}
              size="small"
              title={(
                <Space wrap size={8}>
                  <Tag color="blue" style={{ margin: 0 }}>{scheme.code}</Tag>
                  <Text strong>{programName(scheme)}</Text>
                  <ProgramStatus value={scheme.status} />
                  {scheme.status === "ACTIVE" ? (
                    schemeReadiness?.status === "READY"
                      ? <Tag color="success">Sẵn sàng</Tag>
                      : <Tag color="orange">Cần thiết lập</Tag>
                  ) : null}
                </Space>
              )}
              extra={(
                <Space size={4}>
                  <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => openNewFamily(scheme.id)}>Thêm tiêu chuẩn</Button>
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        { key: "edit", icon: <EditOutlined />, label: "Sửa chương trình" },
                        {
                          key: "toggle",
                          icon: scheme.status === "ACTIVE" ? <StopOutlined /> : <UndoOutlined />,
                          label: scheme.status === "ACTIVE" ? "Ngừng sử dụng" : "Đưa vào sử dụng",
                        },
                      ],
                      onClick: ({ key }) => {
                        if (key === "edit") openEditScheme(scheme);
                        if (key === "toggle") confirmToggleScheme(scheme);
                      },
                    }}
                  >
                    <Button type="text" icon={<MoreOutlined />} aria-label={`Thao tác ${scheme.code}`} />
                  </Dropdown>
                </Space>
              )}
            >
              {scheme.status === "ACTIVE" && issues.length ? (
                <div style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: 8, marginBottom: 8 }}>
                  {issues.map((issue) => {
                    const missingStandard = /phiên bản tiêu chuẩn/i.test(issue);
                    const missingRule = /quy tắc|configuration|ACTIVE/i.test(issue) && !missingStandard;
                    return (
                      <div
                        key={issue}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", minHeight: 30 }}
                      >
                        <Text type="secondary">• {readinessText(issue)}</Text>
                        {missingStandard ? (
                          restoreCandidate ? (
                            <Button size="small" type="link" icon={<UndoOutlined />} onClick={() => confirmRestore(restoreCandidate)}>
                              Khôi phục {standardEditionLabel(restoreCandidate)}
                            </Button>
                          ) : (
                            <Button size="small" type="link" onClick={() => openNewFamily(scheme.id)}>Thêm tiêu chuẩn</Button>
                          )
                        ) : missingRule ? (
                          <Button size="small" type="link" onClick={() => openRule(scheme)}>Thiết lập quy tắc</Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "6px 2px 10px" }}>
                <div>
                  <Text strong>Quy tắc chứng nhận</Text>
                  {currentRule ? (
                    <div><Text type="secondary">v{currentRule.version_no} · {currentRule.cycle_duration_months} tháng · giám sát {currentRule.surveillance_frequency_months} tháng/lần · chứng chỉ {currentRule.validity_duration_months} tháng</Text></div>
                  ) : scheduledRule ? (
                    <div><Text type="secondary">v{scheduledRule.version_no} chờ hiệu lực từ {dayjs(scheduledRule.effective_from).format("DD/MM/YYYY")}</Text></div>
                  ) : (
                    <div><Text type="secondary">Chưa có bộ quy tắc đang áp dụng.</Text></div>
                  )}
                  {currentRule && scheduledRule ? (
                    <div><Text type="secondary">Phiên bản kế tiếp: v{scheduledRule.version_no} · {dayjs(scheduledRule.effective_from).format("DD/MM/YYYY")}</Text></div>
                  ) : null}
                </div>
                <Button size="small" onClick={() => openRule(scheme)}>
                  {currentRule || scheduledRule ? "Tạo phiên bản mới" : "Thiết lập"}
                </Button>
              </div>

              <Divider style={{ margin: "2px 0 8px" }} />

              {families.length ? (
                <div>
                  {families.map((family, familyIndex) => (
                    <div key={family.key} style={{ paddingTop: familyIndex ? 10 : 0, borderTop: familyIndex ? "1px solid #f0f0f0" : undefined }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "4px 2px" }}>
                        <div>
                          <Text strong>{family.code}</Text>
                          <Text type="secondary"> · {family.name}</Text>
                          <Text type="secondary"> · {family.editions.length} phiên bản</Text>
                        </div>
                        <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => openNewEdition(scheme.id, family)}>Thêm phiên bản</Button>
                      </div>

                      {family.editions.map((standard) => {
                        const applied = isAppliedStandard(standard);
                        const restorable = canRestoreStandard(standard);
                        const actions = [
                          { key: "edit", icon: <EditOutlined />, label: "Sửa phiên bản" },
                          ...(applied ? [{ key: "stop", icon: <StopOutlined />, label: "Ngừng áp dụng", danger: true }] : []),
                          ...(restorable ? [{ key: "restore", icon: <UndoOutlined />, label: "Khôi phục áp dụng" }] : []),
                          { type: "divider" as const },
                          { key: "delete", icon: <DeleteOutlined />, label: "Xóa nếu chưa sử dụng", danger: true },
                        ];
                        return (
                          <div
                            key={standard.id}
                            style={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) minmax(220px, auto) 36px", gap: 10, alignItems: "center", padding: "8px 2px 8px 18px" }}
                          >
                            <div>
                              <Text strong>{standard.edition}</Text>
                              <div><Text type="secondary">{standardEditionLabel(standard)}</Text></div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <StandardStatus row={standard} />
                              <div><Text type="secondary">{standardDateText(standard)}</Text></div>
                            </div>
                            <Dropdown
                              trigger={["click"]}
                              menu={{
                                items: actions,
                                onClick: ({ key }) => {
                                  if (key === "edit") openEditStandard(standard);
                                  if (key === "stop") confirmStop(standard);
                                  if (key === "restore") confirmRestore(standard);
                                  if (key === "delete") confirmDelete(standard);
                                },
                              }}
                            >
                              <Button type="text" icon={<MoreOutlined />} aria-label={`Thao tác ${standardEditionLabel(standard)}`} />
                            </Dropdown>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "8px 2px 2px" }}>
                  <Text type="secondary">Chưa có tiêu chuẩn trong chương trình này.</Text>
                  <Button size="small" onClick={() => openNewFamily(scheme.id)}>Thêm tiêu chuẩn</Button>
                </div>
              )}
            </Card>
          );
        })}
      </Space>

      <Modal
        title={editingScheme ? "Sửa chương trình" : "Thêm chương trình"}
        open={schemeOpen}
        onCancel={() => {
          setSchemeOpen(false);
          setEditingScheme(null);
          schemeForm.resetFields();
        }}
        onOk={() => schemeForm.submit()}
        okText="Lưu"
        confirmLoading={saveScheme.isPending}
        destroyOnHidden
        forceRender
      >
        <Form form={schemeForm} layout="vertical" onFinish={(values) => saveScheme.mutate(values)}>
          <Form.Item name="code" label="Mã chương trình" rules={[{ required: true, message: "Nhập mã chương trình" }]}>
            <Input disabled={Boolean(editingScheme)} placeholder="Ví dụ: QMS" />
          </Form.Item>
          <Form.Item name="name" label="Tên chương trình" rules={[{ required: true, message: "Nhập tên chương trình" }]}>
            <Input placeholder="Ví dụ: Hệ thống quản lý chất lượng" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingStandard ? `Sửa ${standardEditionLabel(editingStandard)}` : standardFamilyPreset ? `Thêm phiên bản · ${standardFamilyPreset.code}` : "Thêm tiêu chuẩn"}
        open={standardOpen}
        onCancel={() => {
          setStandardOpen(false);
          setEditingStandard(null);
          setStandardFamilyPreset(null);
          standardForm.resetFields();
        }}
        onOk={() => standardForm.submit()}
        okText="Lưu"
        confirmLoading={saveStandard.isPending}
        destroyOnHidden
        forceRender
      >
        <Form form={standardForm} layout="vertical" onFinish={(values) => saveStandard.mutate(values)}>
          <Form.Item name="scheme_id" label="Chương trình" rules={[{ required: true, message: "Chọn chương trình" }]}>
            <Select
              disabled={Boolean(editingStandard) || Boolean(standardFamilyPreset)}
              options={allSchemes.map((row) => ({ value: row.id, label: `${row.code} · ${programName(row)}` }))}
            />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="standard_code" label="Mã tiêu chuẩn" rules={[{ required: true, message: "Nhập mã tiêu chuẩn" }]}>
              <Input disabled={Boolean(standardFamilyPreset)} placeholder="ISO 9001" />
            </Form.Item>
            <Form.Item name="edition" label="Phiên bản / năm" rules={[{ required: true, message: "Nhập phiên bản" }]}>
              <Input placeholder="2015" />
            </Form.Item>
          </div>
          <Form.Item name="standard_name" label="Tên tiêu chuẩn" rules={[{ required: true, message: "Nhập tên tiêu chuẩn" }]}>
            <Input disabled={Boolean(standardFamilyPreset)} placeholder="Hệ thống quản lý chất lượng" />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: editingStandard ? "1fr 1fr" : "1fr", gap: 12 }}>
            <Form.Item name="effective_from" label="Áp dụng từ" rules={[{ required: true, message: "Chọn ngày áp dụng" }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
            {editingStandard ? (
              <Form.Item name="withdrawn_at" label="Ngừng áp dụng từ">
                <DatePicker allowClear format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            ) : null}
          </div>
          <Text type="secondary">Ngày áp dụng ở tương lai sẽ tự hiển thị “Chờ hiệu lực”.</Text>
        </Form>
      </Modal>

      <Modal
        title={ruleScheme ? `Quy tắc chứng nhận · ${ruleScheme.code}` : "Quy tắc chứng nhận"}
        open={ruleOpen}
        onCancel={() => {
          setRuleOpen(false);
          setRuleScheme(null);
          ruleForm.resetFields();
        }}
        onOk={() => ruleForm.submit()}
        okText="Lưu phiên bản"
        confirmLoading={saveRule.isPending}
        destroyOnHidden
        forceRender
        width={760}
      >
        <Form form={ruleForm} layout="vertical" onFinish={(values) => saveRule.mutate(values)}>
          <Form.Item name="scheme_id" hidden><Input /></Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
            <Form.Item name="version_no" label="Phiên bản quy tắc" rules={[{ required: true }]}>
              <InputNumber disabled min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="effective_from" label="Áp dụng từ" rules={[{ required: true, message: "Chọn ngày áp dụng" }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="cycle_duration_months" label="Chu kỳ chứng nhận" rules={[{ required: true }]}>
              <InputNumber min={1} addonAfter="tháng" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="surveillance_frequency_months"
              label="Giám sát định kỳ"
              dependencies={["cycle_duration_months"]}
              rules={[
                { required: true },
                {
                  validator: async (_, value) => {
                    const cycle = Number(ruleForm.getFieldValue("cycle_duration_months") ?? 0);
                    if (value && cycle && Number(value) > cycle) throw new Error("Khoảng giám sát không được dài hơn chu kỳ");
                  },
                },
              ]}
            >
              <InputNumber min={1} addonAfter="tháng/lần" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="validity_duration_months"
              label="Hiệu lực chứng chỉ"
              dependencies={["cycle_duration_months"]}
              rules={[
                { required: true },
                {
                  validator: async (_, value) => {
                    const cycle = Number(ruleForm.getFieldValue("cycle_duration_months") ?? 0);
                    if (value && cycle && Number(value) > cycle) throw new Error("Thời hạn chứng chỉ không được dài hơn chu kỳ");
                  },
                },
              ]}
            >
              <InputNumber min={1} addonAfter="tháng" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="renewal_window_days" label="Cửa sổ tái chứng nhận" rules={[{ required: true }]}>
              <InputNumber min={0} addonAfter="ngày" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="reminder_lead_days" label="Nhắc trước mốc" rules={[{ required: true }]}>
              <InputNumber min={0} addonAfter="ngày" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="stage1_applicable" label="Áp dụng Giai đoạn 1" valuePropName="checked">
              <Switch checkedChildren="Có" unCheckedChildren="Không" />
            </Form.Item>
          </div>

          <Form.Item
            name="required_audit_types"
            label="Danh mục loại đánh giá"
            dependencies={["stage1_applicable", "required_decision_types"]}
            rules={[
              { required: true, message: "Chọn ít nhất một loại đánh giá" },
              {
                validator: async (_, value: string[] | undefined) => {
                  const selected = value ?? [];
                  const stage1 = Boolean(ruleForm.getFieldValue("stage1_applicable"));
                  const decisions = (ruleForm.getFieldValue("required_decision_types") ?? []) as string[];
                  if (stage1 && !selected.includes("INITIAL_STAGE_1")) throw new Error("Có Giai đoạn 1 thì phải chọn đánh giá Giai đoạn 1");
                  if (!stage1 && selected.includes("INITIAL_STAGE_1")) throw new Error("Không áp dụng Giai đoạn 1 thì bỏ đánh giá Giai đoạn 1");
                  if (decisions.includes("GRANT") && !selected.includes("INITIAL_STAGE_2")) throw new Error("Có quyết định cấp thì phải chọn đánh giá Giai đoạn 2");
                },
              },
            ]}
          >
            <Select mode="multiple" options={Object.entries(auditTypeLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="required_decision_types" label="Danh mục loại quyết định" rules={[{ required: true, message: "Chọn ít nhất một loại quyết định" }]}>
            <Select mode="multiple" options={Object.entries(decisionTypeLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>

          <Text type="secondary">Tạo phiên bản mới không sửa lịch sử hồ sơ đã chốt. Nếu ngày áp dụng ở tương lai, hệ thống tự chờ đến ngày đó.</Text>
        </Form>
      </Modal>
    </div>
  );
}
