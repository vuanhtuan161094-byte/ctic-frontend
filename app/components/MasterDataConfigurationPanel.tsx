"use client";

import {
  ApartmentOutlined,
  BankOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  EditOutlined,
  InboxOutlined,
  MoreOutlined,
  NumberOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  StopOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Collapse,
  DatePicker,
  Descriptions,
  Divider,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import type { UploadFile } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { api, getErrorMessage } from "../lib/api";
import {
  buildNumberingPreview,
  groupNumberingRules,
  numberingCapabilityLabel,
  numberingCapabilityOptions,
  type NumberingCapabilityContract,
  type NumberingRuleView,
} from "../lib/numbering-configuration";
import { IndustryTaxonomyPanel } from "./IndustryTaxonomyPanel";
import { ImportJobDetails } from "./ImportJobDetails";
import "./configuration-workspaces.css";

const { Paragraph, Text, Title } = Typography;
const base = "/master-data-configuration";

type Scheme = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: string;
  effective_from?: string | null;
  effective_to?: string | null;
  accreditation_metadata?: string | null;
  _count?: { standards?: number; configurations?: number };
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
  scheme: Scheme;
};

type Numbering = NumberingRuleView & {
  id: string;
  entity_type: string;
  runtime_series_key: string;
  legacy_series_key_mismatch: boolean;
};

type ImportJob = {
  id: string;
  entity_type: string;
  source_file_name: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  committed_rows: number;
  created_at: string;
};

type ImportDefinition = { entity_type: string; format: string; mode: string; columns: string[] };
type DatedFormValues = Record<string, unknown> & { effective_from: dayjs.Dayjs; effective_to?: dayjs.Dayjs };
type NumberingFormValues = DatedFormValues & { entity_type: string; prefix: string; padding: number };
type NumberingActionMode = "replace" | "end" | "cancel";
type NumberingActionValues = {
  prefix?: string;
  padding?: number;
  effective_from?: dayjs.Dayjs;
  effective_to?: dayjs.Dayjs;
  reason: string;
};
type NumberingLifecycleMutationValues = NumberingActionValues & {
  id: string;
  mode: NumberingActionMode;
};

type OrganizationProfile = {
  legal_name: string;
  display_name: string;
  short_name: string;
  logo_reference?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  document_footer?: string;
  portal_title: string;
  timezone: string;
  locale: string;
  date_format: string;
  default_language: string;
  certificate_reminder_days: number;
  file_retention_days?: number;
};

export type ConfigurationReadiness = {
  status: "READY" | "NEEDS_ATTENTION";
  generated_at: string;
  organization: {
    ready: boolean;
    reasons?: Array<{ code: string; field: string; message: string }>;
    field_manifest?: Array<{ field: string; status: string; editable: boolean; effect: string }>;
    profile?: {
      legal_name?: string;
      display_name?: string;
      certificate_reminder_days?: number;
    } | null;
  };
  schemes: {
    ready: boolean;
    items: Array<{
      id: string;
      code: string;
      name: string;
      active_standard_count: number;
      active_configuration?: SchemeConfig | null;
      status: "READY" | "NEEDS_ATTENTION";
      issues: string[];
    }>;
  };
  taxonomy: {
    ready: boolean;
    operational_revisions: { ISIC: string; NACE: string };
    isic_count: number;
    nace_count: number;
    iaf_count: number;
    reasons: Array<{
      code: string;
      blocking: boolean;
      management_system?: string;
      message: string;
    }>;
  };
  numbering: {
    ready: boolean;
    configured: Array<{ entity_type: string; prefix: string; padding: number }>;
    missing_entity_types: string[];
    mandatory_entity_types: string[];
    optional_entity_types: string[];
    reasons: Array<{
      code: string;
      entity_type: string;
      label: string;
      blocking: boolean;
      message: string;
    }>;
  };
  runtime_wiring: Array<{
    field: string;
    status: "ENFORCED" | "SNAPSHOT_ONLY";
    effect: string;
  }>;
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Đang hiệu lực",
  INACTIVE: "Ngừng hiệu lực",
  DRAFT: "Bản nháp",
  VALIDATED: "Đã kiểm tra",
  COMMITTED: "Đã ghi dữ liệu",
  WITHDRAWN: "Đã thu hồi",
  RETIRED: "Ngừng sử dụng",
  PENDING: "Chờ xử lý",
  SUPERSEDED: "Đã được thay thế",
  CURRENT: "Đang dùng",
  SCHEDULED: "Đã lên lịch",
  HISTORICAL: "Lịch sử",
  CANCELLED: "Đã hủy lịch",
};

const importEntityLabels: Record<string, string> = {
  SCHEME: "Chương trình chứng nhận",
  STANDARD_EDITION: "Phiên bản tiêu chuẩn",
  IAF_SCOPE: "Lĩnh vực IAF",
  INDUSTRY_CLASSIFICATION: "Danh mục ISIC / NACE",
  ISIC_NACE_MAPPING: "Quy đổi ISIC → NACE",
  NACE_IAF_MAPPING: "Quy đổi NACE → IAF",
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
  RENEW: "Tái cấp / tái chứng nhận",
  EXTEND_SCOPE: "Mở rộng phạm vi",
  REDUCE_SCOPE: "Thu hẹp phạm vi",
};

const runtimeFieldLabels: Record<string, string> = {
  stage1_applicable: "Áp dụng Giai đoạn 1",
  surveillance_frequency_months: "Khoảng giám sát định kỳ",
  validity_duration_months: "Thời hạn hiệu lực chứng chỉ",
  renewal_window_days: "Cửa sổ tái chứng nhận",
  reminder_lead_days: "Mốc nhắc vận hành",
  cycle_duration_months: "Độ dài chu kỳ chứng nhận",
  required_audit_types: "Danh mục loại đánh giá",
  required_decision_types: "Danh mục loại quyết định",
};

const organizationReasonLabels: Record<string, string> = {
  legal_name: "Tên pháp lý",
  display_name: "Tên hiển thị",
  short_name: "Tên viết tắt",
  portal_title: "Tiêu đề cổng khách hàng",
  timezone: "Múi giờ",
  locale: "Ngôn ngữ giao diện",
  default_language: "Ngôn ngữ mặc định",
  certificate_reminder_days: "Mốc nhắc chứng chỉ",
};

const organizationTimezoneOptions = [
  { value: "Asia/Ho_Chi_Minh", label: "Việt Nam · Asia/Ho_Chi_Minh" },
  { value: "Asia/Bangkok", label: "Bangkok · Asia/Bangkok" },
  { value: "Asia/Singapore", label: "Singapore · Asia/Singapore" },
  { value: "Asia/Tokyo", label: "Tokyo · Asia/Tokyo" },
  { value: "Europe/London", label: "London · Europe/London" },
  { value: "America/New_York", label: "New York · America/New_York" },
  { value: "America/Los_Angeles", label: "Los Angeles · America/Los_Angeles" },
  { value: "UTC", label: "UTC" },
];

function normalizeOrganizationProfileForForm(profile?: OrganizationProfile | null): Partial<OrganizationProfile> {
  const rawTimezone = String(profile?.timezone ?? "").trim();
  const timezone = !rawTimezone || ["Việt Nam", "Vietnam", "GMT+7", "+07:00"].includes(rawTimezone)
    ? "Asia/Ho_Chi_Minh"
    : rawTimezone;
  const reminder = Number(profile?.certificate_reminder_days);
  return {
    ...(profile ?? {}),
    timezone,
    locale: "vi-VN",
    default_language: "vi",
    date_format: ["DD/MM/YYYY", "YYYY-MM-DD", "MM/DD/YYYY"].includes(String(profile?.date_format ?? ""))
      ? profile?.date_format
      : "DD/MM/YYYY",
    certificate_reminder_days: Number.isInteger(reminder) && reminder >= 0 && reminder <= 3650 ? reminder : 90,
  };
}

function toList(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value;
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

function Status({ value }: { value: string }) {
  return (
    <Tag color={value === "ACTIVE" || value === "COMMITTED" || value === "CURRENT" ? "green" : value === "DRAFT" || value === "VALIDATED" || value === "SCHEDULED" ? "blue" : "default"}>
      {statusLabels[value] ?? value}
    </Tag>
  );
}

function SchemeConfigurationStatus({ row }: { row: SchemeConfig }) {
  if (row.status === "DRAFT") return <Tag color="blue">Bản nháp</Tag>;
  if (row.status !== "ACTIVE") return <Status value={row.status} />;
  const now = dayjs();
  const from = dayjs(row.effective_from);
  const to = row.effective_to ? dayjs(row.effective_to).endOf("day") : null;
  if (from.isAfter(now)) return <Tag color="cyan">Chờ hiệu lực · từ {from.format("DD/MM/YYYY")}</Tag>;
  if (to && to.isBefore(now)) return <Tag>Phiên bản lịch sử</Tag>;
  return <Tag color="green">Đang áp dụng</Tag>;
}

function StandardLifecycleStatus({ row }: { row: Standard }) {
  if (row.status === "WITHDRAWN" || row.status === "INACTIVE" || row.status === "SUPERSEDED") {
    return <Status value={row.status} />;
  }
  const now = dayjs();
  const from = dayjs(row.effective_from);
  const withdrawn = row.withdrawn_at ? dayjs(row.withdrawn_at).endOf("day") : null;
  if (withdrawn && withdrawn.isBefore(now)) return <Tag>Đã thu hồi</Tag>;
  if (from.isAfter(now)) return <Tag color="cyan">Chờ hiệu lực · từ {from.format("DD/MM/YYYY")}</Tag>;
  return <Tag color="green">Đang áp dụng</Tag>;
}

function GuidanceCard({
  icon,
  title,
  description,
  example,
  use,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  example: string;
  use: string;
}) {
  return (
    <Card size="small" style={{ height: "100%", borderRadius: 12 }}>
      <Space align="start" size={12}>
        <div style={{ fontSize: 24, lineHeight: 1, paddingTop: 2 }}>{icon}</div>
        <div>
          <Text strong style={{ fontSize: 15 }}>{title}</Text>
          <Paragraph type="secondary" style={{ margin: "6px 0 8px" }}>{description}</Paragraph>
          <div style={{ marginBottom: 4 }}><Text type="secondary">Ví dụ: </Text><Text>{example}</Text></div>
          <div><Text type="secondary">Dùng để: </Text><Text>{use}</Text></div>
        </div>
      </Space>
    </Card>
  );
}

function Intro({ title, what, example, effect }: { title: string; what: string; example: string; effect: string }) {
  return (
    <Collapse
      size="small"
      style={{ marginBottom: 12 }}
      items={[{
        key: title,
        label: `Xem giải thích · ${title}`,
        children: (
          <div>
            <div><b>Hiểu đơn giản:</b> {what}</div>
            <div style={{ marginTop: 4 }}><b>Ví dụ:</b> {example}</div>
            <div style={{ marginTop: 4 }}><b>Ảnh hưởng:</b> {effect}</div>
          </div>
        ),
      }]}
    />
  );
}

function standardEditionLabel(row: Pick<Standard, "standard_code" | "edition">) {
  const code = String(row.standard_code ?? "").trim();
  const edition = String(row.edition ?? "").trim();
  if (!edition) return code;
  return code.includes(edition) ? code : `${code}:${edition}`;
}

function normalizeStandardCode(codeValue: unknown, editionValue: unknown) {
  const edition = String(editionValue ?? "").trim();
  let code = String(codeValue ?? "").trim();
  if (!edition) return code;
  const escaped = edition.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  code = code.replace(new RegExp(`\\s*[:\\-]?\\s*${escaped}$`, "i"), "").trim();
  return code;
}

export type MasterDataConfigurationSection =
  | "overview"
  | "programs"
  | "taxonomy"
  | "rules"
  | "numbering"
  | "organization"
  | "import";

interface MasterDataConfigurationPanelProps {
  activeSection?: MasterDataConfigurationSection;
  routeMode?: boolean;
}

export function MasterDataConfigurationPanel({
  activeSection,
  routeMode = false,
}: MasterDataConfigurationPanelProps = {}) {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [internalActiveTab, setInternalActiveTab] = useState<MasterDataConfigurationSection>("overview");
  const activeTab = activeSection ?? internalActiveTab;
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [standardOpen, setStandardOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState<Standard | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [numberingOpen, setNumberingOpen] = useState(false);
  const [numberingAction, setNumberingAction] = useState<{ mode: NumberingActionMode; row: Numbering } | null>(null);
  const [importEntity, setImportEntity] = useState("SCHEME");
  const [importFiles, setImportFiles] = useState<UploadFile[]>([]);
  const [schemeForm] = Form.useForm();
  const [standardForm] = Form.useForm();
  const [configForm] = Form.useForm();
  const [numberingForm] = Form.useForm<NumberingFormValues>();
  const [numberingActionForm] = Form.useForm<NumberingActionValues>();
  const [profileForm] = Form.useForm<OrganizationProfile>();

  const numberingPrefix = Form.useWatch("prefix", numberingForm) as string | undefined;
  const numberingPadding = Form.useWatch("padding", numberingForm) as number | undefined;
  const numberingEntity = Form.useWatch("entity_type", numberingForm) as string | undefined;

  const configSchemeId = Form.useWatch("scheme_id", configForm) as string | undefined;
  const configVersion = Form.useWatch("version_no", configForm) as number | undefined;
  const configCycle = Form.useWatch("cycle_duration_months", configForm) as number | undefined;
  const configSurveillance = Form.useWatch("surveillance_frequency_months", configForm) as number | undefined;
  const configValidity = Form.useWatch("validity_duration_months", configForm) as number | undefined;
  const configRenewalWindow = Form.useWatch("renewal_window_days", configForm) as number | undefined;
  const configReminderLead = Form.useWatch("reminder_lead_days", configForm) as number | undefined;
  const configStage1 = Form.useWatch("stage1_applicable", configForm) as boolean | undefined;
  const configAuditTypes = Form.useWatch("required_audit_types", configForm) as string[] | undefined;
  const configDecisionTypes = Form.useWatch("required_decision_types", configForm) as string[] | undefined;
  const configEffectiveFrom = Form.useWatch("effective_from", configForm) as dayjs.Dayjs | undefined;

  const schemes = useQuery({ queryKey: ["master-schemes"], queryFn: async () => (await api.get<Scheme[]>(`${base}/schemes`)).data });
  const standards = useQuery({ queryKey: ["master-standards"], queryFn: async () => (await api.get<Standard[]>(`${base}/standards`)).data });
  const configs = useQuery({ queryKey: ["scheme-configs"], queryFn: async () => (await api.get<SchemeConfig[]>(`${base}/scheme-configurations`)).data });
  const numbering = useQuery({ queryKey: ["numbering-configs"], queryFn: async () => (await api.get<Numbering[]>(`${base}/numbering-series`)).data });
  const numberingCapabilities = useQuery({ queryKey: ["numbering-capabilities"], queryFn: async () => (await api.get<NumberingCapabilityContract>(`${base}/numbering-capabilities`)).data });
  const profile = useQuery({ queryKey: ["organization-profile"], queryFn: async () => (await api.get<OrganizationProfile | null>(`${base}/organization-profile`)).data });
  const readiness = useQuery({ queryKey: ["configuration-readiness"], queryFn: async () => (await api.get<ConfigurationReadiness>(`${base}/configuration-readiness`)).data });
  const imports = useQuery({ queryKey: ["import-jobs"], queryFn: async () => (await api.get<ImportJob[]>(`${base}/imports`)).data });
  const importDefinitions = useQuery({ queryKey: ["import-definitions"], queryFn: async () => (await api.get<ImportDefinition[]>(`${base}/imports/definitions`)).data });

  useEffect(() => {
    if (!profile.isFetched) return;
    profileForm.setFieldsValue(normalizeOrganizationProfileForForm(profile.data));
  }, [profile.data, profile.isFetched, profileForm]);

  const invalidate = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["master-schemes"] }),
    queryClient.invalidateQueries({ queryKey: ["master-standards"] }),
    queryClient.invalidateQueries({ queryKey: ["scheme-configs"] }),
    queryClient.invalidateQueries({ queryKey: ["numbering-configs"] }),
    queryClient.invalidateQueries({ queryKey: ["numbering-capabilities"] }),
    queryClient.invalidateQueries({ queryKey: ["organization-profile"] }),
    queryClient.invalidateQueries({ queryKey: ["platform-branding"] }),
    queryClient.invalidateQueries({ queryKey: ["configuration-readiness"] }),
    queryClient.invalidateQueries({ queryKey: ["import-jobs"] }),
  ]);

  const useAdminMutation = <TVariables,>(action: (values: TVariables) => Promise<unknown>, done?: () => void) => useMutation({
    mutationFn: action,
    onSuccess: async () => { await invalidate(); done?.(); messageApi.success("Đã lưu thay đổi"); },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const createScheme = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const code = String(values.code ?? "").trim().toUpperCase();
      const existing = (schemes.data ?? []).find((item) => item.code.trim().toUpperCase() === code);
      if (existing) throw new Error(`Chương trình ${existing.code} đã tồn tại. Không cần tạo lại; hãy thêm tiêu chuẩn/phiên bản bên trong chương trình này.`);
      return api.post(`${base}/schemes`, { ...values, code });
    },
    onSuccess: async () => {
      await invalidate();
      setSchemeOpen(false);
      schemeForm.resetFields();
      setInternalActiveTab("programs");
      messageApi.success("Đã tạo chương trình");
    },
    onError: (error) => {
      const raw = getErrorMessage(error);
      const code = String(schemeForm.getFieldValue("code") ?? "").trim().toUpperCase();
      if (/scheme\/program.*đã tồn tại|already exists|duplicate/i.test(raw)) {
        messageApi.warning(`Chương trình ${code || "này"} đã tồn tại. Không tạo lại; hãy thêm tiêu chuẩn/phiên bản bên trong chương trình hiện có.`);
        setInternalActiveTab("programs");
        return;
      }
      messageApi.error(raw);
    },
  });
  const saveStandard = useMutation({
    mutationFn: async (values: DatedFormValues) => {
      const schemeId = String(values.scheme_id ?? "");
      const edition = String(values.edition ?? "").trim();
      const standardCode = normalizeStandardCode(values.standard_code, edition);
      if (!standardCode) throw new Error("Mã tiêu chuẩn không hợp lệ. Ví dụ đúng: ISO 9001.");
      const duplicate = (standards.data ?? []).find((item) =>
        item.id !== editingStandard?.id
        && item.scheme_id === schemeId
        && normalizeStandardCode(item.standard_code, item.edition).toUpperCase() === standardCode.toUpperCase()
        && String(item.edition ?? "").trim().toUpperCase() === edition.toUpperCase(),
      );
      if (duplicate) throw new Error(`${standardEditionLabel(duplicate)} đã tồn tại trong chương trình ${duplicate.scheme.code}.`);
      const payload = {
        ...values,
        standard_code: standardCode,
        edition,
        effective_from: values.effective_from.format("YYYY-MM-DD"),
        withdrawn_at: values.withdrawn_at && dayjs.isDayjs(values.withdrawn_at) ? values.withdrawn_at.format("YYYY-MM-DD") : undefined,
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
      standardForm.resetFields();
      setInternalActiveTab("programs");
      messageApi.success(wasEditing ? "Đã cập nhật tiêu chuẩn / phiên bản" : "Đã thêm phiên bản tiêu chuẩn");
    },
    onError: (error) => {
      const raw = getErrorMessage(error);
      if (/đã tồn tại|already exists|duplicate|unique/i.test(raw)) {
        const code = normalizeStandardCode(standardForm.getFieldValue("standard_code"), standardForm.getFieldValue("edition"));
        const edition = String(standardForm.getFieldValue("edition") ?? "").trim();
        messageApi.warning(`${code || "Tiêu chuẩn"}${edition ? `:${edition}` : ""} đã tồn tại trong chương trình đã chọn.`);
        return;
      }
      messageApi.error(raw);
    },
  });

  const retireStandard = useMutation({
    mutationFn: async ({ row, mode }: { row: Standard; mode: "cancel" | "withdraw" }) => api.patch(`${base}/standards/${row.id}`, mode === "cancel"
      ? { status: "INACTIVE" }
      : { status: "WITHDRAWN", withdrawn_at: dayjs().format("YYYY-MM-DD") }),
    onSuccess: async (_, variables) => {
      await invalidate();
      messageApi.success(variables.mode === "cancel" ? "Đã hủy lịch áp dụng" : "Đã ngừng hiệu lực tiêu chuẩn");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });
  const createConfig = useAdminMutation<DatedFormValues>((values) => api.post(`${base}/scheme-configurations`, {
    ...values,
    effective_from: values.effective_from.format("YYYY-MM-DD"),
    effective_to: values.effective_to?.format("YYYY-MM-DD"),
  }), () => { setConfigOpen(false); configForm.resetFields(); });
  const activateConfig = useAdminMutation<string>((id) => api.post(`${base}/scheme-configurations/${id}/activate`));
  const cancelScheduledConfig = useAdminMutation<string>((id) => api.post(`${base}/scheme-configurations/${id}/cancel-scheduled`));
  const createNumbering = useAdminMutation<NumberingFormValues>((values) => api.post(`${base}/numbering-series`, {
    ...values,
    effective_from: values.effective_from.format("YYYY-MM-DD"),
    effective_to: values.effective_to?.format("YYYY-MM-DD"),
  }), () => { setNumberingOpen(false); numberingForm.resetFields(); });
  const changeNumberingLifecycle = useAdminMutation<NumberingLifecycleMutationValues>((values) => {
    if (values.mode === "replace") {
      return api.post(`${base}/numbering-series/${values.id}/replace`, {
        prefix: values.prefix,
        padding: values.padding,
        effective_from: values.effective_from?.format("YYYY-MM-DD"),
        effective_to: values.effective_to?.format("YYYY-MM-DD"),
        reason: values.reason,
      });
    }
    if (values.mode === "end") {
      return api.post(`${base}/numbering-series/${values.id}/end`, {
        effective_to: values.effective_to?.format("YYYY-MM-DD"),
        reason: values.reason,
      });
    }
    return api.post(`${base}/numbering-series/${values.id}/cancel-scheduled`, {
      reason: values.reason,
    });
  }, () => {
    setNumberingAction(null);
    numberingActionForm.resetFields();
  });
  const saveProfile = useAdminMutation<OrganizationProfile>((values) => api.patch(`${base}/organization-profile`, {
    ...values,
    locale: "vi-VN",
    default_language: "vi",
    date_format: values.date_format || "DD/MM/YYYY",
  }));
  const [selectedImportJob, setSelectedImportJob] = useState<string | null>(null);
  const validateImport = useAdminMutation<void>(async () => {
    const file = importFiles[0]?.originFileObj;
    if (!file) throw new Error("Chọn tệp CSV trước khi kiểm tra");
    const form = new FormData();
    form.append("entity_type", importEntity);
    form.append("import_mode", "CREATE_ONLY");
    form.append("file", file);
    const result = await api.post<ImportJob>(`${base}/imports/validate`, form);
    setSelectedImportJob(result.data.id);
    return result;
  }, () => setImportFiles([]));

  const schemeOptions = (schemes.data ?? []).map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }));
  const selectedImportDefinition = (importDefinitions.data ?? []).find((item) => item.entity_type === importEntity);
  const foundationLoadError = schemes.isError
    ? getErrorMessage(schemes.error)
    : standards.isError
      ? getErrorMessage(standards.error)
      : null;
  const foundationLoading = schemes.isLoading || standards.isLoading;
  const standardsByScheme = useMemo(() => {
    const grouped = new Map<string, Standard[]>();
    for (const standard of standards.data ?? []) {
      const rows = grouped.get(standard.scheme_id) ?? [];
      rows.push(standard);
      grouped.set(standard.scheme_id, rows);
    }
    for (const rows of grouped.values()) {
      rows.sort((left, right) => standardEditionLabel(left).localeCompare(standardEditionLabel(right), "vi", { numeric: true }));
    }
    return grouped;
  }, [standards.data]);

  const openSchemeModal = (preset?: "QMS" | "EMS" | "OHSMS") => {
    const presets = {
      QMS: { code: "QMS", name: "Hệ thống quản lý chất lượng", description: "Chương trình chứng nhận hệ thống quản lý chất lượng." },
      EMS: { code: "EMS", name: "Hệ thống quản lý môi trường", description: "Chương trình chứng nhận hệ thống quản lý môi trường." },
      OHSMS: { code: "OHSMS", name: "Hệ thống quản lý an toàn và sức khỏe nghề nghiệp", description: "Chương trình chứng nhận hệ thống quản lý an toàn và sức khỏe nghề nghiệp." },
    };
    schemeForm.resetFields();
    if (preset) schemeForm.setFieldsValue(presets[preset]);
    setSchemeOpen(true);
  };

  const openStandardModal = (schemeId?: string, row?: Standard) => {
    standardForm.resetFields();
    setEditingStandard(row ?? null);
    if (row) {
      standardForm.setFieldsValue({
        scheme_id: row.scheme_id,
        standard_code: normalizeStandardCode(row.standard_code, row.edition),
        standard_name: row.standard_name,
        edition: row.edition,
        effective_from: dayjs(row.effective_from),
        withdrawn_at: row.withdrawn_at ? dayjs(row.withdrawn_at) : undefined,
      });
    } else if (schemeId) {
      standardForm.setFieldsValue({ scheme_id: schemeId });
    }
    setStandardOpen(true);
  };

  const confirmStandardLifecycleAction = (row: Standard) => {
    const scheduled = row.status === "ACTIVE" && dayjs(row.effective_from).isAfter(dayjs());
    Modal.confirm({
      title: scheduled ? `Hủy lịch áp dụng ${standardEditionLabel(row)}?` : `Ngừng hiệu lực ${standardEditionLabel(row)}?`,
      okText: scheduled ? "Hủy lịch áp dụng" : "Ngừng hiệu lực",
      okButtonProps: { danger: true },
      cancelText: "Giữ nguyên",
      content: (
        <Alert
          showIcon
          type="warning"
          style={{ marginTop: 12 }}
          message={scheduled ? `Tiêu chuẩn này chưa tới ngày áp dụng (${dayjs(row.effective_from).format("DD/MM/YYYY")}).` : "Tiêu chuẩn sẽ được đánh dấu ngừng hiệu lực từ hôm nay."}
          description="Không xóa dữ liệu lịch sử. Hồ sơ đã chốt trước đó vẫn giữ snapshot tiêu chuẩn đã dùng."
        />
      ),
      onOk: async () => {
        await retireStandard.mutateAsync({ row, mode: scheduled ? "cancel" : "withdraw" });
      },
    });
  };

  const overviewCounts = useMemo(() => ({
    schemes: schemes.data?.length ?? 0,
    standards: standards.data?.length ?? 0,
    activeConfigs: (configs.data ?? []).filter((item) => {
      if (item.status !== "ACTIVE") return false;
      const now = dayjs();
      return !dayjs(item.effective_from).isAfter(now) && (!item.effective_to || !dayjs(item.effective_to).endOf("day").isBefore(now));
    }).length,
    numbering: numbering.data?.length ?? 0,
  }), [schemes.data, standards.data, configs.data, numbering.data]);

  const configPreviewWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (configCycle && configSurveillance && configSurveillance > configCycle) {
      warnings.push("Khoảng giám sát đang dài hơn toàn bộ chu kỳ chứng nhận.");
    }
    if (configCycle && configValidity && configValidity > configCycle) {
      warnings.push("Thời hạn chứng chỉ đang dài hơn chu kỳ chứng nhận.");
    }
    if (configStage1 === true && !(configAuditTypes ?? []).includes("INITIAL_STAGE_1")) {
      warnings.push("Đã chọn Có áp dụng Giai đoạn 1 nhưng chưa chọn loại đánh giá Giai đoạn 1.");
    }
    if (configStage1 === false && (configAuditTypes ?? []).includes("INITIAL_STAGE_1")) {
      warnings.push("Đã chọn Không áp dụng Giai đoạn 1 nhưng danh sách đánh giá vẫn có Giai đoạn 1.");
    }
    if ((configDecisionTypes ?? []).includes("GRANT") && !(configAuditTypes ?? []).includes("INITIAL_STAGE_2")) {
      warnings.push("Có quyết định Cấp chứng nhận nhưng chưa chọn đánh giá Chứng nhận lần đầu – Giai đoạn 2.");
    }
    if ((configReminderLead ?? 0) > (configRenewalWindow ?? 0) && (configRenewalWindow ?? 0) > 0) {
      warnings.push("Mốc nhắc vận hành đang sớm hơn cửa sổ tái chứng nhận. Điều này được phép, nhưng hãy chắc chắn đây là chủ ý.");
    }
    return warnings;
  }, [
    configCycle,
    configSurveillance,
    configValidity,
    configStage1,
    configAuditTypes,
    configDecisionTypes,
    configReminderLead,
    configRenewalWindow,
  ]);

  const selectedConfigScheme = (schemes.data ?? []).find((item) => item.id === configSchemeId);

  const applyLegacyDraftConfiguration = (row: SchemeConfig) => {
    const rowStart = dayjs(row.effective_from);
    const previous = (configs.data ?? [])
      .filter((item) => item.scheme_id === row.scheme_id && item.status === "ACTIVE" && item.id !== row.id)
      .filter((item) => dayjs(item.effective_from).isBefore(rowStart))
      .sort((left, right) => dayjs(right.effective_from).valueOf() - dayjs(left.effective_from).valueOf())[0];

    const fieldRows = [
      ["Chu kỳ chứng nhận", previous?.cycle_duration_months, row.cycle_duration_months, "tháng"],
      ["Khoảng giám sát", previous?.surveillance_frequency_months, row.surveillance_frequency_months, "tháng/lần"],
      ["Thời hạn chứng chỉ", previous?.validity_duration_months, row.validity_duration_months, "tháng"],
      ["Cửa sổ tái chứng nhận", previous?.renewal_window_days, row.renewal_window_days, "ngày"],
      ["Mốc nhắc vận hành", previous?.reminder_lead_days, row.reminder_lead_days, "ngày"],
      ["Giai đoạn 1", previous ? (previous.stage1_applicable ? "Có" : "Không") : undefined, row.stage1_applicable ? "Có" : "Không", ""],
    ] as Array<[string, string | number | undefined, string | number, string]>;

    Modal.confirm({
      title: `Áp dụng ${row.scheme.code} v${row.version_no}?`,
      width: 760,
      okText: "Áp dụng phiên bản này",
      cancelText: "Xem lại",
      content: (
        <div style={{ marginTop: 12 }}>
          <Alert
            showIcon
            type={previous ? "warning" : "info"}
            message={previous ? `Phiên bản đang dùng sẽ tự kết thúc ngày ${rowStart.subtract(1, "day").format("DD/MM/YYYY")}` : "Đây sẽ là phiên bản đang hiệu lực đầu tiên"}
            description="Dự án đã tạo vẫn giữ bản chốt cấu hình cũ. Chỉ dự án mới tại ngày hiệu lực của phiên bản này mới nhận quy tắc mới."
            style={{ marginBottom: 12 }}
          />
          <Descriptions bordered size="small" column={1}>
            {fieldRows.map(([label, before, after, unit]) => (
              <Descriptions.Item key={label} label={label}>
                {previous ? <><Text delete={before !== after}>{before ?? "—"}{unit ? ` ${unit}` : ""}</Text> <Text type="secondary">→</Text> </> : null}
                <Text strong>{after}{unit ? ` ${unit}` : ""}</Text>
              </Descriptions.Item>
            ))}
            <Descriptions.Item label="Danh mục loại đánh giá">
              {previous ? (
                <div style={{ marginBottom: 6 }}>
                  <Text type="secondary">Phiên bản trước: </Text>
                  {toList(previous.required_audit_types).map((value) => <Tag key={`before-${value}`}>{auditTypeLabels[value] ?? value}</Tag>)}
                </div>
              ) : null}
              <div>
                <Text strong>Phiên bản mới: </Text>
                {toList(row.required_audit_types).map((value) => <Tag key={value}>{auditTypeLabels[value] ?? value}</Tag>)}
                <Tag>Chốt theo dự án</Tag>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Danh mục loại quyết định">
              {previous ? (
                <div style={{ marginBottom: 6 }}>
                  <Text type="secondary">Phiên bản trước: </Text>
                  {toList(previous.required_decision_types).map((value) => <Tag key={`before-${value}`}>{decisionTypeLabels[value] ?? value}</Tag>)}
                </div>
              ) : null}
              <div>
                <Text strong>Phiên bản mới: </Text>
                {toList(row.required_decision_types).map((value) => <Tag key={value}>{decisionTypeLabels[value] ?? value}</Tag>)}
                <Tag>Chốt theo dự án</Tag>
              </div>
            </Descriptions.Item>
          </Descriptions>
        </div>
      ),
      onOk: async () => {
        await activateConfig.mutateAsync(row.id);
      },
    });
  };

  const cancelScheduledConfiguration = (row: SchemeConfig) => {
    Modal.confirm({
      title: `Hủy lịch áp dụng ${row.scheme.code} v${row.version_no}?`,
      okText: "Hủy lịch áp dụng",
      okButtonProps: { danger: true },
      cancelText: "Giữ nguyên",
      content: (
        <Alert
          showIcon
          type="warning"
          style={{ marginTop: 12 }}
          message={`Phiên bản này đang chờ hiệu lực từ ${dayjs(row.effective_from).format("DD/MM/YYYY")}.`}
          description="Hệ thống sẽ hủy lịch của phiên bản này và khôi phục thời hạn của phiên bản trước (nếu có). Lịch sử vẫn được giữ nguyên."
        />
      ),
      onOk: async () => {
        await cancelScheduledConfig.mutateAsync(row.id);
      },
    });
  };

  const numberingOptions = numberingCapabilityOptions(numberingCapabilities.data);
  const supportedNumberingEntities = new Set(numberingOptions.map((item) => item.value));
  const numberingGroups = groupNumberingRules(
    (numbering.data ?? []).filter((item) => supportedNumberingEntities.has(item.entity_type)),
  );
  const numberingLabel = (entityType: string) => numberingCapabilityLabel(numberingCapabilities.data, entityType);
  const numberingPreviewYear = numberingCapabilities.data?.preview_year ?? new Date().getFullYear();

  const openNumberingAction = (mode: NumberingActionMode, row: Numbering) => {
    numberingActionForm.resetFields();
    numberingActionForm.setFieldsValue(mode === "replace" ? {
      prefix: row.prefix,
      padding: row.padding,
      effective_from: dayjs().add(1, "day"),
    } : mode === "end" ? {
      effective_to: dayjs(),
    } : {});
    setNumberingAction({ mode, row });
  };

  const numberingTable = (rows: Numbering[], emptyText: string) => (
    <div className="numbering-table-shell">
      <Table
        className="numbering-rules-table"
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 900 }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} /> }}
      dataSource={rows}
      columns={[
        { title: "Đối tượng", dataIndex: "entity_type", render: (value) => numberingLabel(value) },
        { title: "Tiền tố", dataIndex: "prefix", render: (value) => <Tag>{value}</Tag>, width: 110 },
        { title: "Số chữ số", dataIndex: "padding", width: 100 },
        { title: "Ví dụ số", render: (_, row: Numbering) => <Text code>{buildNumberingPreview(row.prefix, row.padding, numberingPreviewYear)}</Text> },
        { title: "Hiệu lực", render: (_, row: Numbering) => `${dayjs(row.effective_from).format("DD/MM/YYYY")} → ${row.effective_to ? dayjs(row.effective_to).format("DD/MM/YYYY") : "không giới hạn"}` },
        { title: "Trạng thái", render: (_, row: Numbering) => <Status value={row.lifecycle_state} />, width: 130 },
        {
          title: "Thao tác",
          width: 90,
          render: (_, row: Numbering) => row.lifecycle_state === "CURRENT" ? (
            <Dropdown menu={{ items: [
              { key: "replace", label: "Thay thế quy tắc", icon: <EditOutlined />, onClick: () => openNumberingAction("replace", row) },
              { key: "end", label: "Kết thúc hiệu lực", icon: <StopOutlined />, danger: true, onClick: () => openNumberingAction("end", row) },
            ] }}>
              <Button size="small" icon={<MoreOutlined />} aria-label="Thao tác quy tắc đánh số" />
            </Dropdown>
          ) : row.lifecycle_state === "SCHEDULED" ? (
            <Button size="small" danger onClick={() => openNumberingAction("cancel", row)}>Hủy lịch</Button>
          ) : null,
        },
      ]}
      />
    </div>
  );

  const downloadImportTemplate = () => {
    if (!selectedImportDefinition) {
      messageApi.warning("Chưa tải được định nghĩa tệp mẫu");
      return;
    }
    const csv = `${selectedImportDefinition.columns.join(",")}\r\n`;
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `CMP_${selectedImportDefinition.entity_type}_template.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const tabItems = [
    {
      key: "overview",
      label: "Bắt đầu từ đâu?",
      children: (
        <div>
          <Alert
            showIcon
            type="success"
            message="Không cần cấu hình tất cả cùng lúc"
            description="Với ISO 9001 / ISO 14001 / ISO 45001, hãy đi theo thứ tự bên dưới. Mỗi mục đều có ví dụ và giải thích rõ hệ thống dùng dữ liệu đó vào việc gì."
            style={{ marginBottom: 16 }}
          />
          <Steps
            responsive
            current={-1}
            items={[
              { title: "1. Chương trình & tiêu chuẩn", description: "QMS → ISO 9001:2015" },
              { title: "2. Quy tắc chu kỳ", description: "36 tháng / giám sát..." },
              { title: "3. Phân loại ngành", description: "ISIC → NACE → IAF" },
              { title: "4. Năng lực tổ chức", description: "Tiêu chuẩn + IAF" },
              { title: "5. Đánh số", description: "CMP-2026-0001" },
              { title: "6. Tổ chức", description: "Tên / logo / cổng" },
            ]}
            style={{ marginBottom: 20 }}
          />
          <Collapse
            size="small"
            style={{ marginBottom: 16 }}
            items={[{
              key: "configuration-help",
              label: "Xem giải thích từng mục cấu hình",
              children: (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                  <GuidanceCard icon={<SafetyCertificateOutlined />} title="Chương trình chứng nhận" description="Loại dịch vụ/hệ thống quản lý mà tổ chức chứng nhận cung cấp. Đây không phải tiêu chuẩn và cũng không phải IAF." example="QMS – Hệ thống quản lý chất lượng" use="Gom các tiêu chuẩn, cấu hình và năng lực theo từng chương trình." />
                  <GuidanceCard icon={<BookOutlined />} title="Tiêu chuẩn / phiên bản" description="Tiêu chuẩn cụ thể thuộc một chương trình. Cần lưu cả phiên bản/năm để lịch sử hồ sơ không bị thay đổi khi tiêu chuẩn cập nhật." example="QMS → ISO 9001 · phiên bản 2015" use="Chọn tiêu chuẩn hợp lệ và chốt vào dự án/hồ sơ để giữ lịch sử." />
                  <GuidanceCard icon={<SettingOutlined />} title="Quy tắc chu kỳ chứng nhận" description="Bộ tham số theo phiên bản: độ dài chu kỳ, khoảng giám sát, có Giai đoạn 1 hay không, loại đánh giá/quyết định cần có." example="Chu kỳ 36 tháng · giám sát mỗi 12 tháng · có GĐ1" use="Lưu quy tắc nghiệp vụ theo chương trình và chốt vào từng dự án." />
                  <GuidanceCard icon={<ApartmentOutlined />} title="Phân loại ngành" description="Danh mục và bảng quy đổi ngành để người dùng chỉ cần chọn một hoặc nhiều mã ISIC của khách hàng." example="ISIC 2220 → NACE 22.xx → IAF 14" use="Xác định lĩnh vực chứng nhận và kiểm tra năng lực." />
                  <GuidanceCard icon={<SafetyCertificateOutlined />} title="Năng lực tổ chức" description="Phạm vi mà tổ chức được phép chứng nhận theo từng tiêu chuẩn/phiên bản và lĩnh vực IAF." example="QMS · ISO 9001:2015 → IAF 14, 19, 28" use="Application Review tự đối chiếu IAF của khách với phạm vi năng lực này trước khi cho phê duyệt." />
                  <GuidanceCard icon={<NumberOutlined />} title="Quy tắc đánh số" description="Quy định tiền tố và số chữ số cho các hồ sơ được hệ thống cấp số tự động." example="Khiếu nại: CMP-2026-0001" use="Áp dụng cho số mới phát sinh; số lịch sử không đổi." />
                  <GuidanceCard icon={<BankOutlined />} title="Tổ chức & thương hiệu" description="Thông tin pháp lý và nhận diện của đơn vị triển khai phần mềm." example="Tên pháp lý, tên hiển thị, địa chỉ, tiêu đề cổng khách hàng" use="Hiển thị trên cổng, tài liệu và báo cáo hỗ trợ branding." />
                </div>
              ),
            }]}
          />
          <Divider />
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 4 }} title="Trạng thái dữ liệu hiện tại">
            <Descriptions.Item label="Chương trình">{foundationLoadError ? "—" : overviewCounts.schemes}</Descriptions.Item>
            <Descriptions.Item label="Phiên bản tiêu chuẩn">{foundationLoadError ? "—" : overviewCounts.standards}</Descriptions.Item>
            <Descriptions.Item label="Quy tắc đang hiệu lực">{overviewCounts.activeConfigs}</Descriptions.Item>
            <Descriptions.Item label="Quy tắc đánh số">{overviewCounts.numbering}</Descriptions.Item>
          </Descriptions>
          <Card
            size="small"
            title="Kiểm tra sẵn sàng cấu hình"
            extra={readiness.isFetching ? <Tag>Đang kiểm tra...</Tag> : readiness.data ? <Tag color={readiness.data.status === "READY" ? "green" : "orange"}>{readiness.data.status === "READY" ? "Sẵn sàng" : "Cần hoàn thiện"}</Tag> : null}
            style={{ marginTop: 16 }}
          >
            {readiness.data ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
                  <Card size="small" bordered>
                    <Space direction="vertical" size={2}>
                      <Text strong>Tổ chức</Text>
                      <Tag color={readiness.data.organization.ready ? "green" : "orange"}>{readiness.data.organization.ready ? "Đã cấu hình" : "Chưa cấu hình"}</Tag>
                      <Text type="secondary">{readiness.data.organization.profile?.display_name ?? "Chưa có hồ sơ tổ chức"}</Text>
                    </Space>
                  </Card>
                  <Card size="small" bordered>
                    <Space direction="vertical" size={2}>
                      <Text strong>Chương trình & quy tắc</Text>
                      <Tag color={readiness.data.schemes.ready ? "green" : "orange"}>{readiness.data.schemes.ready ? "Đủ baseline" : "Còn thiếu"}</Tag>
                      <Text type="secondary">{readiness.data.schemes.items.filter((item) => item.status === "READY").length}/{readiness.data.schemes.items.length} chương trình sẵn sàng</Text>
                    </Space>
                  </Card>
                  <Card size="small" bordered>
                    <Space direction="vertical" size={2}>
                      <Text strong>ISIC / NACE / IAF</Text>
                      <Tag color={readiness.data.taxonomy.ready ? "green" : "orange"}>{readiness.data.taxonomy.ready ? "Đã nạp & ánh xạ" : "Chưa đủ dữ liệu"}</Tag>
                      <Text type="secondary">ISIC {readiness.data.taxonomy.isic_count} · NACE {readiness.data.taxonomy.nace_count} · IAF {readiness.data.taxonomy.iaf_count}</Text>
                      <Text type="secondary">{readiness.data.taxonomy.reasons.length ? readiness.data.taxonomy.reasons.map((item) => `${item.code}: ${item.message}`).join(" · ") : "QMS / EMS / OHSMS đã đủ coverage vận hành"}</Text>
                    </Space>
                  </Card>
                  <Card size="small" bordered>
                    <Space direction="vertical" size={2}>
                      <Text strong>Đánh số đang dùng</Text>
                      <Tag color={readiness.data.numbering.ready ? "green" : "orange"}>{readiness.data.numbering.ready ? "Đủ cấu hình" : "Còn thiếu"}</Tag>
                      <Text type="secondary">{readiness.data.numbering.reasons.length ? readiness.data.numbering.reasons.map((item) => item.message).join(" · ") : "Tất cả đối tượng bắt buộc đã có quy tắc hiện hành"}</Text>
                    </Space>
                  </Card>
                </div>
                {readiness.data.schemes.items.some((item) => item.issues.length) ? (
                  <Alert
                    showIcon
                    type="warning"
                    style={{ marginTop: 12 }}
                    message="Các chương trình cần hoàn thiện"
                    description={readiness.data.schemes.items.filter((item) => item.issues.length).map((item) => `${item.code}: ${item.issues.join("; ")}`).join(" · ")}
                  />
                ) : null}
              </>
            ) : (
              <Text type="secondary">Không tải được trạng thái sẵn sàng. Bạn vẫn có thể cấu hình từng mục bên dưới.</Text>
            )}
          </Card>
          <Alert
            showIcon
            type="info"
            style={{ marginTop: 16 }}
            message="Các trường nào đang tác động thật đến hệ thống?"
            description="Giai đoạn 1, khoảng giám sát, thời hạn chứng chỉ, cửa sổ tái chứng nhận và mốc nhắc vận hành đã tác động trực tiếp theo bản cấu hình được chốt vào dự án. Độ dài chu kỳ hiện được lưu và kiểm tra logic nhưng chưa tự thay đổi cấu trúc hồ sơ GS1/GS2. Quy tắc đánh số chỉ hiển thị các đối tượng hệ thống đang thực sự sử dụng."
          />
        </div>
      ),
    },
    {
      key: "programs",
      label: "Chương trình & tiêu chuẩn",
      children: (
        <>
          <Alert
            showIcon
            type="info"
            style={{ marginBottom: 12 }}
            message="Chỉ cần nhớ: QMS là chương trình; ISO 9001:2015 là tiêu chuẩn nằm bên trong QMS"
            description="Không tạo lại QMS khi muốn thêm ISO 9001:2015. Mỗi chương trình chỉ tạo một lần; các phiên bản tiêu chuẩn được thêm bên trong chương trình đó."
          />
          <Intro
            title="Phân biệt chương trình và tiêu chuẩn"
            what="Chương trình là lớp cha như QMS/EMS/OHSMS. Tiêu chuẩn là ISO 9001, ISO 14001, ISO 45001 và từng phiên bản/năm của chúng."
            example="QMS → ISO 9001:2015; sau này có ISO 9001:2026 thì thêm phiên bản mới dưới cùng QMS."
            effect="Hệ thống dùng cấu trúc này để chọn đúng edition, giữ lịch sử và gắn năng lực tổ chức theo tiêu chuẩn + IAF."
          />
          {foundationLoadError ? (
            <Alert
              showIcon
              type="error"
              style={{ marginBottom: 12 }}
              message="Không tải được danh sách chương trình / tiêu chuẩn"
              description={`${foundationLoadError}. Hệ thống sẽ không hiển thị “Trống” để tránh hiểu nhầm là chưa có dữ liệu.`}
              action={<Button size="small" icon={<ReloadOutlined />} onClick={() => void Promise.all([schemes.refetch(), standards.refetch()])}>Thử lại</Button>}
            />
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <Space wrap>
              <Button icon={<PlusOutlined />} type="primary" disabled={Boolean(foundationLoadError)} onClick={() => openSchemeModal()}>Thêm chương trình</Button>
              <Button icon={<PlusOutlined />} disabled={Boolean(foundationLoadError) || !(schemes.data?.length)} onClick={() => openStandardModal()}>Thêm tiêu chuẩn / phiên bản</Button>
            </Space>
            <Text type="secondary">Chương trình chỉ tạo một lần; phiên bản tiêu chuẩn được quản lý ngay bên dưới.</Text>
          </div>
          {!foundationLoadError && !foundationLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 14 }}>
              {[
                ["Chương trình", schemes.data?.length ?? 0],
                ["Tiêu chuẩn / phiên bản", standards.data?.length ?? 0],
                ["Đang áp dụng", (standards.data ?? []).filter((row) => row.status === "ACTIVE" && !dayjs(row.effective_from).isAfter(dayjs()) && (!row.withdrawn_at || dayjs(row.withdrawn_at).endOf("day").isAfter(dayjs()))).length],
                ["Chờ hiệu lực", (standards.data ?? []).filter((row) => row.status === "ACTIVE" && dayjs(row.effective_from).isAfter(dayjs())).length],
              ].map(([label, value]) => (
                <Card key={String(label)} size="small" style={{ borderRadius: 12 }}>
                  <Text type="secondary">{label}</Text>
                  <div><Text strong style={{ fontSize: 22 }}>{value}</Text></div>
                </Card>
              ))}
            </div>
          ) : null}

          {foundationLoading ? (
            <Card loading style={{ minHeight: 180 }} />
          ) : foundationLoadError ? null : (schemes.data ?? []).length === 0 ? (
            <Card>
              <Empty description="Chưa có chương trình chứng nhận">
                <Space wrap>
                  <Button onClick={() => openSchemeModal("QMS")}>Tạo QMS</Button>
                  <Button onClick={() => openSchemeModal("EMS")}>Tạo EMS</Button>
                  <Button onClick={() => openSchemeModal("OHSMS")}>Tạo OHSMS</Button>
                  <Button type="primary" onClick={() => openSchemeModal()}>Chương trình khác</Button>
                </Space>
              </Empty>
            </Card>
          ) : (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {(schemes.data ?? []).map((scheme) => {
                const schemeStandards = standardsByScheme.get(scheme.id) ?? [];
                return (
                  <Card
                    key={scheme.id}
                    size="small"
                    style={{ borderRadius: 14, overflow: "hidden" }}
                    title={<div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><Tag color="blue" style={{ margin: 0 }}>{scheme.code}</Tag><Text strong style={{ fontSize: 16 }}>{scheme.name}</Text><Status value={scheme.status} /><Text type="secondary">· {schemeStandards.length} phiên bản</Text></div>}
                    extra={<Button size="small" icon={<PlusOutlined />} onClick={() => openStandardModal(scheme.id)}>Thêm phiên bản tiêu chuẩn</Button>}
                  >
                    {schemeStandards.length ? (
                      <Space direction="vertical" size={8} style={{ width: "100%" }}>
                        {schemeStandards.map((standard) => {
                          const scheduled = standard.status === "ACTIVE" && dayjs(standard.effective_from).isAfter(dayjs());
                          const actionItems = [
                            { key: "edit", icon: <EditOutlined />, label: "Sửa thông tin" },
                            { key: "lifecycle", icon: scheduled ? <ClockCircleOutlined /> : <StopOutlined />, danger: true, label: scheduled ? "Hủy lịch áp dụng" : "Ngừng hiệu lực" },
                          ];
                          return (
                            <div
                              key={standard.id}
                              style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) auto auto", gap: 14, alignItems: "center", padding: "12px 14px", border: "1px solid #eef1f5", borderRadius: 10, background: "#fafcff" }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <Space size={8} wrap>
                                  <BookOutlined />
                                  <Text strong style={{ fontSize: 15 }}>{standardEditionLabel(standard)}</Text>
                                </Space>
                                <div style={{ marginTop: 3 }}><Text type="secondary">{standard.standard_name}</Text></div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <StandardLifecycleStatus row={standard} />
                                <div style={{ marginTop: 4 }}><Text type="secondary">Áp dụng từ {dayjs(standard.effective_from).format("DD/MM/YYYY")}</Text></div>
                              </div>
                              <Dropdown
                                trigger={["click"]}
                                menu={{
                                  items: actionItems,
                                  onClick: ({ key }) => key === "edit" ? openStandardModal(undefined, standard) : confirmStandardLifecycleAction(standard),
                                }}
                              >
                                <Button type="text" icon={<MoreOutlined />} aria-label={`Thao tác ${standardEditionLabel(standard)}`} />
                              </Dropdown>
                            </div>
                          );
                        })}
                      </Space>
                    ) : (
                      <Alert
                        type="warning"
                        showIcon
                        message={`${scheme.code} chưa có tiêu chuẩn / phiên bản`}
                        description={<Button size="small" type="link" style={{ paddingLeft: 0 }} onClick={() => openStandardModal(scheme.id)}>Thêm tiêu chuẩn đầu tiên</Button>}
                      />
                    )}
                    <Collapse
                      ghost
                      size="small"
                      style={{ marginTop: 8 }}
                      items={[{
                        key: `scheme-detail-${scheme.id}`,
                        label: "Xem thông tin chương trình",
                        children: (
                          <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }}>
                            <Descriptions.Item label="Mã">{scheme.code}</Descriptions.Item>
                            <Descriptions.Item label="Số tiêu chuẩn">{schemeStandards.length}</Descriptions.Item>
                            <Descriptions.Item label="Số cấu hình">{scheme._count?.configurations ?? 0}</Descriptions.Item>
                            <Descriptions.Item label="Hiệu lực">{scheme.effective_from ? dayjs(scheme.effective_from).format("DD/MM/YYYY") : "Từ khi tạo"} → {scheme.effective_to ? dayjs(scheme.effective_to).format("DD/MM/YYYY") : "không giới hạn"}</Descriptions.Item>
                          </Descriptions>
                        ),
                      }]}
                    />
                  </Card>
                );
              })}
            </Space>
          )}

          {(standards.data ?? []).length ? (
            <Collapse
              size="small"
              style={{ marginTop: 12 }}
              items={[{
                key: "all-standards-table",
                label: `Xem bảng tất cả tiêu chuẩn / phiên bản (${standards.data?.length ?? 0})`,
                children: (
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={standards.data ?? []}
                    columns={[
                      { title: "Chương trình", render: (_, row: Standard) => <Tag>{row.scheme.code}</Tag>, width: 120 },
                      { title: "Tiêu chuẩn / phiên bản", render: (_, row: Standard) => <div><Text strong>{standardEditionLabel(row)}</Text><div><Text type="secondary">{row.standard_name}</Text></div></div> },
                      { title: "Hiệu lực từ", dataIndex: "effective_from", render: (value) => dayjs(value).format("DD/MM/YYYY"), width: 130 },
                      { title: "Trạng thái", render: (_, row: Standard) => <StandardLifecycleStatus row={row} />, width: 210 },
                      { title: "", width: 52, render: (_, row: Standard) => <Button type="text" icon={<EditOutlined />} onClick={() => openStandardModal(undefined, row)} aria-label={`Sửa ${standardEditionLabel(row)}`} /> },
                    ]}
                  />
                ),
              }]}
            />
          ) : null}
        </>
      ),
    },
    { key: "taxonomy", label: "Phân loại ngành ISIC / NACE / IAF", children: <IndustryTaxonomyPanel /> },
    {
      key: "rules",
      label: "Chu kỳ & quy tắc chứng nhận",
      children: (
        <>
          <Intro
            title="Bộ quy tắc này dùng để làm gì?"
            what="Mỗi chương trình có thể có nhiều phiên bản quy tắc theo thời gian. Mỗi phiên bản mô tả chu kỳ chứng nhận và các loại đánh giá/quyết định mà chương trình yêu cầu."
            example="QMS v1: chu kỳ 36 tháng; giám sát 12 tháng/lần; chứng chỉ 36 tháng; có Giai đoạn 1; yêu cầu GĐ1, GĐ2, giám sát, tái chứng nhận."
            effect="Phiên bản áp dụng theo ngày hiệu lực được chốt vào dự án mới tại thời điểm tạo. Thay đổi phiên bản sau này không làm thay đổi lịch sử dự án cũ."
          />
          <Alert
            showIcon
            type="info"
            style={{ marginBottom: 12 }}
            message="Admin thiết lập trực tiếp; hệ thống tự quản lý ngày hiệu lực và lịch sử"
            description="Không có bước phê duyệt riêng cho cấu hình. Giai đoạn 1, khoảng giám sát, thời hạn chứng chỉ, cửa sổ tái chứng nhận và mốc nhắc vận hành được lấy từ bản cấu hình đã chốt của dự án. Dự án đã tạo không bị đổi khi áp dụng phiên bản mới. Độ dài chu kỳ chưa tự sinh thêm hồ sơ giám sát; cấu trúc GS1/GS2 vẫn được khóa bởi quy trình hiện hành để tránh thay đổi ngoài kiểm soát."
          />
          {readiness.data?.runtime_wiring?.length ? (
            <Collapse
              size="small"
              style={{ marginBottom: 12 }}
              items={[{
                key: "runtime-wiring",
                label: "Xem trường nào đang tác động thật đến hệ thống",
                children: (
                  <Descriptions bordered size="small" column={1}>
                    {readiness.data.runtime_wiring.map((item) => (
                      <Descriptions.Item key={item.field} label={runtimeFieldLabels[item.field] ?? item.field}>
                        <Tag color={item.status === "ENFORCED" ? "green" : "default"}>{item.status === "ENFORCED" ? "Đang dùng thật" : "Chỉ chốt theo dự án"}</Tag>
                        <Text>{item.effect}</Text>
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                ),
              }]}
            />
          ) : null}
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setConfigOpen(true)} style={{ marginBottom: 12 }}>Tạo phiên bản quy tắc</Button>
          <Table
            rowKey="id"
            dataSource={configs.data ?? []}
            expandable={{
              expandedRowRender: (row: SchemeConfig) => (
                <Descriptions bordered size="small" column={{ xs: 1, md: 2, lg: 3 }}>
                  <Descriptions.Item label="Chu kỳ chứng nhận">{row.cycle_duration_months} tháng <Tag>Chốt theo dự án</Tag></Descriptions.Item>
                  <Descriptions.Item label="Giám sát định kỳ">Mỗi {row.surveillance_frequency_months} tháng <Tag color="green">Đang dùng thật</Tag></Descriptions.Item>
                  <Descriptions.Item label="Thời hạn chứng chỉ">{row.validity_duration_months} tháng <Tag color="green">Đang dùng thật</Tag></Descriptions.Item>
                  <Descriptions.Item label="Cửa sổ tái chứng nhận">{row.renewal_window_days} ngày trước hết hạn <Tag color="green">Đang dùng thật</Tag></Descriptions.Item>
                  <Descriptions.Item label="Nhắc vận hành">{row.reminder_lead_days} ngày trước mốc <Tag color="green">Đang dùng thật</Tag></Descriptions.Item>
                  <Descriptions.Item label="Giai đoạn 1">{row.stage1_applicable ? "Có áp dụng" : "Không áp dụng"} <Tag color="green">Đang dùng thật</Tag></Descriptions.Item>
                  <Descriptions.Item label="Danh mục loại đánh giá" span={3}>{toList(row.required_audit_types).map((value) => <Tag key={value}>{auditTypeLabels[value] ?? value}</Tag>)} <Tag>Chốt theo dự án</Tag></Descriptions.Item>
                  <Descriptions.Item label="Danh mục loại quyết định" span={3}>{toList(row.required_decision_types).map((value) => <Tag key={value}>{decisionTypeLabels[value] ?? value}</Tag>)} <Tag>Chốt theo dự án</Tag></Descriptions.Item>
                </Descriptions>
              ),
            }}
            columns={[
              { title: "Chương trình", render: (_, row: SchemeConfig) => <Tag>{row.scheme.code}</Tag>, width: 120 },
              { title: "Phiên bản", dataIndex: "version_no", render: (value) => `v${value}`, width: 90 },
              { title: "Chu kỳ", render: (_, row: SchemeConfig) => `${row.cycle_duration_months} tháng`, width: 110 },
              { title: "Giám sát", render: (_, row: SchemeConfig) => `${row.surveillance_frequency_months} tháng/lần`, width: 130 },
              { title: "Chứng chỉ", render: (_, row: SchemeConfig) => `${row.validity_duration_months} tháng`, width: 110 },
              { title: "Hiệu lực", render: (_, row: SchemeConfig) => `${dayjs(row.effective_from).format("DD/MM/YYYY")} → ${row.effective_to ? dayjs(row.effective_to).format("DD/MM/YYYY") : "không giới hạn"}` },
              { title: "Trạng thái", render: (_, row: SchemeConfig) => <SchemeConfigurationStatus row={row} />, width: 190 },
              { title: "Thao tác", width: 180, render: (_, row: SchemeConfig) => row.status === "DRAFT" ? <Button size="small" onClick={() => applyLegacyDraftConfiguration(row)}>Áp dụng bản nháp cũ</Button> : row.status === "ACTIVE" && dayjs(row.effective_from).isAfter(dayjs()) ? <Button size="small" danger onClick={() => cancelScheduledConfiguration(row)}>Hủy lịch áp dụng</Button> : null },
            ]}
          />
        </>
      ),
    },
    {
      key: "numbering",
      label: "Quy tắc đánh số",
      children: (
        <section className="numbering-workspace" aria-label="Quy tắc đánh số">
          <div className="numbering-workspace__header">
            <div>
              <Title level={4}>Quy tắc cấp số tự động</Title>
              <Text type="secondary">Mỗi loại hồ sơ có thể dùng một dãy số riêng theo tiền tố + năm nghiệp vụ + số thứ tự. Thay đổi quy tắc chỉ áp dụng cho số phát sinh mới.</Text>
            </div>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => setNumberingOpen(true)} disabled={!numberingOptions.length}>
              Thêm quy tắc
            </Button>
          </div>

          <div className="numbering-overview" aria-label="Tổng quan quy tắc đánh số">
            <div>
              <Text type="secondary">Đang dùng</Text>
              <strong>{numberingGroups.current.length}</strong>
            </div>
            <div>
              <Text type="secondary">Đã lên lịch</Text>
              <strong>{numberingGroups.scheduled.length}</strong>
            </div>
            <div>
              <Text type="secondary">Cần thiết lập</Text>
              <strong>{readiness.data?.numbering.missing_entity_types?.length ?? 0}</strong>
            </div>
          </div>

          {(readiness.data?.numbering.reasons ?? []).length ? (
            <Alert
              className="numbering-readiness-alert"
              type={(readiness.data?.numbering.reasons ?? []).some((item) => item.blocking) ? "warning" : "info"}
              showIcon
              title="Một số loại hồ sơ chưa có quy tắc đánh số"
              description={(readiness.data?.numbering.reasons ?? [])
                .map((item) => item.label)
                .join(" · ")}
            />
          ) : null}

          <Collapse
            className="numbering-scope"
            ghost
            size="small"
            items={[{
              key: "scope",
              label: "Phạm vi áp dụng & cơ chế cấp số hiện tại",
              children: (
                <div className="numbering-scope__content">
                  <div>
                    <Text strong>Cấu hình tại màn này</Text>
                    <div className="numbering-scope__tags">
                      {(numberingCapabilities.data?.configurable_entities ?? []).map((item) => (
                        <Tag key={item.entity_type}>{item.label}</Tag>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Text strong>Workflow đang quản lý riêng</Text>
                    <div className="numbering-scope__notes">
                      {(numberingCapabilities.data?.non_configurable_entities ?? []).map((item) => (
                        <div key={item.entity_type}><Text type="secondary">{item.label}: {item.reason}</Text></div>
                      ))}
                      <div><Text type="secondary">Quyết định chỉ định đoàn, Quyết định chứng nhận và Thông báo kết quả hiện nhập số tại chính workflow phát hành tương ứng.</Text></div>
                    </div>
                  </div>
                </div>
              ),
            }]}
          />

          <Tabs
            className="numbering-tabs"
            size="small"
            items={[
              { key: "current", label: `Đang dùng (${numberingGroups.current.length})`, children: numberingTable(numberingGroups.current, "Chưa có quy tắc đang dùng") },
              { key: "scheduled", label: `Đã lên lịch (${numberingGroups.scheduled.length})`, children: numberingTable(numberingGroups.scheduled, "Chưa có quy tắc đã lên lịch") },
              { key: "history", label: `Lịch sử (${numberingGroups.historical.length})`, children: numberingTable(numberingGroups.historical, "Chưa có lịch sử thay đổi") },
            ]}
          />
        </section>
      ),
    },
    {
      key: "organization",
      label: "Tổ chức & thương hiệu",
      children: (
        <section className="organization-workspace" aria-label="Tổ chức và nhận diện">
          <Form className="organization-form" form={profileForm} layout="vertical" onFinish={(values) => saveProfile.mutate(values)}>
            {!readiness.data?.organization.ready ? (
              <div className="organization-status organization-status--attention" role="status">
                <div className="organization-status__copy">
                  <Text strong>Cần hoàn tất hồ sơ tổ chức</Text>
                  <Text type="secondary">{(readiness.data?.organization.reasons ?? []).length} mục cần xử lý trước khi cấu hình này sẵn sàng.</Text>
                </div>
                <div className="organization-status__issues">
                  {(readiness.data?.organization.reasons ?? []).map((reason) => (
                    <Tag key={reason.code} color="orange">{organizationReasonLabels[reason.field] ?? reason.field}</Tag>
                  ))}
                </div>
              </div>
            ) : (
              <div className="organization-status organization-status--ready" role="status">
                <Text strong>Hồ sơ tổ chức đã sẵn sàng</Text>
                <Text type="secondary">Thông tin nhận diện và thiết lập vận hành bắt buộc đã đầy đủ.</Text>
              </div>
            )}

            <div className="organization-form__section">
              <div className="organization-form__section-heading">
                <div>
                  <Text strong>Thông tin tổ chức</Text>
                  <Text type="secondary">Thông tin pháp lý và tên hiển thị được dùng xuyên suốt CMP.</Text>
                </div>
              </div>
              <div className="organization-form__grid">
                <Form.Item name="legal_name" label="Tên pháp lý" rules={[{ required: true, message: "Nhập tên pháp lý" }]}><Input placeholder="CÔNG TY TNHH ABC CERTIFICATION VIỆT NAM" /></Form.Item>
                <Form.Item name="display_name" label="Tên hiển thị" rules={[{ required: true, message: "Nhập tên hiển thị" }]}><Input placeholder="ABC Certification Việt Nam" /></Form.Item>
                <Form.Item name="short_name" label="Tên viết tắt" rules={[{ required: true, message: "Nhập tên viết tắt" }]}><Input placeholder="ABC Cert" /></Form.Item>
                <Form.Item name="portal_title" label="Tiêu đề cổng khách hàng" rules={[{ required: true, message: "Nhập tiêu đề cổng khách hàng" }]}><Input placeholder="Cổng thông tin khách hàng ABC Certification" /></Form.Item>
              </div>

              <div className="organization-form__subheading">
                <Text strong>Liên hệ</Text>
                <Text type="secondary">Thông tin liên hệ chính thức của tổ chức chứng nhận.</Text>
              </div>
              <div className="organization-form__grid">
                <Form.Item name="email" label="Thư điện tử" rules={[{ type: "email", message: "Email không hợp lệ" }]}><Input placeholder="certification@abc.vn" /></Form.Item>
                <Form.Item name="phone" label="Điện thoại"><Input placeholder="+84 24 1234 5678" /></Form.Item>
                <Form.Item name="website" label="Trang web"><Input placeholder="https://abc.vn" /></Form.Item>
                <Form.Item name="address" label="Địa chỉ" className="organization-form__address"><Input placeholder="Địa chỉ trụ sở của tổ chức chứng nhận" /></Form.Item>
              </div>
            </div>

            <div className="organization-form__section">
              <div className="organization-form__section-heading">
                <div>
                  <Text strong>Thiết lập vận hành</Text>
                  <Text type="secondary">Các thiết lập có tác động trực tiếp đến mốc thời gian trong CMP.</Text>
                </div>
              </div>
              <div className="organization-form__grid organization-form__grid--operations">
                <Form.Item name="timezone" label="Múi giờ nghiệp vụ" extra="Việt Nam dùng Asia/Ho_Chi_Minh." rules={[{ required: true, message: "Chọn múi giờ" }]}>
                  <Select showSearch optionFilterProp="label" options={organizationTimezoneOptions} placeholder="Chọn múi giờ" />
                </Form.Item>
                <Form.Item name="certificate_reminder_days" label="Mốc nhắc hết hạn chứng chỉ" extra="Baseline cho hồ sơ cũ/chưa có bản chốt quy tắc chương trình." rules={[{ required: true, message: "Nhập số ngày" }]}>
                  <InputNumber min={0} max={3650} precision={0} addonAfter="ngày" style={{ width: "100%" }} />
                </Form.Item>
              </div>
              <Collapse className="organization-compatibility" ghost size="small" items={[{
                key: "compatibility",
                label: "Thông tin tương thích hệ thống",
                children: <Text type="secondary">CMP V1 hiện cố định giao diện tiếng Việt, locale vi-VN và định dạng ngày DD/MM/YYYY. Logo, chân trang và thời hạn lưu tệp cũ được giữ để tương thích dữ liệu nhưng chưa phải thiết lập runtime.</Text>,
              }]} />
            </div>

            <div className="organization-form__actions">
              <Button htmlType="submit" type="primary" loading={saveProfile.isPending}>Lưu thông tin tổ chức</Button>
              {!readiness.data?.organization.ready ? <Text type="secondary">Lưu sẽ chuẩn hóa cấu hình V1 hiện tại.</Text> : null}
            </div>
          </Form>
        </section>
      ),
    },
    {
      key: "import",
      label: "Trung tâm nhập dữ liệu",
      children: (
        <>
          <Intro
            title="Khi nào dùng Trung tâm nhập dữ liệu?"
            what="Dùng khi có danh mục lớn cần nạp hàng loạt bằng CSV. Với vài bản ghi đơn lẻ, nên nhập trực tiếp ở tab tương ứng."
            example="Nạp danh mục ISIC/NACE, bảng quy đổi ISIC→NACE hoặc NACE→IAF."
            effect="Kiểm tra/Xem trước → Lưu dữ liệu. Riêng mapping: Lưu bản nháp → Xem xét → Công bố để đưa vào vận hành. Preview không sửa dữ liệu master."
          />
          <Alert showIcon type="warning" message="KIỂM TRA → LƯU → XEM XÉT / CÔNG BỐ MAPPING" description="Hỗ trợ dữ liệu chương trình, phiên bản tiêu chuẩn và phân loại ngành. Mapping đã lưu vẫn là bản nháp cho đến khi công bố. Chương trình và phiên bản tiêu chuẩn được tạo ở trạng thái hoạt động, áp dụng theo ngày hiệu lực. IAF và mã ngành được thêm vào danh mục hoạt động; không tự tạo mapping." />
          <Space align="start" wrap style={{ margin: "16px 0" }}>
            <div>
              <Text strong>1. Chọn loại dữ liệu</Text>
              <div style={{ marginTop: 6 }}><Select style={{ minWidth: 260 }} value={importEntity} onChange={setImportEntity} options={["SCHEME", "STANDARD_EDITION", "IAF_SCOPE", "INDUSTRY_CLASSIFICATION", "ISIC_NACE_MAPPING", "NACE_IAF_MAPPING"].map((value) => ({ value, label: importEntityLabels[value] ?? value }))} /></div>
            </div>
            <div>
              <Text strong>2. Chọn tệp CSV</Text>
              <Upload.Dragger accept=".csv,text/csv" beforeUpload={() => false} fileList={importFiles} maxCount={1} onChange={({ fileList }) => setImportFiles(fileList)} style={{ width: 360, marginTop: 6 }}><InboxOutlined /><p>Chọn hoặc kéo tệp CSV vào đây</p></Upload.Dragger>
            </div>
            <Space direction="vertical" style={{ paddingTop: 26 }}>
              <Button icon={<DownloadOutlined />} onClick={downloadImportTemplate}>Tải tệp mẫu CSV</Button>
              <Button type="primary" icon={<UploadOutlined />} loading={validateImport.isPending} onClick={() => validateImport.mutate(undefined)}>Kiểm tra / Xem trước</Button>
            </Space>
          </Space>
          {selectedImportDefinition ? <Alert
            showIcon
            type="info"
            style={{ marginBottom: 12 }}
            message={`Cấu trúc tệp: ${importEntityLabels[importEntity] ?? importEntity}`}
            description={<div><div>Header phải đúng thứ tự như sau:</div><div style={{ marginTop: 6 }}><Text code>{selectedImportDefinition.columns.join(",")}</Text></div>{importEntity === "INDUSTRY_CLASSIFICATION" ? <div style={{ marginTop: 6 }}>Danh mục ISIC/NACE: <Text code>classification_type</Text> phải là ISIC hoặc NACE và revision phải đúng bộ dữ liệu đang dùng.</div> : null}{importEntity === "ISIC_NACE_MAPPING" ? <div style={{ marginTop: 6 }}>Bảng quy đổi ISIC → NACE: <Text code>mapping_type</Text> nhận EXACT, PARTIAL hoặc ONE_TO_MANY.</div> : null}</div>}
          /> : null}
          <Table rowKey="id" dataSource={imports.data ?? []} columns={[
            { title: "Tệp", dataIndex: "source_file_name" },
            { title: "Loại dữ liệu", dataIndex: "entity_type", render: (value) => importEntityLabels[value] ?? value },
            { title: "Kết quả kiểm tra", render: (_, row: ImportJob) => `${row.valid_rows} hợp lệ / ${row.invalid_rows} lỗi / ${row.duplicate_rows} trùng` },
            { title: "Trạng thái lưu", render: (_, row: ImportJob) => row.status === "COMMITTED" ? "Đã lưu · Mở chi tiết để kiểm tra vận hành" : <Status value={row.status} /> },
            { title: "", render: (_, row: ImportJob) => <Button onClick={() => setSelectedImportJob(row.id)}>Xem kết quả / Tiếp tục</Button> },
          ]} />
        </>
      ),
    },
  ];

  return (
    <Card className="system-admin-table-card">
      {contextHolder}
      <ImportJobDetails id={selectedImportJob} onClose={() => setSelectedImportJob(null)} />
      {!routeMode ? <div className="page-heading page-heading-v2">
        <div>
          <span className="eyebrow">THIẾT LẬP NGHIỆP VỤ & DỮ LIỆU NỀN</span>
          <Title level={3}>Cấu hình hệ thống chứng nhận</Title>
          <Text type="secondary">Mỗi mục bên dưới đều giải thích “là gì – ví dụ – ảnh hưởng ở đâu”. Cấu hình theo phiên bản để hồ sơ lịch sử không bị thay đổi khi quy tắc mới có hiệu lực.</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void invalidate()}>Làm mới</Button>
      </div> : null}
      {foundationLoadError ? (
        <Alert
          showIcon
          type="error"
          style={{ marginBottom: 12 }}
          message="Không kết nối / không tải được dữ liệu cấu hình"
          description="Khi backend không phản hồi, CMP sẽ báo lỗi rõ ràng và không hiển thị danh sách 'Trống'. Hãy khởi động backend hoặc bấm Làm mới sau khi kết nối lại."
          action={<Button size="small" icon={<ReloadOutlined />} onClick={() => void invalidate()}>Làm mới</Button>}
        />
      ) : null}
      {routeMode
        ? tabItems.find((item) => item.key === activeTab)?.children
        : <Tabs activeKey={activeTab} onChange={(key) => setInternalActiveTab(key as MasterDataConfigurationSection)} items={tabItems} />}

      <Modal open={schemeOpen} onCancel={() => setSchemeOpen(false)} footer={null} title="Thêm chương trình chứng nhận" width={640}>
        <Alert showIcon type="info" message="Chỉ tạo chương trình một lần" description="Ví dụ: QMS chỉ có một chương trình. ISO 9001:2015 và ISO 9001:2026 là các phiên bản tiêu chuẩn nằm bên trong QMS, không phải chương trình mới." style={{ marginBottom: 12 }} />
        <Space wrap style={{ marginBottom: 12 }}>
          <Text type="secondary">Điền nhanh:</Text>
          <Button size="small" onClick={() => openSchemeModal("QMS")}>QMS</Button>
          <Button size="small" onClick={() => openSchemeModal("EMS")}>EMS</Button>
          <Button size="small" onClick={() => openSchemeModal("OHSMS")}>OHSMS</Button>
        </Space>
        <Form form={schemeForm} layout="vertical" onFinish={(values) => createScheme.mutate(values)}>
          <Form.Item name="code" label="Mã chương trình" extra="Mã ngắn, ổn định; ví dụ QMS, EMS, OHSMS." rules={[{ required: true }]}><Input placeholder="QMS" /></Form.Item>
          <Form.Item name="name" label="Tên chương trình" rules={[{ required: true }]}><Input placeholder="Hệ thống quản lý chất lượng" /></Form.Item>
          <Collapse
            size="small"
            style={{ marginBottom: 12 }}
            items={[{
              key: "scheme-description",
              label: "Thêm mô tả (không bắt buộc)",
              children: <Form.Item name="description" label="Mô tả" style={{ marginBottom: 0 }}><Input.TextArea rows={3} placeholder="Mô tả ngắn về chương trình" /></Form.Item>,
            }]}
          />
          <Button htmlType="submit" type="primary" loading={createScheme.isPending}>Lưu chương trình</Button>
        </Form>
      </Modal>

      <Modal
        open={standardOpen}
        onCancel={() => { setStandardOpen(false); setEditingStandard(null); standardForm.resetFields(); }}
        footer={null}
        title={editingStandard ? `Sửa ${standardEditionLabel(editingStandard)}` : "Thêm tiêu chuẩn / phiên bản"}
        width={680}
      >
        <Alert
          showIcon
          type={editingStandard ? "info" : "success"}
          message={editingStandard ? "Sửa sai trực tiếp, không cần tạo lại" : "Ví dụ đúng"}
          description={editingStandard ? "Có thể sửa mã, edition, tên hoặc ngày áp dụng. Hồ sơ đã chốt trước đó vẫn giữ snapshot lịch sử; hệ thống không xóa bản ghi." : "QMS → ISO 9001 → phiên bản 2015. Sau khi lưu, CMP hiển thị gọn là ISO 9001:2015."}
          style={{ marginBottom: 12 }}
        />
        <Form form={standardForm} layout="vertical" onFinish={(values) => saveStandard.mutate(values)}>
          <Form.Item name="scheme_id" label="Thuộc chương trình" extra="Ví dụ ISO 9001 thuộc QMS." rules={[{ required: true }]}><Select options={schemeOptions} placeholder="Chọn chương trình..." /></Form.Item>
          <div className="system-admin-form-grid">
            <Form.Item name="standard_code" label="Mã tiêu chuẩn" extra="Nhập ISO 9001. Nếu lỡ nhập ISO 9001:2015, hệ thống sẽ tự tách năm khỏi mã." rules={[{ required: true }]}><Input placeholder="ISO 9001" /></Form.Item>
            <Form.Item name="edition" label="Phiên bản / năm" extra="Ví dụ: 2015 hoặc 2026." rules={[{ required: true }]}><Input placeholder="2015" /></Form.Item>
          </div>
          <Form.Item name="standard_name" label="Tên tiêu chuẩn" rules={[{ required: true }]}><Input placeholder="Hệ thống quản lý chất lượng – Các yêu cầu" /></Form.Item>
          <Form.Item name="effective_from" label="Được áp dụng từ ngày" extra="Nếu ngày này ở tương lai, trạng thái phải hiển thị Chờ hiệu lực cho đến đúng ngày." rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Ví dụ: 01/01/2026" /></Form.Item>
          {editingStandard ? (
            <Collapse
              size="small"
              style={{ marginBottom: 14 }}
              items={[{
                key: "standard-advanced",
                label: "Thông tin nâng cao",
                children: <Form.Item name="withdrawn_at" label="Ngày thu hồi / ngừng dùng" extra="Chỉ nhập khi đã có quyết định ngừng sử dụng phiên bản này." style={{ marginBottom: 0 }}><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item>,
              }]}
            />
          ) : null}
          <Space>
            <Button htmlType="submit" type="primary" loading={saveStandard.isPending}>{editingStandard ? "Lưu thay đổi" : "Lưu tiêu chuẩn / phiên bản"}</Button>
            <Button onClick={() => { setStandardOpen(false); setEditingStandard(null); standardForm.resetFields(); }}>Hủy</Button>
          </Space>
        </Form>
      </Modal>

      <Modal open={configOpen} onCancel={() => setConfigOpen(false)} footer={null} title="Tạo phiên bản quy tắc chứng nhận" width={900}>
        <Alert
          showIcon
          type="info"
          message="Admin cấu hình và áp dụng trực tiếp"
          description="Không có bước phê duyệt riêng cho cấu hình hệ thống. Ví dụ QMS: chu kỳ 36 tháng · giám sát mỗi 12 tháng · chứng chỉ 36 tháng · có Giai đoạn 1 · cửa sổ tái chứng nhận 90 ngày · nhắc trước 60 ngày. Nếu ngày hiệu lực ở tương lai, hệ thống sẽ tự chờ đến ngày đó."
          style={{ marginBottom: 16 }}
        />
        <Form
          form={configForm}
          layout="vertical"
          onFinish={(values) => createConfig.mutate(values)}
          initialValues={{
            cycle_duration_months: 36,
            surveillance_frequency_months: 12,
            stage1_applicable: true,
            validity_duration_months: 36,
            renewal_window_days: 90,
            reminder_lead_days: 60,
            required_audit_types: ["INITIAL_STAGE_1", "INITIAL_STAGE_2", "SURVEILLANCE", "RECERTIFICATION"],
            required_decision_types: ["GRANT", "MAINTAIN", "RENEW"],
          }}
        >
          <Card size="small" title="1. Phiên bản và thời gian hiệu lực" style={{ marginBottom: 12 }}>
            <div className="system-admin-form-grid">
              <Form.Item name="scheme_id" label="Chương trình áp dụng" extra="Ví dụ: QMS nếu đang tạo quy tắc cho ISO 9001." rules={[{ required: true }]}><Select options={schemeOptions} placeholder="Ví dụ: QMS – Hệ thống quản lý chất lượng" /></Form.Item>
              <Form.Item name="version_no" label="Số phiên bản quy tắc" extra="Ví dụ: nhập 1 cho bộ quy tắc đầu tiên; khi thay đổi chính sách sau này tạo phiên bản 2, Không sửa đè version cũ." rules={[{ required: true }]}><InputNumber min={1} placeholder="Ví dụ: 1" style={{ width: "100%" }} /></Form.Item>
              <Form.Item name="effective_from" label="Có hiệu lực từ" extra="Ví dụ: 01/01/2026. Nếu là hôm nay hoặc đã đến ngày này, phiên bản được áp dụng ngay; nếu là ngày tương lai, hệ thống tự chờ hiệu lực." rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Ví dụ: 01/01/2026" /></Form.Item>
              <Form.Item name="effective_to" label="Có hiệu lực đến" extra="Ví dụ: 31/12/2027 nếu biết trước ngày ngừng áp dụng; thông thường để trống cho đến khi có phiên bản thay thế."><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Ví dụ: 31/12/2027 hoặc để trống" /></Form.Item>
            </div>
          </Card>
          <Card size="small" title="2. Chu kỳ chứng nhận" style={{ marginBottom: 12 }}>
            <div className="system-admin-form-grid">
              <Form.Item name="cycle_duration_months" label="Độ dài chu kỳ chứng nhận" extra="Ví dụ: nhập 36 = một chu kỳ chứng nhận kéo dài 36 tháng." rules={[{ required: true, message: "Nhập độ dài chu kỳ" }]}><InputNumber min={1} placeholder="Ví dụ: 36" addonAfter="tháng" style={{ width: "100%" }} /></Form.Item>
              <Form.Item
                name="surveillance_frequency_months"
                label="Khoảng giám sát định kỳ"
                extra="Ví dụ: nhập 12 = hệ thống đề xuất/ghi nhận giám sát mỗi 12 tháng trên hồ sơ mới."
                dependencies={["cycle_duration_months"]}
                rules={[
                  { required: true, message: "Nhập khoảng giám sát" },
                  {
                    validator: async (_, value) => {
                      const cycle = Number(configForm.getFieldValue("cycle_duration_months") ?? 0);
                      if (value && cycle && Number(value) > cycle) throw new Error("Khoảng giám sát không được dài hơn chu kỳ chứng nhận");
                    },
                  },
                ]}
              ><InputNumber min={1} placeholder="Ví dụ: 12" addonAfter="tháng/lần" style={{ width: "100%" }} /></Form.Item>
              <Form.Item
                name="validity_duration_months"
                label="Thời hạn hiệu lực chứng chỉ"
                extra="Ví dụ: nhập 36 = khi lập quyết định, hệ thống tự đề xuất ngày hết hiệu lực sau 36 tháng (trừ 1 ngày)."
                dependencies={["cycle_duration_months"]}
                rules={[
                  { required: true, message: "Nhập thời hạn chứng chỉ" },
                  {
                    validator: async (_, value) => {
                      const cycle = Number(configForm.getFieldValue("cycle_duration_months") ?? 0);
                      if (value && cycle && Number(value) > cycle) throw new Error("Thời hạn chứng chỉ không được dài hơn chu kỳ chứng nhận");
                    },
                  },
                ]}
              ><InputNumber min={1} placeholder="Ví dụ: 36" addonAfter="tháng" style={{ width: "100%" }} /></Form.Item>
              <Form.Item name="renewal_window_days" label="Cửa sổ tái chứng nhận" extra="Ví dụ: nhập 90 = từ 90 ngày trước hết hạn, chứng chỉ bắt đầu xuất hiện trong danh sách cần theo dõi/tái chứng nhận." rules={[{ required: true, message: "Nhập cửa sổ tái chứng nhận" }]}><InputNumber min={0} placeholder="Ví dụ: 90" addonAfter="ngày trước hết hạn" style={{ width: "100%" }} /></Form.Item>
              <Form.Item name="reminder_lead_days" label="Nhắc vận hành trước mốc" extra="Ví dụ: nhập 60 = notification engine bắt đầu nhắc theo baseline của dự án ở mốc 60 ngày; các mốc 30/7 ngày vẫn được giữ để cảnh báo gần hạn." rules={[{ required: true, message: "Nhập mốc nhắc vận hành" }]}><InputNumber min={0} placeholder="Ví dụ: 60" addonAfter="ngày" style={{ width: "100%" }} /></Form.Item>
              <Form.Item name="stage1_applicable" label="Có áp dụng Giai đoạn 1" extra="Ví dụ: QMS/EMS/OHSMS chứng nhận lần đầu thường chọn Có nếu workflow chương trình có GĐ1; chỉ chọn Không khi chương trình thực sự không áp dụng GĐ1." valuePropName="checked"><Switch checkedChildren="Có" unCheckedChildren="Không" /></Form.Item>
            </div>
          </Card>
          <Card size="small" title="3. Các bước nghiệp vụ bắt buộc" style={{ marginBottom: 12 }}>
            <Form.Item
              name="required_audit_types"
              label="Danh mục loại đánh giá của chương trình"
              extra="Dùng để mô tả và chốt các loại đánh giá thuộc chương trình. Hệ thống kiểm tra các mâu thuẫn cơ bản (ví dụ Giai đoạn 1/Giai đoạn 2); việc sinh hồ sơ GS1/GS2 cụ thể vẫn theo workflow hiện hành."
              dependencies={["stage1_applicable", "required_decision_types"]}
              rules={[
                { required: true, message: "Chọn ít nhất một loại đánh giá" },
                {
                  validator: async (_, value: string[] | undefined) => {
                    const selected = value ?? [];
                    const stage1 = Boolean(configForm.getFieldValue("stage1_applicable"));
                    const decisions = (configForm.getFieldValue("required_decision_types") ?? []) as string[];
                    if (stage1 && !selected.includes("INITIAL_STAGE_1")) throw new Error("Có áp dụng Giai đoạn 1 thì phải chọn đánh giá Giai đoạn 1");
                    if (!stage1 && selected.includes("INITIAL_STAGE_1")) throw new Error("Không áp dụng Giai đoạn 1 thì không được chọn đánh giá Giai đoạn 1");
                    if (decisions.includes("GRANT") && !selected.includes("INITIAL_STAGE_2")) throw new Error("Có quyết định Cấp chứng nhận thì phải chọn đánh giá Giai đoạn 2");
                  },
                },
              ]}
            >
              <Select mode="multiple" placeholder="Ví dụ: GĐ1, GĐ2, Giám sát, Tái chứng nhận" options={["INITIAL_STAGE_1", "INITIAL_STAGE_2", "SURVEILLANCE", "RECERTIFICATION", "SPECIAL"].map((value) => ({ value, label: auditTypeLabels[value] ?? value }))} />
            </Form.Item>
            <Form.Item name="required_decision_types" label="Danh mục loại quyết định của chương trình" extra="Dùng để mô tả và chốt loại quyết định thuộc chương trình. Đây không phải danh sách quyền cho phép thao tác; gate quyết định và phân tách nhiệm vụ vẫn do workflow kiểm soát." rules={[{ required: true, message: "Chọn ít nhất một loại quyết định" }]}>
              <Select mode="multiple" placeholder="Ví dụ: Cấp, Duy trì, Tái cấp / tái chứng nhận" options={["GRANT", "MAINTAIN", "RENEW", "EXTEND_SCOPE", "REDUCE_SCOPE"].map((value) => ({ value, label: decisionTypeLabels[value] ?? value }))} />
            </Form.Item>
          </Card>
          <Card size="small" title="4. Xem trước tác động trước khi lưu" style={{ marginBottom: 12 }}>
            <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
              <Descriptions.Item label="Chương trình">{selectedConfigScheme ? `${selectedConfigScheme.code} · ${selectedConfigScheme.name}` : "Chưa chọn"}</Descriptions.Item>
              <Descriptions.Item label="Phiên bản">{configVersion ? `v${configVersion}` : "Chưa nhập"}</Descriptions.Item>
              <Descriptions.Item label="Ngày bắt đầu">{configEffectiveFrom ? configEffectiveFrom.format("DD/MM/YYYY") : "Chưa chọn"}</Descriptions.Item>
              <Descriptions.Item label="Chu kỳ">{configCycle ? `${configCycle} tháng` : "—"} <Tag>Chốt theo dự án</Tag></Descriptions.Item>
              <Descriptions.Item label="Giám sát">{configSurveillance ? `${configSurveillance} tháng/lần` : "—"} <Tag color="green">Đang dùng thật</Tag></Descriptions.Item>
              <Descriptions.Item label="Chứng chỉ">{configValidity ? `${configValidity} tháng` : "—"} <Tag color="green">Đang dùng thật</Tag></Descriptions.Item>
              <Descriptions.Item label="Cửa sổ tái chứng nhận">{configRenewalWindow !== undefined ? `${configRenewalWindow} ngày` : "—"} <Tag color="green">Đang dùng thật</Tag></Descriptions.Item>
              <Descriptions.Item label="Nhắc vận hành">{configReminderLead !== undefined ? `${configReminderLead} ngày` : "—"} <Tag color="green">Đang dùng thật</Tag></Descriptions.Item>
              <Descriptions.Item label="Giai đoạn 1">{configStage1 === undefined ? "—" : configStage1 ? "Có" : "Không"} <Tag color="green">Đang dùng thật</Tag></Descriptions.Item>
              <Descriptions.Item label="Danh mục đánh giá" span={2}>{(configAuditTypes ?? []).length ? (configAuditTypes ?? []).map((value) => <Tag key={value}>{auditTypeLabels[value] ?? value}</Tag>) : "Chưa chọn"} <Tag>Chốt theo dự án</Tag></Descriptions.Item>
              <Descriptions.Item label="Danh mục quyết định" span={2}>{(configDecisionTypes ?? []).length ? (configDecisionTypes ?? []).map((value) => <Tag key={value}>{decisionTypeLabels[value] ?? value}</Tag>) : "Chưa chọn"} <Tag>Chốt theo dự án</Tag></Descriptions.Item>
            </Descriptions>
            {configPreviewWarnings.length ? (
              <Alert
                showIcon
                type="warning"
                style={{ marginTop: 12 }}
                message="Cần xem lại trước khi lưu"
                description={configPreviewWarnings.map((item) => <div key={item}>• {item}</div>)}
              />
            ) : (
              <Alert
                showIcon
                type="success"
                style={{ marginTop: 12 }}
                message="Các giá trị hiện tại không có mâu thuẫn logic cơ bản"
                description={configEffectiveFrom && configEffectiveFrom.isAfter(dayjs()) ? `Sau khi lưu, phiên bản sẽ ở trạng thái Chờ hiệu lực đến ${configEffectiveFrom.format("DD/MM/YYYY")}. Không cần bước phê duyệt riêng.` : "Sau khi lưu, Admin áp dụng trực tiếp phiên bản này. Không cần bước phê duyệt riêng."}
              />
            )}
          </Card>
          <Button htmlType="submit" type="primary" disabled={configPreviewWarnings.some((item) => !item.includes("được phép"))}>Lưu & áp dụng</Button>
        </Form>
      </Modal>

      <Modal open={numberingOpen} onCancel={() => setNumberingOpen(false)} footer={null} title="Thêm quy tắc đánh số" width={680}>
        <Alert
          showIcon
          type="info"
          message="Cách đọc số"
          description={`Tiền tố + năm nghiệp vụ + số thứ tự. Ví dụ: ${buildNumberingPreview(numberingPrefix, numberingPadding, numberingPreviewYear)}. Dãy đếm được xác định bằng tiền tố đã chuẩn hóa và năm.`}
          style={{ marginBottom: 16 }}
        />
        <Form form={numberingForm} layout="vertical" onFinish={(values) => createNumbering.mutate(values)} initialValues={{ padding: 4 }}>
          <Form.Item name="entity_type" label="Loại hồ sơ được cấp số" rules={[{ required: true }]}>
            <Select placeholder="Ví dụ: Khiếu nại" loading={numberingCapabilities.isLoading} options={numberingCapabilityOptions(numberingCapabilities.data)} />
          </Form.Item>
          <Form.Item name="prefix" label="Tiền tố" extra={`Gợi ý: ${numberingCapabilities.data?.configurable_entities.find((item) => item.entity_type === numberingEntity)?.fallback_prefix ?? "CMP"}. Chỉ dùng chữ/số và ký tự . _ / -.`} rules={[{ required: true }]}><Input placeholder="CMP" /></Form.Item>
          <Form.Item name="padding" label="Số chữ số chạy" extra="Ví dụ: nhập 4 → số đầu tiên là 0001; nhập 5 → 00001." rules={[{ required: true }]}><InputNumber min={3} max={12} placeholder="Ví dụ: 4" style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="effective_from" label="Áp dụng cho số cấp từ ngày" extra="Ví dụ: 01/01/2026. Các số cấp trước ngày này không bị đổi." rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Ví dụ: 01/01/2026" /></Form.Item>
          <Form.Item name="effective_to" label="Dừng áp dụng từ sau ngày" extra="Ví dụ: 31/12/2026 nếu quy tắc chỉ dùng trong năm 2026; thường để trống nếu chưa có quy tắc thay thế."><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Ví dụ: 31/12/2026 hoặc để trống" /></Form.Item>
          <Button htmlType="submit" type="primary">Lưu quy tắc đánh số</Button>
        </Form>
      </Modal>

      <Modal
        open={Boolean(numberingAction)}
        onCancel={() => { setNumberingAction(null); numberingActionForm.resetFields(); }}
        footer={null}
        title={numberingAction?.mode === "replace" ? "Thay thế quy tắc đánh số" : numberingAction?.mode === "end" ? "Kết thúc hiệu lực quy tắc" : "Hủy lịch áp dụng quy tắc"}
        width={640}
      >
        {numberingAction ? (
          <>
            <Alert
              showIcon
              type={numberingAction.mode === "cancel" ? "warning" : "info"}
              style={{ marginBottom: 16 }}
              message={`${numberingLabel(numberingAction.row.entity_type)} · ${numberingAction.row.prefix}`}
              description={numberingAction.mode === "replace"
                ? "Quy tắc hiện tại sẽ tự kết thúc ngay trước ngày quy tắc mới bắt đầu. Lịch sử và các số đã cấp được giữ nguyên."
                : numberingAction.mode === "end"
                  ? "Chỉ ngày kết thúc được cập nhật; tiền tố và ngày bắt đầu không bị sửa hồi tố."
                  : "Quy tắc đã lên lịch sẽ chuyển sang trạng thái đã hủy, không bị xóa. Quy tắc liền trước được khôi phục thời hạn khi phù hợp."}
            />
            <Form
              form={numberingActionForm}
              layout="vertical"
              onFinish={(values) => changeNumberingLifecycle.mutate({ ...values, id: numberingAction.row.id, mode: numberingAction.mode })}
            >
              {numberingAction.mode === "replace" ? (
                <>
                  <Form.Item name="prefix" label="Tiền tố mới" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item name="padding" label="Số chữ số chạy" rules={[{ required: true }]}><InputNumber min={3} max={12} style={{ width: "100%" }} /></Form.Item>
                  <Form.Item name="effective_from" label="Ngày bắt đầu quy tắc mới" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item>
                  <Form.Item name="effective_to" label="Ngày kết thúc (nếu đã biết)"><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item>
                </>
              ) : numberingAction.mode === "end" ? (
                <Form.Item name="effective_to" label="Ngày hiệu lực cuối cùng" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item>
              ) : null}
              <Form.Item
                name="reason"
                label="Lý do thay đổi"
                rules={[
                  { required: true, message: "Nhập lý do để lưu vết kiểm toán" },
                  { validator: (_, value) => String(value ?? "").trim() ? Promise.resolve() : Promise.reject(new Error("Lý do không được để trống")) },
                ]}
              >
                <Input.TextArea rows={3} maxLength={1000} showCount placeholder="Nêu rõ lý do nghiệp vụ" />
              </Form.Item>
              <Button htmlType="submit" type="primary" danger={numberingAction.mode !== "replace"} loading={changeNumberingLifecycle.isPending}>
                {numberingAction.mode === "replace" ? "Lên lịch quy tắc mới" : numberingAction.mode === "end" ? "Kết thúc hiệu lực" : "Hủy lịch áp dụng"}
              </Button>
            </Form>
          </>
        ) : null}
      </Modal>
    </Card>
  );
}
