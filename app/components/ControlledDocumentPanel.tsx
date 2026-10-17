"use client";

import {
  BookOutlined,
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileAddOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  HistoryOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Grid,
  Input,
  Modal,
  Pagination,
  Select,
  Segmented,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { api, getErrorMessage, SESSION_STORAGE_KEY } from "../lib/api";
import { downloadDocumentFile } from "../lib/document-file-client";
import { DocumentPreviewModal, type PreviewableFile } from "./DocumentPreviewModal";

const { Text, Title } = Typography;

interface ControlledFile {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  sha256?: string | null;
}

interface LibraryVersion {
  id: string;
  revision_no: number;
  revision_label: string;
  status: string;
  issue_date?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  source_reference?: string | null;
  change_note?: string | null;
  created_by?: string | null;
  reviewed_by?: string | null;
  approved_by?: string | null;
  file?: ControlledFile | null;
}

interface LibrarySeries {
  id: string;
  library_kind: "INTERNAL" | "EXTERNAL";
  document_code: string;
  title: string;
  category?: string | null;
  issuing_body?: string | null;
  access_scope: string;
  status: string;
  versions: LibraryVersion[];
}

interface TemplateVersion {
  id: string;
  revision_no: number;
  revision_label: string;
  status: string;
  effective_date?: string | null;
  change_note?: string | null;
  token_snapshot_json?: string | null;
  validation_json?: string | null;
  created_by?: string | null;
  reviewed_by?: string | null;
  approved_by?: string | null;
  source_file?: ControlledFile | null;
}

interface TemplateSeries {
  id: string;
  template_code: string;
  template_name: string;
  document_type: string;
  scheme_code?: string | null;
  language: string;
  status: string;
  versions: TemplateVersion[];
}

interface ControlledVersion {
  id: string;
  version_no: number;
  status: string;
  template_code?: string | null;
  template_revision?: string | null;
  change_note?: string | null;
  signed_sha256?: string | null;
  source_snapshot_json?: string | null;
  generation_context_json?: string | null;
  created_at: string;
  working_file?: ControlledFile | null;
  official_file?: ControlledFile | null;
}

interface ControlledDocument {
  id: string;
  document_number: string;
  document_code: string;
  document_name: string;
  document_type: string;
  entity_type: string;
  entity_id: string;
  status: string;
  current_version_no: number;
  created_at: string;
  versions: ControlledVersion[];
}

interface FieldDefinition {
  token: string;
  label: string;
  group: string;
  example: string;
  kind?: string;
}

interface FieldCatalog {
  total: number;
  syntax: { scalar: string; repeat_row: string; note: string };
  groups: Array<{ group: string; fields: FieldDefinition[] }>;
}

interface ContextOption {
  id: string;
  label: string;
  description?: string | null;
}

interface TemplatePreviewData {
  context: { type: string; entity_id: string };
  data: {
    customer?: { name?: string; code?: string };
    application?: { code?: string; scope?: string; standard_name?: string };
    project?: { code?: string; standard_name?: string; status?: string };
    audit?: { plan_code?: string; type?: string; start_date?: string; end_date?: string };
    certificate?: { number?: string; standard_name?: string; issue_date?: string; expiry_date?: string };
    sites?: unknown[];
    audit_team?: unknown[];
  };
}

const statusLabels: Record<string, string> = {
  DRAFT: "Bản nháp",
  UNDER_REVIEW: "Chờ xác nhận nội dung",
  REVIEWED: "Chờ phê duyệt",
  APPROVED: "Chờ ban hành",
  EFFECTIVE: "Đang áp dụng",
  ISSUED: "Đã phát hành",
  SUPERSEDED: "Phiên bản cũ",
  WITHDRAWN: "Đã hủy bỏ",
  VOID: "Đã hủy",
};
const statusColors: Record<string, string> = {
  DRAFT: "default",
  UNDER_REVIEW: "processing",
  REVIEWED: "cyan",
  APPROVED: "blue",
  EFFECTIVE: "green",
  ISSUED: "green",
  SUPERSEDED: "orange",
  WITHDRAWN: "red",
  VOID: "red",
};

function statusTag(status: string) {
  return <Tag color={statusColors[status] ?? "default"}>{statusLabels[status] ?? status}</Tag>;
}

function formatDate(value?: string | null) {
  return value && dayjs(value).isValid() ? dayjs(value).format("DD/MM/YYYY") : "—";
}

function formatFileSize(value?: number | null) {
  const size = Number(value ?? 0);
  if (!size) return "—";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function integrityLabel(file?: ControlledFile | null, signedHash?: string | null) {
  if (!file?.sha256) return <Tag>Chưa có SHA-256</Tag>;
  if (signedHash && signedHash !== file.sha256) return <Tag color="red">Hash không khớp</Tag>;
  return <Tag color="green">SHA-256 hợp lệ</Tag>;
}

function currentSessionUser() {
  if (typeof window === "undefined") return { userId: "", roles: [] as string[] };
  try {
    const session = JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "{}") as { user?: { id?: string; roles?: string[] } };
    return {
      userId: session.user?.id ?? "",
      roles: (session.user?.roles ?? []).map((role) => role.toUpperCase()),
    };
  } catch {
    return { userId: "", roles: [] as string[] };
  }
}

const documentTypeOptions = [
  { value: "audit_plan_document", label: "Kế hoạch đánh giá" },
  { value: "audit_program_document", label: "Chương trình đánh giá" },
  { value: "audit_report_document", label: "Báo cáo đánh giá" },
  { value: "audit_team_assignment", label: "Phân công đoàn đánh giá" },
  { value: "technical_review_document", label: "Phiếu thẩm xét kỹ thuật" },
  { value: "certification_decision_document", label: "Quyết định chứng nhận" },
  { value: "certificate_document", label: "Chứng chỉ" },
  { value: "general_document", label: "Hồ sơ khác" },
];

function documentTypeLabel(value: string) {
  return documentTypeOptions.find((item) => item.value === value)?.label ?? value;
}


export function ControlledDocumentPanel() {
  const queryClient = useQueryClient();
  const breakpoints = Grid.useBreakpoint();
  const useCompactLibraryList = !breakpoints.lg;
  const sessionUser = useMemo(() => currentSessionUser(), []);
  const canManage = sessionUser.roles.some((role) => ["ADMIN", "STAFF"].includes(role));
  const canImportBaseline = sessionUser.roles.includes("ADMIN");
  const currentUserId = sessionUser.userId;
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [libraryModal, setLibraryModal] = useState<"INTERNAL" | "EXTERNAL" | null>(null);
  const [libraryCreateMode, setLibraryCreateMode] = useState<"BASELINE" | "NEW">("BASELINE");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateCreateMode, setTemplateCreateMode] = useState<"BASELINE" | "NEW">("BASELINE");
  const [libraryRevisionSeries, setLibraryRevisionSeries] = useState<LibrarySeries | null>(null);
  const [templateRevisionSeries, setTemplateRevisionSeries] = useState<TemplateSeries | null>(null);
  const [libraryCreateFile, setLibraryCreateFile] = useState<File | null>(null);
  const [libraryRevisionFile, setLibraryRevisionFile] = useState<File | null>(null);
  const [templateCreateFile, setTemplateCreateFile] = useState<File | null>(null);
  const [templateRevisionFile, setTemplateRevisionFile] = useState<File | null>(null);
  const [expandedLibraryKeys, setExpandedLibraryKeys] = useState<React.Key[]>([]);
  const [libraryPage, setLibraryPage] = useState(1);
  const [expandedTemplateKeys, setExpandedTemplateKeys] = useState<React.Key[]>([]);
  const [withdrawTarget, setWithdrawTarget] = useState<{ kind: "LIBRARY" | "TEMPLATE"; id: string; label: string } | null>(null);
  const [fieldDrawerOpen, setFieldDrawerOpen] = useState(false);
  const [renderVersion, setRenderVersion] = useState<TemplateVersion | null>(null);
  const [previewFile, setPreviewFile] = useState<PreviewableFile | null>(null);
  const [renderContextType, setRenderContextType] = useState("PROJECT");
  const [contextSearch, setContextSearch] = useState("");
  const [libraryForm] = Form.useForm();
  const [templateForm] = Form.useForm();
  const [libraryRevisionForm] = Form.useForm();
  const [templateRevisionForm] = Form.useForm();
  const [withdrawForm] = Form.useForm();
  const [renderForm] = Form.useForm();
  const renderEntityId = Form.useWatch("entity_id", renderForm) as string | undefined;

  const libraryQuery = useQuery({
    queryKey: ["document-control-v2", "library"],
    queryFn: async () => (await api.get<LibrarySeries[]>("/document-control/v2/library")).data,
  });
  const templatesQuery = useQuery({
    queryKey: ["document-control", "templates"],
    queryFn: async () => (await api.get<TemplateSeries[]>("/document-control/templates")).data,
  });
  const documentsQuery = useQuery({
    queryKey: ["document-control", "documents"],
    queryFn: async () => (await api.get<ControlledDocument[]>("/document-control/documents")).data,
  });
  const fieldsQuery = useQuery({
    queryKey: ["document-control-v2", "template-fields"],
    queryFn: async () => (await api.get<FieldCatalog>("/document-control/v2/template-fields")).data,
  });
  const detailQuery = useQuery({
    enabled: Boolean(selectedDocumentId),
    queryKey: ["document-control", "documents", selectedDocumentId],
    queryFn: async () => (await api.get<ControlledDocument>(`/document-control/documents/${selectedDocumentId}`)).data,
  });
  const contextQuery = useQuery({
    enabled: Boolean(renderVersion),
    queryKey: ["document-control-v2", "contexts", renderContextType, contextSearch],
    queryFn: async () => (await api.get<ContextOption[]>("/document-control/v2/template-contexts", {
      params: { type: renderContextType, search: contextSearch || undefined },
    })).data,
  });
  const previewQuery = useQuery({
    enabled: Boolean(renderVersion && renderEntityId),
    queryKey: ["document-control-v2", "preview", renderVersion?.id, renderContextType, renderEntityId],
    queryFn: async () => (await api.post<TemplatePreviewData>(`/document-control/v2/template-versions/${renderVersion!.id}/preview-data`, {
      context_type: renderContextType,
      entity_id: renderEntityId,
    })).data,
  });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["document-control-v2", "library"] }),
      queryClient.invalidateQueries({ queryKey: ["document-control", "templates"] }),
      queryClient.invalidateQueries({ queryKey: ["document-control", "documents"] }),
    ]);
  };

  const uploadFile = async (file: File, entityType: string, entityId: string, documentType: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity_type", entityType);
    formData.append("entity_id", entityId);
    formData.append("document_type", documentType);
    formData.append("file_kind", "attachment");
    return (await api.post<{ id: string }>("/document-files/upload", formData)).data;
  };

  const attachLibraryFile = async (file: File, kind: "INTERNAL" | "EXTERNAL", versionId: string) => {
    const uploaded = await uploadFile(file, "document_library_version", versionId, kind === "INTERNAL" ? "internal_document" : "external_reference");
    await api.post(`/document-control/v2/library-versions/${versionId}/file`, { file_id: uploaded.id });
  };

  const attachTemplateFile = async (file: File, versionId: string) => {
    if (![".docx", ".xlsx"].some((extension) => file.name.toLowerCase().endsWith(extension))) {
      throw new Error("Mẫu biểu phải là Word .docx hoặc Excel .xlsx");
    }
    const uploaded = await uploadFile(file, "controlled_template_version", versionId, "controlled_template_source");
    return (await api.post(`/document-control/template-versions/${versionId}/source-file`, { file_id: uploaded.id })).data as TemplateVersion;
  };

  const createLibraryMutation = useMutation({
    mutationFn: async ({ values, file, kind, mode }: { values: Record<string, unknown>; file: File; kind: "INTERNAL" | "EXTERNAL"; mode: "BASELINE" | "NEW" }) => {
      const created = (await api.post<LibrarySeries>("/document-control/v2/library", { ...values, library_kind: kind })).data;
      const version = created.versions?.[0];
      if (!version) throw new Error("Không tạo được phiên bản đầu tiên");
      await attachLibraryFile(file, kind, version.id);
      if (kind === "INTERNAL") {
        if (mode === "BASELINE") {
          await api.post(`/document-control/v2/library-versions/${version.id}/import-effective`, {
            effective_date: values.effective_date,
            expiry_date: values.expiry_date,
            note: "Tài liệu đã được phê duyệt trước khi đưa vào CMP",
          });
        } else {
          await api.post(`/document-control/v2/library-versions/${version.id}/submit-review`, { note: "Tạo mới và gửi xác nhận nội dung" });
        }
      } else {
        await api.post(`/document-control/v2/library-versions/${version.id}/effective`, {
          effective_date: values.effective_date,
          expiry_date: values.expiry_date,
          note: "Đưa tài liệu bên ngoài vào sử dụng",
        });
      }
      return created;
    },
    onSuccess: async () => {
      message.success(
        libraryModal === "EXTERNAL"
          ? "Đã thêm tài liệu bên ngoài và đưa vào sử dụng"
          : libraryCreateMode === "BASELINE"
            ? "Đã nhập tài liệu đang áp dụng"
            : "Đã tạo tài liệu mới và gửi xác nhận nội dung",
      );
      setLibraryModal(null);
      setLibraryCreateFile(null);
      libraryForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const createLibraryRevisionMutation = useMutation({
    mutationFn: async ({ series, values, file }: { series: LibrarySeries; values: Record<string, unknown>; file: File }) => {
      const version = (await api.post<LibraryVersion>(`/document-control/v2/library/${series.id}/revisions`, values)).data;
      await attachLibraryFile(file, series.library_kind, version.id);
      if (series.library_kind === "INTERNAL") {
        await api.post(`/document-control/v2/library-versions/${version.id}/submit-review`, { note: values.change_note });
      } else {
        await api.post(`/document-control/v2/library-versions/${version.id}/effective`, {
          effective_date: values.effective_date,
          expiry_date: values.expiry_date,
          note: values.change_note,
        });
      }
      return version;
    },
    onSuccess: async () => {
      message.success(libraryRevisionSeries?.library_kind === "INTERNAL" ? "Đã tạo bản cập nhật và gửi xác nhận nội dung" : "Đã cập nhật tài liệu và đưa phiên bản mới vào sử dụng");
      setLibraryRevisionSeries(null);
      setLibraryRevisionFile(null);
      libraryRevisionForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const createTemplateMutation = useMutation({
    mutationFn: async ({ values, file, mode }: { values: Record<string, unknown>; file: File; mode: "BASELINE" | "NEW" }) => {
      const { effective_date: effectiveDate, ...templateValues } = values;
      const created = (await api.post<TemplateSeries>("/document-control/templates", templateValues)).data;
      const version = created.versions?.[0];
      if (!version) throw new Error("Không tạo được phiên bản mẫu đầu tiên");
      const attached = await attachTemplateFile(file, version.id);
      let validation: { valid?: boolean; unknown_tokens?: string[] } | null = null;
      try { validation = attached.validation_json ? JSON.parse(attached.validation_json) : null; } catch { validation = null; }
      if (validation?.valid) {
        if (mode === "BASELINE") {
          await api.post(`/document-control/template-versions/${version.id}/import-effective`, {
            effective_date: effectiveDate ? dayjs(effectiveDate as dayjs.ConfigType).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
            note: "Mẫu đã được phê duyệt trước khi đưa vào CMP",
          });
        } else {
          await api.post(`/document-control/template-versions/${version.id}/submit-review`, { note: "Tạo mẫu và gửi xác nhận nội dung" });
        }
      }
      return validation;
    },
    onSuccess: async (validation) => {
      message.success(
        validation?.valid
          ? templateCreateMode === "BASELINE"
            ? "Đã nhập mẫu đang sử dụng"
            : "Đã tạo mẫu, kiểm tra đạt và gửi xác nhận nội dung"
          : "Đã tạo mẫu; cần sửa các trường dữ liệu chưa hợp lệ",
      );
      setTemplateModalOpen(false);
      setTemplateCreateFile(null);
      templateForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const createTemplateRevisionMutation = useMutation({
    mutationFn: async ({ series, values, file }: { series: TemplateSeries; values: Record<string, unknown>; file: File }) => {
      const version = (await api.post<TemplateVersion>(`/document-control/templates/${series.id}/revisions`, values)).data;
      const attached = await attachTemplateFile(file, version.id);
      let validation: { valid?: boolean } | null = null;
      try { validation = attached.validation_json ? JSON.parse(attached.validation_json) : null; } catch { validation = null; }
      if (validation?.valid) {
        await api.post(`/document-control/template-versions/${version.id}/submit-review`, { note: values.change_note });
      }
      return validation;
    },
    onSuccess: async (validation) => {
      message.success(validation?.valid ? "Đã cập nhật mẫu và gửi xác nhận nội dung" : "Đã tạo bản cập nhật; cần sửa trường dữ liệu chưa hợp lệ");
      setTemplateRevisionSeries(null);
      setTemplateRevisionFile(null);
      templateRevisionForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const withdrawMutation = useMutation({
    mutationFn: async ({ target, reason }: { target: { kind: "LIBRARY" | "TEMPLATE"; id: string; label: string }; reason: string }) => {
      const url = target.kind === "LIBRARY"
        ? `/document-control/v2/library-versions/${target.id}/withdraw`
        : `/document-control/template-versions/${target.id}/withdraw`;
      return (await api.post(url, { reason })).data;
    },
    onSuccess: async () => {
      message.success("Đã hủy bỏ/ngừng sử dụng phiên bản");
      setWithdrawTarget(null);
      withdrawForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ url, body }: { url: string; body?: Record<string, unknown> }) => (await api.post(url, body ?? {})).data,
    onSuccess: async () => { message.success("Đã cập nhật"); await refreshAll(); },
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const approveAndPublishMutation = useMutation({
    mutationFn: async ({ kind, id }: { kind: "LIBRARY" | "TEMPLATE"; id: string }) => {
      if (kind === "LIBRARY") {
        await api.post(`/document-control/v2/library-versions/${id}/approve`, { note: "Phê duyệt và ban hành" });
        return (await api.post(`/document-control/v2/library-versions/${id}/effective`, {
          effective_date: dayjs().format("YYYY-MM-DD"),
          note: "Phê duyệt và ban hành",
        })).data;
      }
      await api.post(`/document-control/template-versions/${id}/approve`, { note: "Phê duyệt và đưa vào sử dụng" });
      return (await api.post(`/document-control/template-versions/${id}/effective`, {
        effective_date: dayjs().format("YYYY-MM-DD"),
        note: "Phê duyệt và đưa vào sử dụng",
      })).data;
    },
    onSuccess: async () => { message.success("Đã phê duyệt và đưa vào sử dụng"); await refreshAll(); },
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const renderMutation = useMutation({
    mutationFn: async (values: { entity_id: string; document_name?: string; number_prefix?: string }) => (
      await api.post(`/document-control/v2/template-versions/${renderVersion!.id}/render`, {
        context_type: renderContextType,
        ...values,
      })
    ).data as ControlledDocument,
    onSuccess: async (document) => {
      message.success(`Đã sinh hồ sơ ${document.document_number}`);
      setRenderVersion(null);
      renderForm.resetFields();
      await refreshAll();
      setSelectedDocumentId(document.id);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const uploadLibraryFile = async (file: File, series: LibrarySeries, version: LibraryVersion) => {
    try {
      const uploaded = await uploadFile(file, "document_library_version", version.id, series.library_kind === "INTERNAL" ? "internal_document" : "external_reference");
      await api.post(`/document-control/v2/library-versions/${version.id}/file`, { file_id: uploaded.id });
      message.success("Đã tải tệp cho phiên bản");
      await refreshAll();
    } catch (error) { message.error(getErrorMessage(error)); }
    return false;
  };

  const uploadTemplateSource = async (file: File, version: TemplateVersion) => {
    try {
      if (![".docx", ".xlsx"].some((extension) => file.name.toLowerCase().endsWith(extension))) {
        message.error("Mẫu biểu phải là Word .docx hoặc Excel .xlsx");
        return false;
      }
      const uploaded = await uploadFile(file, "controlled_template_version", version.id, "controlled_template_source");
      const attached = await api.post(`/document-control/template-versions/${version.id}/source-file`, { file_id: uploaded.id });
      const validation = attached.data?.validation_json ? JSON.parse(attached.data.validation_json) as { valid?: boolean; unknown_tokens?: string[]; unsupported_repeat_tokens?: string[]; format?: string } : null;
      if (validation?.valid) message.success(`Đã tải mẫu ${validation.format === "XLSX" ? "Excel" : "Word"} và kiểm tra trường dữ liệu: đạt`);
      else {
        const issues = [
          ...(validation?.unknown_tokens ?? []),
          ...(validation?.unsupported_repeat_tokens ?? []).map((token) => `${token} (Excel chưa hỗ trợ dòng lặp)`),
        ];
        message.warning(`Đã tải mẫu; còn trường dữ liệu chưa hỗ trợ${issues.length ? `: ${issues.join(", ")}` : ""}`);
      }
      await refreshAll();
    } catch (error) { message.error(getErrorMessage(error)); }
    return false;
  };

  const openFile = (file?: ControlledFile | null) => {
    if (!file) return;
    setPreviewFile(file);
  };

  const downloadFile = (file?: ControlledFile | null) => {
    if (!file) return;
    void downloadDocumentFile({
      url: `/document-files/${file.id}/download`,
      filename: file.original_name,
      mimeType: file.mime_type,
    });
  };

  const canApprove = (version: { created_by?: string | null; reviewed_by?: string | null }) =>
    !currentUserId || (version.created_by !== currentUserId && version.reviewed_by !== currentUserId);

  const libraryVersionActions = (series: LibrarySeries, version: LibraryVersion) => {
    if (!canManage) return [] as ReactNode[];
    const actions: ReactNode[] = [];
    if (version.status === "DRAFT") {
      actions.push(
        <Upload key="upload" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" beforeUpload={(file) => uploadLibraryFile(file as File, series, version)} showUploadList={false}>
          <Button icon={<UploadOutlined />} size="small">{version.file ? "Thay tệp" : "Tải tệp"}</Button>
        </Upload>,
      );
      if (version.file && series.library_kind === "INTERNAL") {
        actions.push(<Button key="submit" onClick={() => actionMutation.mutate({ url: `/document-control/v2/library-versions/${version.id}/submit-review`, body: { note: "Gửi xác nhận nội dung" } })} size="small">Gửi xác nhận</Button>);
      }
      if (version.file && series.library_kind === "EXTERNAL") {
        actions.push(<Button key="effective" type="primary" onClick={() => actionMutation.mutate({ url: `/document-control/v2/library-versions/${version.id}/effective`, body: { note: "Đưa vào sử dụng" } })} size="small">Đưa vào sử dụng</Button>);
      }
    }
    if (
      canImportBaseline &&
      series.library_kind === "INTERNAL" &&
      version.revision_no === 1 &&
      series.versions.length === 1 &&
      version.file &&
      ["DRAFT", "UNDER_REVIEW", "REVIEWED", "APPROVED"].includes(version.status)
    ) {
      actions.push(<Button key="baseline" onClick={() => actionMutation.mutate({
        url: `/document-control/v2/library-versions/${version.id}/import-effective`,
        body: { effective_date: version.effective_date ?? dayjs().format("YYYY-MM-DD"), note: "Tài liệu đã được phê duyệt trước khi đưa vào CMP" },
      })} size="small">Dùng ngay (tài liệu nền)</Button>);
    }
    if (version.status === "UNDER_REVIEW") {
      actions.push(<Button key="review" type="primary" onClick={() => actionMutation.mutate({ url: `/document-control/v2/library-versions/${version.id}/review`, body: { note: "Đã xác nhận nội dung" } })} size="small">Xác nhận nội dung</Button>);
    }
    if (version.status === "REVIEWED") {
      actions.push(canApprove(version)
        ? <Button key="approve" type="primary" loading={approveAndPublishMutation.isPending} onClick={() => approveAndPublishMutation.mutate({ kind: "LIBRARY", id: version.id })} size="small">Phê duyệt & ban hành</Button>
        : <Tag key="need-other" color="orange">Cần người khác phê duyệt</Tag>);
    }
    if (version.status === "APPROVED") {
      actions.push(<Button key="effective" type="primary" onClick={() => actionMutation.mutate({ url: `/document-control/v2/library-versions/${version.id}/effective`, body: { note: "Ban hành tài liệu" } })} size="small">Ban hành</Button>);
    }
    return actions;
  };

  const libraryColumns = useMemo<TableColumnsType<LibrarySeries>>(() => [
    {
      title: "Tài liệu",
      key: "document",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Space><Text strong>{row.document_code}</Text>{row.access_scope === "RESTRICTED" ? <Tag color="orange">Hạn chế</Tag> : null}</Space>
          <Text>{row.title}</Text>
          <Text type="secondary">{row.category || "Chưa phân loại"}{row.issuing_body ? ` · ${row.issuing_body}` : ""}</Text>
        </Space>
      ),
    },
    {
      title: "Phiên bản hiện tại",
      key: "current",
      width: 230,
      render: (_, row) => {
        const effective = row.versions.find((item) => item.status === "EFFECTIVE");
        const latest = row.versions[0];
        const display = effective ?? latest;
        if (!display) return "—";
        return <Space direction="vertical" size={2}>
          <Space>{statusTag(display.status)}<Text strong>{display.revision_label}</Text></Space>
          {effective && latest?.id !== effective.id ? <Text type="secondary">Có bản mới đang xử lý: {latest.revision_label}</Text> : null}
        </Space>;
      },
    },
    {
      title: "Tệp",
      key: "file",
      width: 250,
      render: (_, row) => {
        const current = row.versions.find((item) => item.status === "EFFECTIVE") ?? row.versions[0];
        return current?.file ? <Space.Compact>
          <Button icon={<EyeOutlined />} onClick={() => openFile(current.file)} size="small">Xem</Button>
          <Button icon={<DownloadOutlined />} onClick={() => downloadFile(current.file)} size="small">Tải</Button>
        </Space.Compact> : <Tag>Chưa có tệp</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 330,
      render: (_, row) => {
        const latest = row.versions[0];
        const effective = row.versions.find((item) => item.status === "EFFECTIVE");
        const canCreateNext = !latest || ["EFFECTIVE", "SUPERSEDED", "WITHDRAWN"].includes(latest.status);
        return <Space wrap>
          <Button icon={<HistoryOutlined />} onClick={() => setExpandedLibraryKeys((keys) => keys.includes(row.id) ? keys.filter((key) => key !== row.id) : [...keys, row.id])} size="small">Lịch sử ({row.versions.length})</Button>
          {canManage && canCreateNext ? <Button icon={<PlusOutlined />} onClick={() => {
            setLibraryRevisionSeries(row);
            setLibraryRevisionFile(null);
            libraryRevisionForm.setFieldsValue({ change_note: "Cập nhật nội dung tài liệu" });
          }} size="small">Cập nhật</Button> : null}
          {canManage && effective ? <Button danger onClick={() => setWithdrawTarget({ kind: "LIBRARY", id: effective.id, label: `${row.document_code} · ${effective.revision_label}` })} size="small">Hủy bỏ</Button> : null}
        </Space>;
      },
    },
  ], [canManage, libraryRevisionForm]);

  const templateColumns = useMemo<TableColumnsType<TemplateSeries>>(() => [
    {
      title: "Mẫu biểu",
      key: "template",
      render: (_, row) => <Space direction="vertical" size={2}>
        <Text strong>{row.template_code} · {row.template_name}</Text>
        <Text type="secondary">{documentTypeLabel(row.document_type)} · {row.language.toUpperCase()}{row.scheme_code ? ` · ${row.scheme_code}` : ""}</Text>
      </Space>,
    },
    {
      title: "Phiên bản hiện tại",
      key: "revision",
      width: 260,
      render: (_, row) => {
        const current = row.versions.find((item) => item.status === "EFFECTIVE") ?? row.versions[0];
        if (!current) return "—";
        let validation: { valid?: boolean; token_count?: number } | null = null;
        try { validation = current.validation_json ? JSON.parse(current.validation_json) : null; } catch { validation = null; }
        return <Space direction="vertical" size={2}>
          <Space>{statusTag(current.status)}<Text strong>{current.revision_label}</Text></Space>
          {validation?.valid ? <Text type="secondary">{validation.token_count ?? 0} trường dữ liệu tự động</Text> : current.source_file ? <Tag color="orange">Cần kiểm tra trường dữ liệu</Tag> : <Tag>Chưa tải Word/Excel</Tag>}
        </Space>;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 380,
      render: (_, row) => {
        const latest = row.versions[0];
        const effective = row.versions.find((item) => item.status === "EFFECTIVE");
        const current = effective ?? latest;
        const canCreateNext = !latest || ["EFFECTIVE", "SUPERSEDED", "WITHDRAWN"].includes(latest.status);
        return <Space wrap>
          {current?.source_file ? <Space.Compact>
            <Button icon={<EyeOutlined />} onClick={() => openFile(current.source_file)} size="small">Xem mẫu</Button>
            <Button icon={<DownloadOutlined />} onClick={() => downloadFile(current.source_file)} size="small">Tải</Button>
          </Space.Compact> : null}
          <Button icon={<HistoryOutlined />} onClick={() => setExpandedTemplateKeys((keys) => keys.includes(row.id) ? keys.filter((key) => key !== row.id) : [...keys, row.id])} size="small">Lịch sử ({row.versions.length})</Button>
          {canManage && canCreateNext ? <Button onClick={() => {
            setTemplateRevisionSeries(row);
            setTemplateRevisionFile(null);
            templateRevisionForm.setFieldsValue({ change_note: "Cập nhật mẫu biểu" });
          }} size="small">Cập nhật mẫu</Button> : null}
          {effective ? <Button icon={<FileAddOutlined />} type="primary" onClick={() => { setRenderVersion(effective); setRenderContextType("PROJECT"); renderForm.resetFields(); }} size="small">Sinh hồ sơ</Button> : null}
          {canManage && effective ? <Button danger onClick={() => setWithdrawTarget({ kind: "TEMPLATE", id: effective.id, label: `${row.template_code} · ${effective.revision_label}` })} size="small">Hủy bỏ</Button> : null}
        </Space>;
      },
    },
  ], [canManage, renderForm, templateRevisionForm]);

  const documentColumns = useMemo<TableColumnsType<ControlledDocument>>(() => [
    { title: "Hồ sơ", key: "document", render: (_, row) => <Space direction="vertical" size={0}><Text strong>{row.document_number}</Text><Text>{row.document_name}</Text></Space> },
    { title: "Trạng thái", dataIndex: "status", width: 150, render: statusTag },
    { title: "Mẫu đã dùng", key: "template", width: 220, render: (_, row) => { const current = row.versions[0]; return current?.template_code ? <Text>{current.template_code} · {current.template_revision}</Text> : <Text type="secondary">Không sinh từ mẫu quản lý</Text>; } },
    { title: "Ngày tạo", dataIndex: "created_at", width: 150, render: formatDate },
    { title: "", key: "action", width: 100, render: (_, row) => <Button icon={<EyeOutlined />} onClick={() => setSelectedDocumentId(row.id)} size="small">Chi tiết</Button> },
  ], []);

  const renderLibraryTable = (kind: "INTERNAL" | "EXTERNAL") => {
    const rows = (libraryQuery.data ?? []).filter((row) => row.library_kind === kind);
    const pageCount = Math.max(1, Math.ceil(rows.length / 8));
    const currentPage = Math.min(libraryPage, pageCount);
    const visibleRows = rows.slice((currentPage - 1) * 8, currentPage * 8);
    const renderSeriesActions = (row: LibrarySeries) => {
      const latest = row.versions[0];
      const effective = row.versions.find((item) => item.status === "EFFECTIVE");
      const canCreateNext = !latest || ["EFFECTIVE", "SUPERSEDED", "WITHDRAWN"].includes(latest.status);
      const expanded = expandedLibraryKeys.includes(row.id);
      return <Space className={useCompactLibraryList ? "document-library-mobile-actions" : undefined} wrap>
        <Button aria-expanded={expanded} icon={<HistoryOutlined />} onClick={() => setExpandedLibraryKeys((keys) => expanded ? keys.filter((key) => key !== row.id) : [...keys, row.id])} size="small">{expanded ? "Tutup lịch sử" : `Lịch sử (${row.versions.length})`}</Button>
        {canManage && canCreateNext ? <Button icon={<PlusOutlined />} onClick={() => {
          setLibraryRevisionSeries(row);
          setLibraryRevisionFile(null);
          libraryRevisionForm.setFieldsValue({ change_note: "Cập nhật nội dung tài liệu" });
        }} size="small">Cập nhật</Button> : null}
        {canManage && effective ? <Button danger onClick={() => setWithdrawTarget({ kind: "LIBRARY", id: effective.id, label: `${row.document_code} · ${effective.revision_label}` })} size="small">Hủy bỏ</Button> : null}
      </Space>;
    };
    return <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Alert
        message={kind === "INTERNAL" ? "Tài liệu nội bộ" : "Tài liệu bên ngoài"}
        description={kind === "INTERNAL"
          ? "Tài liệu đã dùng trước CMP: nhập và dùng ngay. Tài liệu mới/cập nhật: xác nhận nội dung → người khác phê duyệt & ban hành. Phiên bản cũ tự được giữ trong lịch sử."
          : "Tải tài liệu đã mua/được phép sử dụng. Khi cập nhật phiên bản mới, CMP tự giữ bản cũ trong lịch sử và đưa bản mới vào sử dụng."}
        showIcon
        type="info"
      />
      {canManage ? <Space wrap>
        {kind === "INTERNAL" && canImportBaseline ? <Button icon={<PlusOutlined />} onClick={() => {
          setLibraryCreateMode("BASELINE");
          setLibraryModal(kind);
          setLibraryCreateFile(null);
          libraryForm.resetFields();
          libraryForm.setFieldsValue({ access_scope: "INTERNAL", revision_label: "Rev.01", effective_date: dayjs() });
        }} type="primary">Nhập tài liệu đang áp dụng</Button> : null}
        <Button icon={<FileAddOutlined />} onClick={() => {
          setLibraryCreateMode("NEW");
          setLibraryModal(kind);
          setLibraryCreateFile(null);
          libraryForm.resetFields();
          libraryForm.setFieldsValue({ access_scope: kind === "EXTERNAL" ? "RESTRICTED" : "INTERNAL", revision_label: kind === "INTERNAL" ? "Rev.01" : undefined });
        }} type={kind === "EXTERNAL" ? "primary" : "default"}>{kind === "INTERNAL" ? "Soạn tài liệu mới" : "Thêm tài liệu bên ngoài"}</Button>
      </Space> : null}
      {useCompactLibraryList ? (
        <>
          {visibleRows.length ? (
            <div aria-label={kind === "INTERNAL" ? "Danh sách tài liệu nội bộ" : "Danh sách tài liệu bên ngoài"} className="document-library-mobile-list">
              {visibleRows.map((row) => {
                const effective = row.versions.find((item) => item.status === "EFFECTIVE");
                const latest = row.versions[0];
                const current = effective ?? latest;
                const expanded = expandedLibraryKeys.includes(row.id);
                return (
                  <article className="document-library-mobile-card" key={row.id}>
                    <div className="document-library-mobile-heading">
                      <div><strong>{row.document_code}</strong><span>{row.title}</span><small>{row.category || "Chưa phân loại"}{row.issuing_body ? ` · ${row.issuing_body}` : ""}</small></div>
                      {row.access_scope === "RESTRICTED" ? <Tag color="orange">Hạn chế</Tag> : null}
                    </div>
                    <div className="document-library-mobile-meta">
                      <span><strong>Phiên bản:</strong> {current ? `${current.revision_label} · ${statusLabels[current.status] ?? current.status}` : "Chưa có phiên bản"}</span>
                      {effective && latest?.id !== effective.id ? <span><strong>Bản mới đang xử lý:</strong> {latest.revision_label}</span> : null}
                    </div>
                    {current?.file ? (
                      <Space className="document-library-mobile-file" wrap>
                        <Button icon={<EyeOutlined />} onClick={() => openFile(current.file)} size="small">Xem tệp</Button>
                        <Button icon={<DownloadOutlined />} onClick={() => downloadFile(current.file)} size="small">Tải tệp</Button>
                        <Text type="secondary">{current.file.original_name} · {formatFileSize(current.file.file_size)}</Text>
                      </Space>
                    ) : <Tag>Chưa có tệp</Tag>}
                    {renderSeriesActions(row)}
                    {expanded ? (
                      <div className="document-library-mobile-history">
                        {row.versions.map((version) => (
                          <section className="document-library-mobile-version" key={version.id}>
                            <div><Space wrap>{statusTag(version.status)}<Text strong>{version.revision_label}</Text></Space><small>Ban hành {formatDate(version.issue_date)} · Hiệu lực {formatDate(version.effective_date)}</small></div>
                            {version.file ? <Space wrap>
                              <Button icon={<EyeOutlined />} onClick={() => openFile(version.file)} size="small">Xem</Button>
                              <Button icon={<DownloadOutlined />} onClick={() => downloadFile(version.file)} size="small">Tải</Button>
                              <Text type="secondary">{version.file.original_name} · {formatFileSize(version.file.file_size)}</Text>
                            </Space> : <Tag>Chưa có tệp</Tag>}
                            <Space className="document-library-mobile-version-actions" wrap>{libraryVersionActions(row, version)}</Space>
                          </section>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : <Empty description={kind === "INTERNAL" ? "Chưa có tài liệu nội bộ" : "Chưa có tài liệu bên ngoài"} />}
          {rows.length > 8 ? <Pagination className="portal-mobile-pagination" current={currentPage} onChange={setLibraryPage} pageSize={8} responsive showSizeChanger={false} showTotal={(total) => `${total} tài liệu`} total={rows.length} /> : null}
        </>
      ) : (
        <Table
          columns={libraryColumns}
          dataSource={rows}
          loading={libraryQuery.isLoading}
          locale={{ emptyText: <Empty description={kind === "INTERNAL" ? "Chưa có tài liệu nội bộ" : "Chưa có tài liệu bên ngoài"} /> }}
          rowKey="id"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          expandable={{
            expandedRowKeys: expandedLibraryKeys,
            showExpandColumn: false,
            onExpandedRowsChange: (keys) => setExpandedLibraryKeys([...keys]),
            expandedRowRender: (series) => <Table
              columns={[
                { title: "Phiên bản", key: "rev", width: 190, render: (_: unknown, version: LibraryVersion) => <Space>{statusTag(version.status)}<Text strong>{version.revision_label}</Text></Space> },
                { title: "Ngày", key: "dates", width: 220, render: (_: unknown, version: LibraryVersion) => <Text type="secondary">Ban hành {formatDate(version.issue_date)} · Hiệu lực {formatDate(version.effective_date)}</Text> },
                { title: "Tệp", key: "file", render: (_: unknown, version: LibraryVersion) => version.file ? <Space wrap>
                  <Button icon={<EyeOutlined />} onClick={() => openFile(version.file)} size="small">Xem</Button>
                  <Button icon={<DownloadOutlined />} onClick={() => downloadFile(version.file)} size="small">Tải</Button>
                  <Text type="secondary">{version.file.original_name} · {formatFileSize(version.file.file_size)}</Text>
                </Space> : <Tag>Chưa có tệp</Tag> },
                { title: "Việc cần làm", key: "actions", width: 330, render: (_: unknown, version: LibraryVersion) => <Space wrap>{libraryVersionActions(series, version)}</Space> },
              ]}
              dataSource={series.versions}
              pagination={false}
              rowKey="id"
              size="small"
            />,
          }}
        />
      )}
    </Space>;
  };

  const error = libraryQuery.error ?? templatesQuery.error ?? documentsQuery.error ?? fieldsQuery.error;

  return <Card className="controlled-document-panel">
    <div className="controlled-document-heading">
      <div>
        <Text className="eyebrow">TÀI LIỆU & MẪU BIỂU</Text>
        <Title level={4}>Quản lý tài liệu và tạo hồ sơ nhanh</Title>
        <Text type="secondary">Thêm tài liệu đang dùng, soạn mới, cập nhật, hủy bỏ và xem/tải file đều tách rõ. Lịch sử được giữ tự động.</Text>
      </div>
      <SafetyCertificateOutlined className="controlled-document-heading-icon" />
    </div>

    {error ? <Alert message="Không thể tải dữ liệu Tài liệu & Mẫu biểu" description={getErrorMessage(error)} showIcon type="error" /> : null}

    <Tabs items={[
      { key: "internal", label: <Space><BookOutlined />Tài liệu nội bộ</Space>, children: renderLibraryTable("INTERNAL") },
      { key: "external", label: <Space><FileSearchOutlined />Tài liệu bên ngoài</Space>, children: renderLibraryTable("EXTERNAL") },
      {
        key: "templates",
        label: <Space><FileProtectOutlined />Mẫu biểu tự động</Space>,
        children: <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Alert
            message="Mẫu biểu dùng để tạo hồ sơ nhanh"
            description="Nếu đang đưa các mẫu đã dùng trước đây vào CMP, chọn Nhập mẫu đang dùng để dùng ngay. Mẫu tạo mới/cập nhật sau này mới đi qua xác nhận và phê duyệt."
            showIcon
            type="info"
          />
          <Space wrap>
            {canImportBaseline ? <Button icon={<PlusOutlined />} onClick={() => {
              setTemplateCreateMode("BASELINE");
              setTemplateModalOpen(true);
              setTemplateCreateFile(null);
              templateForm.resetFields();
              templateForm.setFieldsValue({ language: "vi", revision_label: "Rev.01", document_type: "general_document", effective_date: dayjs() });
            }} type="primary">Nhập mẫu đang dùng</Button> : null}
            {canManage ? <Button icon={<FileAddOutlined />} onClick={() => {
              setTemplateCreateMode("NEW");
              setTemplateModalOpen(true);
              setTemplateCreateFile(null);
              templateForm.resetFields();
              templateForm.setFieldsValue({ language: "vi", revision_label: "Rev.01", document_type: "general_document" });
            }}>Tạo mẫu mới</Button> : null}
            <Button icon={<FileTextOutlined />} onClick={() => setFieldDrawerOpen(true)}>Trường dữ liệu tự động ({fieldsQuery.data?.total ?? 0})</Button>
          </Space>
          <Table
            columns={templateColumns}
            dataSource={templatesQuery.data ?? []}
            loading={templatesQuery.isLoading}
            rowKey="id"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            expandable={{
              expandedRowKeys: expandedTemplateKeys,
              showExpandColumn: false,
              onExpandedRowsChange: (keys) => setExpandedTemplateKeys([...keys]),
              expandedRowRender: (series) => <Table
                columns={[
                  { title: "Phiên bản", key: "rev", width: 190, render: (_: unknown, version: TemplateVersion) => <Space>{statusTag(version.status)}<Text strong>{version.revision_label}</Text></Space> },
                  { title: "Tệp mẫu", key: "source", render: (_: unknown, version: TemplateVersion) => version.source_file ? <Space wrap>
                    <Button icon={<EyeOutlined />} onClick={() => openFile(version.source_file)} size="small">Xem</Button>
                    <Button icon={<DownloadOutlined />} onClick={() => downloadFile(version.source_file)} size="small">Tải</Button>
                    <Text type="secondary">{version.source_file.original_name}</Text>
                  </Space> : <Tag>Chưa tải Word/Excel</Tag> },
                  { title: "Trường dữ liệu", key: "validate", width: 220, render: (_: unknown, version: TemplateVersion) => {
                    let validation: { valid?: boolean; token_count?: number } | null = null;
                    try { validation = version.validation_json ? JSON.parse(version.validation_json) : null; } catch { validation = null; }
                    return validation?.valid ? <Tag color="green">Đạt · {validation.token_count ?? 0} trường</Tag> : version.source_file ? <Tag color="orange">Cần kiểm tra/sửa</Tag> : "—";
                  } },
                  { title: "Việc cần làm", key: "action", width: 420, render: (_: unknown, version: TemplateVersion) => {
                    let validation: { valid?: boolean } | null = null;
                    try { validation = version.validation_json ? JSON.parse(version.validation_json) : null; } catch { validation = null; }
                    return <Space wrap>
                      {canManage && version.status === "DRAFT" ? <Upload accept=".docx,.xlsx" beforeUpload={(file) => uploadTemplateSource(file as File, version)} showUploadList={false}><Button icon={<UploadOutlined />} size="small">{version.source_file ? "Thay Word/Excel" : "Tải Word/Excel"}</Button></Upload> : null}
                      {canManage && version.source_file && !validation?.valid ? <Button onClick={() => actionMutation.mutate({ url: `/document-control/v2/template-versions/${version.id}/validate` })} size="small">Kiểm tra trường dữ liệu</Button> : null}
                      {canManage && version.status === "DRAFT" && version.source_file && validation?.valid ? <Button onClick={() => actionMutation.mutate({ url: `/document-control/template-versions/${version.id}/submit-review`, body: { note: "Gửi xác nhận nội dung" } })} size="small">Gửi xác nhận</Button> : null}
                      {canImportBaseline && version.revision_no === 1 && series.versions.length === 1 && version.source_file && validation?.valid && ["DRAFT", "UNDER_REVIEW", "REVIEWED", "APPROVED"].includes(version.status) ? <Button onClick={() => actionMutation.mutate({ url: `/document-control/template-versions/${version.id}/import-effective`, body: { effective_date: version.effective_date ?? dayjs().format("YYYY-MM-DD"), note: "Mẫu đã được phê duyệt trước khi đưa vào CMP" } })} size="small">Dùng ngay (mẫu nền)</Button> : null}
                      {canManage && version.status === "UNDER_REVIEW" ? <Button type="primary" onClick={() => actionMutation.mutate({ url: `/document-control/template-versions/${version.id}/review`, body: { note: "Đã xác nhận nội dung" } })} size="small">Xác nhận nội dung</Button> : null}
                      {canManage && version.status === "REVIEWED" ? (canApprove(version) ? <Button type="primary" loading={approveAndPublishMutation.isPending} onClick={() => approveAndPublishMutation.mutate({ kind: "TEMPLATE", id: version.id })} size="small">Phê duyệt & đưa vào sử dụng</Button> : <Tag color="orange">Cần người khác phê duyệt</Tag>) : null}
                      {canManage && version.status === "APPROVED" ? <Button type="primary" onClick={() => actionMutation.mutate({ url: `/document-control/template-versions/${version.id}/effective`, body: { effective_date: dayjs().format("YYYY-MM-DD"), note: "Đưa mẫu vào sử dụng" } })} size="small">Đưa vào sử dụng</Button> : null}
                      {version.status === "EFFECTIVE" ? <Button icon={<FileAddOutlined />} type="primary" onClick={() => { setRenderVersion(version); setRenderContextType("PROJECT"); renderForm.resetFields(); }} size="small">Sinh hồ sơ</Button> : null}
                    </Space>;
                  } },
                ]}
                dataSource={series.versions}
                rowKey="id"
                pagination={false}
                size="small"
              />,
            }}
          />
        </Space>,
      },
      {
        key: "generated",
        label: <Space><FileDoneOutlined />Hồ sơ đã tạo</Space>,
        children: <Table columns={documentColumns} dataSource={documentsQuery.data ?? []} loading={documentsQuery.isLoading} locale={{ emptyText: <Empty description="Chưa có hồ sơ được tạo từ mẫu" /> }} pagination={{ pageSize: 8, showSizeChanger: false }} rowKey="id" scroll={{ x: 900 }} />,
      },
    ]} />

    <Modal
      open={Boolean(libraryModal)}
      title={libraryModal === "INTERNAL"
        ? libraryCreateMode === "BASELINE" ? "Nhập tài liệu đang áp dụng" : "Soạn tài liệu mới"
        : "Thêm tài liệu bên ngoài"}
      okText={libraryModal === "INTERNAL"
        ? libraryCreateMode === "BASELINE" ? "Nhập & dùng ngay" : "Lưu tài liệu mới"
        : "Lưu & đưa vào sử dụng"}
      cancelText="Đóng"
      width={640}
      confirmLoading={createLibraryMutation.isPending}
      onCancel={() => { setLibraryModal(null); setLibraryCreateFile(null); libraryForm.resetFields(); }}
      onOk={() => {
        if (!libraryModal) return;
        if (!libraryCreateFile) { message.error("Chọn tệp tài liệu trước khi lưu"); return; }
        void libraryForm.validateFields().then((values) => createLibraryMutation.mutate({
          kind: libraryModal,
          file: libraryCreateFile,
          mode: libraryCreateMode,
          values: {
            ...values,
            issue_date: values.issue_date ? dayjs(values.issue_date).format("YYYY-MM-DD") : undefined,
            effective_date: values.effective_date ? dayjs(values.effective_date).format("YYYY-MM-DD") : undefined,
            expiry_date: values.expiry_date ? dayjs(values.expiry_date).format("YYYY-MM-DD") : undefined,
          },
        }));
      }}
    >
      <Alert
        message={libraryModal === "INTERNAL"
          ? libraryCreateMode === "BASELINE" ? "Dùng cho tài liệu đã được tổ chức phê duyệt trước khi dùng CMP" : "Dùng cho tài liệu mới cần kiểm soát từ bây giờ"
          : "Ví dụ: ISO/IEC 17021-1:2015"}
        description={libraryModal === "INTERNAL"
          ? libraryCreateMode === "BASELINE"
            ? "Nhập mã, phiên bản, file và ngày hiệu lực. CMP ghi nhận đây là tài liệu nền và đưa vào sử dụng ngay; không yêu cầu phê duyệt lại."
            : "Sau khi lưu: xác nhận nội dung → một người khác phê duyệt & ban hành."
          : "Sau khi lưu, tài liệu được đưa vào sử dụng ngay và vẫn giữ đầy đủ lịch sử phiên bản."}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Form form={libraryForm} layout="vertical">
        {libraryModal === "INTERNAL" && canImportBaseline ? <Form.Item label="Cách thêm tài liệu">
          <Segmented
            block
            value={libraryCreateMode}
            onChange={(value) => {
              const mode = value as "BASELINE" | "NEW";
              setLibraryCreateMode(mode);
              if (mode === "BASELINE" && !libraryForm.getFieldValue("effective_date")) libraryForm.setFieldValue("effective_date", dayjs());
            }}
            options={[{ value: "BASELINE", label: "Đang áp dụng" }, { value: "NEW", label: "Tài liệu mới" }]}
          />
        </Form.Item> : null}
        <Form.Item label="Mã tài liệu" name="document_code" rules={[{ required: true, message: "Nhập mã tài liệu" }]}><Input placeholder={libraryModal === "INTERNAL" ? "quy tr├¼nh chß╗⌐ng nhß║¡n" : "ISO-IEC-17021-1"} /></Form.Item>
        <Form.Item label="Tên tài liệu" name="title" rules={[{ required: true, message: "Nhập tên tài liệu" }]}><Input placeholder={libraryModal === "INTERNAL" ? "Quy trình chứng nhận hệ thống quản lý" : "Đánh giá sự phù hợp – Yêu cầu đối với tổ chức chứng nhận"} /></Form.Item>
        <Form.Item label="Loại tài liệu" name="category" rules={[{ required: true, message: "Chọn loại tài liệu" }]}>
          <Select options={(libraryModal === "INTERNAL"
            ? ["Quy trình", "Quy định", "Hướng dẫn", "Chính sách", "Tài liệu khác"]
            : ["ISO", "IAF", "BoA", "Pháp luật", "Tài liệu tham chiếu khác"]
          ).map((value) => ({ value, label: value }))} placeholder="Chọn loại" />
        </Form.Item>
        {libraryModal === "EXTERNAL" ? <Form.Item label="Cơ quan ban hành" name="issuing_body" rules={[{ required: true, message: "Nhập cơ quan ban hành" }]}><Input placeholder="ISO / IAF / BoA / Chính phủ..." /></Form.Item> : null}
        <Form.Item label="Phiên bản" name="revision_label" rules={[{ required: true, message: "Nhập phiên bản" }]}><Input placeholder={libraryModal === "INTERNAL" ? "Rev.01" : "2015 / Issue 3"} /></Form.Item>
        <Form.Item label="Tệp tài liệu" required extra={libraryCreateFile ? `${libraryCreateFile.name} · ${formatFileSize(libraryCreateFile.size)}` : "PDF, Word, Excel hoặc ảnh phù hợp."}>
          <Upload beforeUpload={(file) => { setLibraryCreateFile(file as File); return false; }} maxCount={1} showUploadList={false}>
            <Button icon={<UploadOutlined />}>{libraryCreateFile ? "Chọn tệp khác" : "Chọn tệp"}</Button>
          </Upload>
        </Form.Item>
        <Collapse ghost items={[{
          key: "advanced",
          label: "Thông tin bổ sung (không bắt buộc)",
          children: <>
            {libraryModal === "EXTERNAL" || (libraryModal === "INTERNAL" && libraryCreateMode === "BASELINE") ? <>
              <Form.Item label="Ngày ban hành" name="issue_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
              <Form.Item label="Ngày hiệu lực" name="effective_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
              <Form.Item label="Ngày hết hiệu lực" name="expiry_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
              {libraryModal === "EXTERNAL" ? <Form.Item label="Nguồn/tham chiếu" name="source_reference"><Input placeholder="Nguồn mua/tải hoặc số văn bản" /></Form.Item> : null}
            </> : null}
            <Form.Item label="Quyền truy cập" name="access_scope" initialValue={libraryModal === "EXTERNAL" ? "RESTRICTED" : "INTERNAL"}><Select options={[{ value: "INTERNAL", label: "Nội bộ" }, { value: "RESTRICTED", label: "Hạn chế" }]} /></Form.Item>
            <Form.Item label="Ghi chú" name="note"><Input.TextArea rows={3} placeholder="Thông tin cần lưu ý khi sử dụng tài liệu" /></Form.Item>
          </>,
        }]} />
      </Form>
    </Modal>

    <Modal
      open={Boolean(libraryRevisionSeries)}
      title={`Cập nhật · ${libraryRevisionSeries?.document_code ?? ""}`}
      okText={libraryRevisionSeries?.library_kind === "INTERNAL" ? "Lưu & gửi xác nhận" : "Lưu & đưa vào sử dụng"}
      cancelText="Đóng"
      width={620}
      confirmLoading={createLibraryRevisionMutation.isPending}
      onCancel={() => { setLibraryRevisionSeries(null); setLibraryRevisionFile(null); libraryRevisionForm.resetFields(); }}
      onOk={() => {
        if (!libraryRevisionSeries) return;
        if (!libraryRevisionFile) { message.error("Chọn tệp phiên bản mới trước khi lưu"); return; }
        void libraryRevisionForm.validateFields().then((values) => createLibraryRevisionMutation.mutate({
          series: libraryRevisionSeries,
          file: libraryRevisionFile,
          values: {
            ...values,
            issue_date: values.issue_date ? dayjs(values.issue_date).format("YYYY-MM-DD") : undefined,
            effective_date: values.effective_date ? dayjs(values.effective_date).format("YYYY-MM-DD") : undefined,
            expiry_date: values.expiry_date ? dayjs(values.expiry_date).format("YYYY-MM-DD") : undefined,
          },
        }));
      }}
    >
      <Alert message="Chỉ cần nhập phiên bản mới, lý do thay đổi và chọn tệp mới. Bản cũ được giữ tự động trong lịch sử." type="info" showIcon style={{ marginBottom: 16 }} />
      <Form form={libraryRevisionForm} layout="vertical">
        <Form.Item label="Phiên bản mới" name="revision_label" rules={[{ required: true, message: "Nhập phiên bản mới" }]}><Input placeholder={libraryRevisionSeries?.library_kind === "EXTERNAL" ? "2026 / Issue 4" : "Rev.02"} /></Form.Item>
        <Form.Item label="Nội dung thay đổi" name="change_note" rules={[{ required: true, message: "Mô tả ngắn nội dung thay đổi" }]}><Input.TextArea rows={3} placeholder="Ví dụ: Cập nhật yêu cầu và biểu mẫu kèm theo" /></Form.Item>
        <Form.Item label="Tệp phiên bản mới" required extra={libraryRevisionFile ? `${libraryRevisionFile.name} · ${formatFileSize(libraryRevisionFile.size)}` : "Chọn file mới sẽ thay cho phiên bản hiện tại."}>
          <Upload beforeUpload={(file) => { setLibraryRevisionFile(file as File); return false; }} maxCount={1} showUploadList={false}>
            <Button icon={<UploadOutlined />}>{libraryRevisionFile ? "Chọn tệp khác" : "Chọn tệp mới"}</Button>
          </Upload>
        </Form.Item>
        {libraryRevisionSeries?.library_kind === "EXTERNAL" ? <Collapse ghost items={[{
          key: "advanced",
          label: "Ngày tháng / nguồn tham chiếu (không bắt buộc)",
          children: <>
            <Form.Item label="Ngày ban hành" name="issue_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Ngày hiệu lực" name="effective_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Ngày hết hiệu lực" name="expiry_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Nguồn/tham chiếu" name="source_reference"><Input placeholder="Nguồn mua/tải hoặc số văn bản" /></Form.Item>
          </>,
        }]} /> : null}
      </Form>
    </Modal>

    <Modal
      open={Boolean(templateRevisionSeries)}
      title={`Cập nhật mẫu · ${templateRevisionSeries?.template_code ?? ""}`}
      okText="Lưu bản cập nhật"
      cancelText="Đóng"
      width={600}
      confirmLoading={createTemplateRevisionMutation.isPending}
      onCancel={() => { setTemplateRevisionSeries(null); setTemplateRevisionFile(null); templateRevisionForm.resetFields(); }}
      onOk={() => {
        if (!templateRevisionSeries) return;
        if (!templateRevisionFile) { message.error("Chọn file Word/Excel mới trước khi lưu"); return; }
        void templateRevisionForm.validateFields().then((values) => createTemplateRevisionMutation.mutate({ series: templateRevisionSeries, values, file: templateRevisionFile }));
      }}
    >
      <Alert message="Tải file mới một lần. CMP tự kiểm tra các trường dữ liệu và gửi xác nhận nếu file đạt." type="info" showIcon style={{ marginBottom: 16 }} />
      <Form form={templateRevisionForm} layout="vertical">
        <Form.Item label="Phiên bản mới" name="revision_label" rules={[{ required: true, message: "Nhập phiên bản mới" }]}><Input placeholder="Rev.02" /></Form.Item>
        <Form.Item label="Nội dung thay đổi" name="change_note" rules={[{ required: true, message: "Mô tả nội dung thay đổi" }]}><Input.TextArea rows={3} placeholder="Ví dụ: Cập nhật bố cục và bổ sung trường ngày đánh giá" /></Form.Item>
        <Form.Item label="File Word/Excel mới" required extra={templateRevisionFile ? `${templateRevisionFile.name} · ${formatFileSize(templateRevisionFile.size)}` : "Chỉ nhận .docx hoặc .xlsx"}>
          <Upload accept=".docx,.xlsx" beforeUpload={(file) => { setTemplateRevisionFile(file as File); return false; }} maxCount={1} showUploadList={false}>
            <Button icon={<UploadOutlined />}>{templateRevisionFile ? "Chọn file khác" : "Chọn Word/Excel"}</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      open={templateModalOpen}
      title={templateCreateMode === "BASELINE" ? "Nhập mẫu đang dùng" : "Tạo mẫu mới"}
      okText={templateCreateMode === "BASELINE" ? "Nhập & dùng ngay" : "Tạo & kiểm tra mẫu"}
      cancelText="Đóng"
      width={640}
      confirmLoading={createTemplateMutation.isPending}
      onCancel={() => { setTemplateModalOpen(false); setTemplateCreateFile(null); templateForm.resetFields(); }}
      onOk={() => {
        if (!templateCreateFile) { message.error("Chọn file Word/Excel trước khi tạo mẫu"); return; }
        void templateForm.validateFields().then((values) => createTemplateMutation.mutate({ values, file: templateCreateFile, mode: templateCreateMode }));
      }}
    >
      <Alert
        message={templateCreateMode === "BASELINE" ? "Dùng cho mẫu Word/Excel đã được tổ chức ban hành trước khi dùng CMP" : "Ví dụ: F.05 – Kế hoạch đánh giá"}
        description={templateCreateMode === "BASELINE"
          ? "CMP kiểm tra trường dữ liệu rồi đưa mẫu vào sử dụng ngay nếu đạt. Không yêu cầu phê duyệt lại mẫu nền."
          : "Chọn loại hồ sơ và tải Word/Excel. CMP tự kiểm tra trường dữ liệu; mẫu mới sau đó đi qua xác nhận và phê duyệt."}
        type="info" showIcon style={{ marginBottom: 16 }}
      />
      <Form form={templateForm} layout="vertical" initialValues={{ language: "vi", revision_label: "Rev.01", document_type: "general_document" }}>
        {canImportBaseline ? <Form.Item label="Cách thêm mẫu">
          <Segmented block value={templateCreateMode} onChange={(value) => {
            const mode = value as "BASELINE" | "NEW";
            setTemplateCreateMode(mode);
            if (mode === "BASELINE" && !templateForm.getFieldValue("effective_date")) templateForm.setFieldValue("effective_date", dayjs());
          }} options={[{ value: "BASELINE", label: "Mẫu đang dùng" }, { value: "NEW", label: "Mẫu mới" }]} />
        </Form.Item> : null}
        <Form.Item label="Mã mẫu" name="template_code" rules={[{ required: true, message: "Nhập mã mẫu" }]}><Input placeholder="F.05" /></Form.Item>
        <Form.Item label="Tên mẫu" name="template_name" rules={[{ required: true, message: "Nhập tên mẫu" }]}><Input placeholder="Kế hoạch đánh giá" /></Form.Item>
        <Form.Item label="Dùng để tạo" name="document_type" rules={[{ required: true }]}><Select options={documentTypeOptions} /></Form.Item>
        <Form.Item label="File mẫu Word/Excel" required extra={templateCreateFile ? `${templateCreateFile.name} · ${formatFileSize(templateCreateFile.size)}` : "Chỉ nhận .docx hoặc .xlsx"}>
          <Upload accept=".docx,.xlsx" beforeUpload={(file) => { setTemplateCreateFile(file as File); return false; }} maxCount={1} showUploadList={false}>
            <Button icon={<UploadOutlined />}>{templateCreateFile ? "Chọn file khác" : "Chọn Word/Excel"}</Button>
          </Upload>
        </Form.Item>
        {templateCreateMode === "BASELINE" ? <Form.Item label="Ngày bắt đầu áp dụng" name="effective_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item> : null}
        <Collapse ghost items={[{
          key: "advanced",
          label: "Thông tin bổ sung",
          children: <>
            <Form.Item label="Chương trình (nếu áp dụng)" name="scheme_code"><Select allowClear options={["QMS", "EMS", "OHSMS", "IMS"].map((value) => ({ value, label: value }))} placeholder="Không bắt buộc" /></Form.Item>
            <Form.Item label="Phiên bản" name="revision_label"><Input placeholder="Rev.01" /></Form.Item>
            <Form.Item label="Ngôn ngữ" name="language"><Select options={[{ value: "vi", label: "Tiếng Việt" }, { value: "en", label: "Tiếng Anh" }, { value: "vi-en", label: "Song ngữ Việt – Anh" }]} /></Form.Item>
            <Form.Item label="Ghi chú" name="change_note"><Input.TextArea rows={2} placeholder="Tạo mới mẫu biểu" /></Form.Item>
          </>,
        }]} />
      </Form>
    </Modal>

    <Modal
      open={Boolean(withdrawTarget)}
      title={`Hủy bỏ / ngừng sử dụng · ${withdrawTarget?.label ?? ""}`}
      okText="Xác nhận hủy bỏ"
      okButtonProps={{ danger: true }}
      cancelText="Đóng"
      confirmLoading={withdrawMutation.isPending}
      onCancel={() => { setWithdrawTarget(null); withdrawForm.resetFields(); }}
      onOk={() => void withdrawForm.validateFields().then((values) => withdrawTarget && withdrawMutation.mutate({ target: withdrawTarget, reason: values.reason }))}
    >
      <Alert message="Hệ thống không xóa lịch sử. Phiên bản này chỉ được đánh dấu đã hủy/ngừng sử dụng và vẫn có thể tra cứu sau này." type="warning" showIcon style={{ marginBottom: 16 }} />
      <Form form={withdrawForm} layout="vertical">
        <Form.Item label="Lý do" name="reason" rules={[{ required: true, message: "Nhập lý do hủy bỏ" }]}><Input.TextArea rows={4} placeholder="Ví dụ: Thay bằng phiên bản mới / tài liệu không còn áp dụng" /></Form.Item>
      </Form>
    </Modal>

    <Drawer open={fieldDrawerOpen} onClose={() => setFieldDrawerOpen(false)} title="Trường dữ liệu tự động dùng trong Word/Excel" width={760}>
      {fieldsQuery.data ? <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Alert message="Cách chèn trường dữ liệu" description={<span>Trường đơn: <code>{fieldsQuery.data.syntax.scalar}</code>. Dòng bảng lặp: <code>{fieldsQuery.data.syntax.repeat_row}</code>. {fieldsQuery.data.syntax.note}</span>} type="info" showIcon />
        <Collapse items={fieldsQuery.data.groups.map((group) => ({
          key: group.group,
          label: `${group.group} · ${group.fields.length} trường`,
          children: <Table
            dataSource={group.fields}
            columns={[
              { title: "Trường", dataIndex: "label", key: "label" },
              { title: "Mã chèn vào Word/Excel", key: "token", width: 260, render: (_: unknown, field: FieldDefinition) => <Space><code>{`{{${field.token}}}`}</code><Button icon={<CopyOutlined />} onClick={() => void navigator.clipboard.writeText(`{{${field.token}}}`).then(() => message.success("Đã sao chép"))} size="small" type="text" /></Space> },
              { title: "Ví dụ", dataIndex: "example", key: "example", width: 180 },
            ]}
            pagination={false}
            rowKey="token"
            size="small"
          />,
        }))} />
      </Space> : <Empty description="Chưa tải được danh mục trường" />}
    </Drawer>

    <Modal
      open={Boolean(renderVersion)}
      title="Sinh hồ sơ"
      okText="Sinh hồ sơ"
      cancelText="Hủy"
      confirmLoading={renderMutation.isPending}
      onCancel={() => { setRenderVersion(null); renderForm.resetFields(); }}
      onOk={() => void renderForm.validateFields().then((values) => renderMutation.mutate(values))}
    >
      <Alert message={`${renderVersion?.revision_label ?? ""} · Hệ thống lưu cố định phiên bản mẫu và dữ liệu nguồn tại thời điểm tạo để truy vết`} type="success" showIcon style={{ marginBottom: 16 }} />
      <Form form={renderForm} layout="vertical">
        <Form.Item label="Lấy dữ liệu từ" required>
          <Select value={renderContextType} onChange={(value) => { setRenderContextType(value); setContextSearch(""); renderForm.setFieldValue("entity_id", undefined); }} options={[
            { value: "PROJECT", label: "Hồ sơ chứng nhận" },
            { value: "APPLICATION", label: "Đơn đăng ký" },
            { value: "AUDIT_PLAN", label: "Kế hoạch đánh giá" },
            { value: "CERTIFICATE", label: "Chứng chỉ" },
            { value: "CUSTOMER", label: "Khách hàng" },
          ]} />
        </Form.Item>
        <Form.Item label="Chọn hồ sơ / khách hàng" name="entity_id" rules={[{ required: true, message: "Chọn dữ liệu nguồn" }]} extra="Có thể gõ mã hồ sơ, tên khách hàng, số chứng chỉ... để tìm.">
          <Select
            showSearch
            filterOption={false}
            onSearch={setContextSearch}
            loading={contextQuery.isFetching}
            options={(contextQuery.data ?? []).map((item) => ({ value: item.id, label: item.label, title: item.description ?? undefined }))}
            placeholder="Tìm và chọn dữ liệu nguồn"
          />
        </Form.Item>
        {renderEntityId ? <Card size="small" title="Xem trước dữ liệu sẽ điền vào mẫu" style={{ marginBottom: 16 }} loading={previewQuery.isFetching}>
          {previewQuery.isError ? <Alert type="error" showIcon message="Không tải được dữ liệu xem trước" description={getErrorMessage(previewQuery.error)} /> : null}
          {previewQuery.data ? <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Khách hàng">{previewQuery.data.data.customer?.name || "—"}</Descriptions.Item>
            <Descriptions.Item label="Đơn / phạm vi">{[previewQuery.data.data.application?.code, previewQuery.data.data.application?.scope].filter(Boolean).join(" · ") || "—"}</Descriptions.Item>
            <Descriptions.Item label="Hồ sơ chứng nhận">{previewQuery.data.data.project?.code || "—"}</Descriptions.Item>
            <Descriptions.Item label="Kế hoạch đánh giá">{[previewQuery.data.data.audit?.plan_code, previewQuery.data.data.audit?.type, previewQuery.data.data.audit?.start_date && previewQuery.data.data.audit?.end_date ? `${previewQuery.data.data.audit.start_date} – ${previewQuery.data.data.audit.end_date}` : null].filter(Boolean).join(" · ") || "—"}</Descriptions.Item>
            <Descriptions.Item label="Chứng chỉ">{previewQuery.data.data.certificate?.number || "—"}</Descriptions.Item>
            <Descriptions.Item label="Danh sách động">{`${previewQuery.data.data.sites?.length ?? 0} địa điểm · ${previewQuery.data.data.audit_team?.length ?? 0} thành viên đoàn`}</Descriptions.Item>
          </Descriptions> : null}
        </Card> : null}
        <Collapse ghost items={[{
          key: "advanced",
          label: "Tùy chọn tên và số hồ sơ",
          children: <>
            <Form.Item label="Tên hồ sơ" name="document_name" extra="Bỏ trống để dùng tên mẫu"><Input placeholder="Ví dụ: Kế hoạch đánh giá Giai đoạn 2" /></Form.Item>
            <Form.Item label="Tiền tố số hồ sơ" name="number_prefix" extra="Bỏ trống để dùng mã mẫu"><Input placeholder="F05" /></Form.Item>
          </>,
        }]} />
      </Form>
    </Modal>

    <Drawer onClose={() => setSelectedDocumentId(null)} open={Boolean(selectedDocumentId)} title="Lịch sử hồ sơ được kiểm soát" width={820}>
      {detailQuery.isError ? <Alert message="Không thể tải lịch sử" description={getErrorMessage(detailQuery.error)} showIcon type="error" /> : null}
      {detailQuery.data ? <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Số hồ sơ">{detailQuery.data.document_number}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">{statusTag(detailQuery.data.status)}</Descriptions.Item>
          <Descriptions.Item label="Tên hồ sơ">{detailQuery.data.document_name}</Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">{formatDate(detailQuery.data.created_at)}</Descriptions.Item>
        </Descriptions>
        {detailQuery.data.versions.map((version) => <Card key={version.id} size="small" title={<Space>{statusTag(version.status)}<Text strong>Phiên bản {version.version_no}</Text></Space>}>
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Text>Mẫu đã dùng: <strong>{version.template_code ?? "—"} · {version.template_revision ?? "—"}</strong></Text>
            <Text type="secondary">{version.change_note ?? "Không có ghi chú thay đổi"}</Text>
            <Space wrap>
              {version.working_file ? <Space.Compact>
                <Button icon={<EyeOutlined />} onClick={() => openFile(version.working_file)}>Xem hồ sơ</Button>
                <Button icon={<DownloadOutlined />} onClick={() => downloadFile(version.working_file)}>Tải</Button>
              </Space.Compact> : null}
              {version.official_file ? <Space.Compact>
                <Button icon={<SafetyCertificateOutlined />} onClick={() => openFile(version.official_file)}>Xem bản chính thức</Button>
                <Button icon={<DownloadOutlined />} onClick={() => downloadFile(version.official_file)}>Tải</Button>
              </Space.Compact> : null}
              {version.official_file ? integrityLabel(version.official_file, version.signed_sha256) : version.working_file ? integrityLabel(version.working_file) : null}
            </Space>
            {version.generation_context_json ? <Alert message="Hồ sơ này giữ cố định phiên bản mẫu và dữ liệu nguồn để truy vết" type="info" showIcon /> : null}
          </Space>
        </Card>)}
      </Space> : null}
    </Drawer>
      <DocumentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
  </Card>;
}
