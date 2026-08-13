"use client";

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileSearchOutlined,
  FileWordOutlined,
  ReloadOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  SyncOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Progress,
  Radio,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { downloadDocumentFile, previewDocumentFile } from "../lib/document-file-client";

const { Text, Title } = Typography;

type CriterionResult = "yes" | "no" | "not_applicable" | "pending";

interface CriterionDefinition {
  key: string;
  label: string;
}

interface CriterionRow extends CriterionDefinition {
  result: CriterionResult;
  comment: string;
}

interface GeneratedDocumentFile {
  id: string;
  original_name: string;
  file_kind: string;
  mime_type?: string | null;
  version_no?: number | null;
  is_current?: boolean | null;
  created_at?: string | null;
  download_url?: string | null;
}

interface ReviewItem {
  item_no: number;
  document_key: string;
  document_name: string;
  document_id?: string | null;
  source_type?: string | null;
  required?: boolean | null;
  status: string;
  reviewer_comment?: string | null;
  submitted_note?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  files?: GeneratedDocumentFile[];
  updated_at?: string | null;
}

interface ReviewItemPreview {
  document_key: string;
  document_name: string;
  source_type?: string | null;
  status?: string | null;
  fields: Array<{
    label: string;
    value: string;
  }>;
  files: GeneratedDocumentFile[];
}

interface F11Data {
  review_date: string;
  audit_language: string;
  preliminary_criteria: CriterionRow[];
  technical_criteria: CriterionRow[];
  preliminary_other_comment: string;
  technical_other_comment: string;
  recommendation: "certification_recommended" | "certification_not_recommended";
  recommendation_comment: string;
  conditions: string;
}

interface TechnicalReviewRecord {
  id: string;
  report_id: string;
  reviewer_id: string;
  status: string;
  completed_at?: string | null;
  reviewer?: {
    id: string;
    username?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null;
  form_data?: {
    review_items?: ReviewItem[];
    f11?: F11Data;
  } | null;
}

interface TechnicalReviewWorkspace {
  plan: {
    id: string;
    plan_code?: string | null;
    audit_type?: string | null;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
    project_code?: string | null;
    standard_name?: string | null;
    organization_name?: string | null;
  };
  report: {
    id: string;
    report_code?: string | null;
    version_no?: number | null;
    status?: string | null;
  } | null;
  can_start: boolean;
  eligibility_errors: string[];
  review: TechnicalReviewRecord | null;
  document_history: GeneratedDocumentFile[];
  criteria: {
    preliminary: CriterionDefinition[];
    technical: CriterionDefinition[];
  };
}

interface WorkspaceFormValues {
  review_date: Dayjs;
  audit_language: string;
  preliminary_other_comment?: string;
  technical_other_comment?: string;
  recommendation: "certification_recommended" | "certification_not_recommended";
  recommendation_comment?: string;
  conditions?: string;
}

interface TechnicalReviewWorkspaceModalProps {
  open: boolean;
  planId: string | null;
  roles: string[];
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
}

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "—";
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "—";
  return parsed.format(withTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY");
}

function reviewerName(review?: TechnicalReviewRecord | null) {
  return review?.reviewer?.full_name
    || review?.reviewer?.username
    || review?.reviewer?.email
    || "—";
}

function reviewStatusLabel(value?: string | null) {
  const key = normalize(value);
  const labels: Record<string, string> = {
    pending: "Chờ thẩm xét",
    in_review: "Đang thẩm xét",
    revision_required: "Yêu cầu sửa",
    completed: "Đã hoàn thành",
  };
  return labels[key] ?? (value || "Chưa bắt đầu").replaceAll("_", " ");
}

function reviewStatusColor(value?: string | null) {
  const key = normalize(value);
  if (key === "completed") return "green";
  if (key === "revision_required") return "red";
  if (key === "in_review") return "blue";
  return "orange";
}

function itemStatusLabel(value?: string | null) {
  const key = normalize(value);
  const labels: Record<string, string> = {
    pending: "Chờ thẩm xét",
    revision_required: "Yêu cầu sửa",
    resubmitted: "Đã bổ sung",
    accepted: "Đạt",
  };
  return labels[key] ?? (value || "Chờ thẩm xét").replaceAll("_", " ");
}

function itemStatusColor(value?: string | null) {
  const key = normalize(value);
  if (key === "accepted") return "green";
  if (key === "revision_required") return "red";
  if (key === "resubmitted") return "blue";
  return "orange";
}

function createRows(
  definitions: CriterionDefinition[],
  current?: CriterionRow[],
): CriterionRow[] {
  const currentByKey = new Map((current ?? []).map((item) => [item.key, item]));
  return definitions.map((definition) => {
    const item = currentByKey.get(definition.key);
    return {
      ...definition,
      result: item?.result ?? "pending",
      comment: item?.comment ?? "",
    };
  });
}

export default function TechnicalReviewWorkspaceModal({
  open,
  planId,
  roles,
  onClose,
  onChanged,
}: TechnicalReviewWorkspaceModalProps) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<WorkspaceFormValues>();
  const [preliminaryRows, setPreliminaryRows] = useState<CriterionRow[]>([]);
  const [technicalRows, setTechnicalRows] = useState<CriterionRow[]>([]);
  const [itemComments, setItemComments] = useState<Record<string, string>>({});
  const [itemPreview, setItemPreview] = useState<ReviewItemPreview | null>(null);
  const [itemPreviewOpen, setItemPreviewOpen] = useState(false);
  const [previewLoadingKey, setPreviewLoadingKey] = useState<string | null>(null);

  const normalizedRoles = useMemo(() => roles.map(normalize), [roles]);
  const canPerform = normalizedRoles.some((role) => ["admin", "technical_reviewer"].includes(role));

  const workspaceQuery = useQuery<TechnicalReviewWorkspace>({
    enabled: open && Boolean(planId),
    queryKey: ["technical-review-workspace", planId],
    queryFn: async () => {
      if (!planId) throw new Error("Chưa chọn kế hoạch đánh giá");
      return (await api.get<TechnicalReviewWorkspace>(`/technical-reviews/plan/${planId}/workspace`)).data;
    },
  });

  const workspace = workspaceQuery.data;
  const review = workspace?.review ?? null;
  const f11 = review?.form_data?.f11;
  const reviewItems = review?.form_data?.review_items ?? [];

  useEffect(() => {
    if (!open || !workspace) return;
    const current = workspace.review?.form_data?.f11;
    form.setFieldsValue({
      review_date: dayjs(current?.review_date || new Date()),
      audit_language: current?.audit_language || "Tiếng Việt",
      preliminary_other_comment: current?.preliminary_other_comment || "",
      technical_other_comment: current?.technical_other_comment || "",
      recommendation: current?.recommendation || "certification_recommended",
      recommendation_comment: current?.recommendation_comment || "",
      conditions: current?.conditions || "",
    });
    setPreliminaryRows(createRows(workspace.criteria.preliminary, current?.preliminary_criteria));
    setTechnicalRows(createRows(workspace.criteria.technical, current?.technical_criteria));
    setItemComments(Object.fromEntries(
      (workspace.review?.form_data?.review_items ?? []).map((item) => [
        item.document_key,
        item.reviewer_comment ?? "",
      ]),
    ));
  }, [form, open, workspace]);

  const refresh = async () => {
    await Promise.all([
      workspaceQuery.refetch(),
      onChanged?.(),
    ]);
  };

  const ensureMutation = useMutation({
    mutationFn: async () => {
      if (!planId) throw new Error("Chưa chọn kế hoạch đánh giá");
      return (await api.post<TechnicalReviewWorkspace>(`/technical-reviews/plan/${planId}/ensure`)).data;
    },
    onSuccess: async () => {
      message.success("Đã mở hồ sơ thẩm xét kỹ thuật");
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!review) throw new Error("Chưa có hồ sơ thẩm xét");
      return (await api.patch(`/technical-reviews/${review.id}/sync-documents`)).data;
    },
    onSuccess: async () => {
      message.success("Đã đồng bộ danh mục và phiên bản tài liệu mới nhất");
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: WorkspaceFormValues) => {
      if (!review) throw new Error("Chưa có hồ sơ thẩm xét");
      return (
        await api.patch(`/technical-reviews/${review.id}/workspace`, {
          review_date: values.review_date.format("YYYY-MM-DD"),
          audit_language: values.audit_language.trim(),
          preliminary_criteria: preliminaryRows.map(({ key, result, comment }) => ({ key, result, comment })),
          technical_criteria: technicalRows.map(({ key, result, comment }) => ({ key, result, comment })),
          preliminary_other_comment: values.preliminary_other_comment?.trim() || "",
          technical_other_comment: values.technical_other_comment?.trim() || "",
          recommendation: values.recommendation,
          recommendation_comment: values.recommendation_comment?.trim() || "",
          conditions: values.conditions?.trim() || "",
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã lưu dự thảo F.11-P.09");
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const itemMutation = useMutation({
    mutationFn: async ({
      documentKey,
      status,
    }: {
      documentKey: string;
      status: "accepted" | "revision_required" | "resubmitted";
    }) => {
      if (!review) throw new Error("Chưa có hồ sơ thẩm xét");
      return (
        await api.patch(`/technical-reviews/${review.id}/items/${encodeURIComponent(documentKey)}`, {
          status,
          reviewer_comment: itemComments[documentKey]?.trim() || undefined,
          submitted_note: status === "resubmitted"
            ? "Đã xác nhận hồ sơ/tài liệu được bổ sung để thẩm xét lại."
            : undefined,
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã cập nhật kết quả hạng mục");
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!review) throw new Error("Chưa có hồ sơ thẩm xét");
      await form.validateFields();
      await saveMutation.mutateAsync(form.getFieldsValue(true));
      return (await api.patch(`/technical-reviews/${review.id}/complete`)).data;
    },
    onSuccess: async () => {
      message.success("Đã hoàn thành thẩm xét kỹ thuật");
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const generateMutation = useMutation({
    mutationFn: async (format: "docx" | "pdf") => {
      if (!review) throw new Error("Chưa có hồ sơ thẩm xét");
      await form.validateFields();
      await saveMutation.mutateAsync(form.getFieldsValue(true));
      return (
        await api.post<{ document: GeneratedDocumentFile }>(
          `/technical-reviews/${review.id}/f11/generate?format=${format}`,
          undefined,
          { timeout: format === "pdf" ? 300_000 : 150_000 },
        )
      ).data;
    },
    onSuccess: async (result) => {
      message.success("Đã sinh tài liệu F.11-P.09");
      await refresh();
      if (result.document?.download_url) await downloadDocument(result.document);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const downloadDocument = async (document: GeneratedDocumentFile) => {
    if (!document.download_url) return;
    try {
      await downloadDocumentFile({
        url: document.download_url,
        filename: document.original_name,
        mimeType: document.mime_type,
      });
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const openDocumentInBrowser = async (document: GeneratedDocumentFile) => {
    if (!document.download_url) return;
    try {
      await previewDocumentFile({
        url: document.download_url,
        filename: document.original_name,
        mimeType: document.mime_type,
        title: document.original_name,
      });
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const openReviewItemPreview = async (item: ReviewItem) => {
    if (!review) return;
    setPreviewLoadingKey(item.document_key);
    try {
      const response = await api.get<ReviewItemPreview>(
        `/technical-reviews/${review.id}/items/${encodeURIComponent(item.document_key)}/preview`,
      );
      setItemPreview(response.data);
      setItemPreviewOpen(true);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setPreviewLoadingKey(null);
    }
  };

  const primaryReviewFile = (item: ReviewItem) => {
    const files = item.files ?? [];
    return files.find((file) => file.file_kind === "signed_scan" && file.original_name.toLowerCase().endsWith(".pdf"))
      ?? files.find((file) => file.file_kind === "generated_pdf" || file.original_name.toLowerCase().endsWith(".pdf"))
      ?? null;
  };

  const openPrimaryReviewDocument = async (item: ReviewItem) => {
    const primaryFile = primaryReviewFile(item);
    if (primaryFile) {
      await openDocumentInBrowser(primaryFile);
      return;
    }

    await openReviewItemPreview(item);
  };

  const reviewFileKindLabel = (file: GeneratedDocumentFile) => {
    if (file.file_kind === "signed_scan") return "PDF chính thức";
    if (file.file_kind === "generated_pdf") return "PDF hệ thống";
    if (file.file_kind === "generated_docx") return "Word hệ thống";
    return "Tệp bổ sung";
  };

  const isOfficialReviewPdf = (file: GeneratedDocumentFile) => (
    file.file_kind === "signed_scan"
    && (
      file.mime_type === "application/pdf"
      || file.original_name.toLowerCase().endsWith(".pdf")
    )
  );
  const requiredReviewItems = reviewItems.filter((item) => item.required !== false);
  const officialPdfCount = requiredReviewItems.filter((item) => (item.files ?? []).some(isOfficialReviewPdf)).length;
  const acceptedCount = reviewItems.filter((item) => normalize(item.status) === "accepted").length;
  const answeredCount = [...preliminaryRows, ...technicalRows]
    .filter((item) => item.result !== "pending").length;
  const criteriaTotal = preliminaryRows.length + technicalRows.length;
  const allItemsAccepted = reviewItems.length > 0 && acceptedCount === reviewItems.length;
  const allOfficialPdfsReady = requiredReviewItems.length > 0 && officialPdfCount === requiredReviewItems.length;
  const allCriteriaAnswered = criteriaTotal > 0 && answeredCount === criteriaTotal;

  const criterionColumns = (
    rows: CriterionRow[],
    setRows: (next: CriterionRow[]) => void,
  ): TableColumnsType<CriterionRow> => [
    {
      title: "STT",
      width: 58,
      render: (_value, _record, index) => index + 1,
    },
    {
      title: "Tiêu chí thẩm xét",
      dataIndex: "label",
      key: "label",
      render: (value: string) => <Text>{value}</Text>,
    },
    {
      title: "Kết luận",
      key: "result",
      width: 190,
      render: (_value, record) => (
        <Select
          disabled={!canPerform || normalize(review?.status) === "completed"}
          onChange={(result: CriterionResult) => setRows(rows.map((item) => (
            item.key === record.key ? { ...item, result } : item
          )))}
          options={[
            { value: "pending", label: "Chưa kết luận" },
            { value: "yes", label: "Yes / Đạt" },
            { value: "no", label: "No / Không đạt" },
            { value: "not_applicable", label: "Không áp dụng" },
          ]}
          status={record.result === "pending" ? "warning" : undefined}
          value={record.result}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Nhận xét",
      key: "comment",
      width: 330,
      render: (_value, record) => (
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={!canPerform || normalize(review?.status) === "completed"}
          onChange={(event) => setRows(rows.map((item) => (
            item.key === record.key ? { ...item, comment: event.target.value } : item
          )))}
          placeholder="Nhận xét hoặc căn cứ (nếu cần)"
          value={record.comment}
        />
      ),
    },
  ];

  const reviewItemColumns: TableColumnsType<ReviewItem> = [
    {
      title: "STT",
      dataIndex: "item_no",
      width: 58,
    },
    {
      title: "Hồ sơ/tài liệu",
      key: "document_name",
      render: (_value, item) => {
        const primaryFile = primaryReviewFile(item);
        const hasOfficialPdf = Boolean((item.files ?? []).some(isOfficialReviewPdf));
        return (
          <Space direction="vertical" size={3}>
            <Button
              loading={previewLoadingKey === item.document_key}
              onClick={() => void openPrimaryReviewDocument(item)}
              style={{ height: "auto", padding: 0, textAlign: "left", whiteSpace: "normal" }}
              type="link"
            >
              <Text strong style={{ color: "inherit" }}>{item.document_name}</Text>
            </Button>
            <Space size={4} wrap>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.source_type === "system_record"
                  ? "Dữ liệu hệ thống"
                  : item.source_type === "generated_document"
                    ? "Biểu mẫu/tài liệu hệ thống"
                    : "Tệp hồ sơ"}
              </Text>
              {hasOfficialPdf
                ? <Tag color="green">PDF chính thức</Tag>
                : primaryFile
                  ? <Tag color="orange">PDF hệ thống · chưa có bản chính thức</Tag>
                  : <Tag>Chưa có PDF xem trực tiếp</Tag>}
            </Space>
            {primaryFile ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {reviewFileKindLabel(primaryFile)} · {primaryFile.original_name}
              </Text>
            ) : item.file_name ? <Text type="secondary">{item.file_name}</Text> : null}
          </Space>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 145,
      render: (value: string) => <Tag color={itemStatusColor(value)}>{itemStatusLabel(value)}</Tag>,
    },
    {
      title: "Nhận xét của người thẩm xét",
      key: "comment",
      width: 320,
      render: (_value, item) => (
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={!canPerform || normalize(review?.status) === "completed"}
          onChange={(event) => setItemComments((current) => ({
            ...current,
            [item.document_key]: event.target.value,
          }))}
          placeholder="Bắt buộc khi yêu cầu sửa"
          value={itemComments[item.document_key] ?? ""}
        />
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "right",
      width: 310,
      render: (_value, item) => {
        const status = normalize(item.status);
        const currentItemPending = itemMutation.isPending
          && itemMutation.variables?.documentKey === item.document_key;
        const previewPending = previewLoadingKey === item.document_key;

        if (!canPerform || normalize(review?.status) === "completed") {
          return (
            <Button
              icon={<FileSearchOutlined />}
              loading={previewPending}
              onClick={() => void openReviewItemPreview(item)}
              size="small"
            >
              Xem thông tin
            </Button>
          );
        }

        if (status === "revision_required") {
          return (
            <Space size={4}>
              <Button
                icon={<FileSearchOutlined />}
                loading={previewPending}
                onClick={() => void openReviewItemPreview(item)}
                size="small"
              >
                Xem thông tin
              </Button>
              <Button
                icon={<SyncOutlined />}
                loading={currentItemPending}
                onClick={() => itemMutation.mutate({
                  documentKey: item.document_key,
                  status: "resubmitted",
                })}
                size="small"
              >
                Đã bổ sung
              </Button>
            </Space>
          );
        }
        return (
          <Space size={4}>
            <Button
              icon={<FileSearchOutlined />}
              loading={previewPending}
              onClick={() => void openReviewItemPreview(item)}
              size="small"
            >
              Xem thông tin
            </Button>
            <Button
              icon={<CheckCircleOutlined />}
              loading={currentItemPending}
              onClick={() => itemMutation.mutate({
                documentKey: item.document_key,
                status: "accepted",
              })}
              size="small"
              type="primary"
            >
              Chấp nhận
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              loading={currentItemPending}
              onClick={() => {
                if (!itemComments[item.document_key]?.trim()) {
                  message.warning("Nhập nhận xét trước khi yêu cầu sửa");
                  return;
                }
                itemMutation.mutate({
                  documentKey: item.document_key,
                  status: "revision_required",
                });
              }}
              size="small"
            >
              Yêu cầu sửa
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Modal
      cancelText="Đóng"
      destroyOnHidden
      footer={[
        <Button key="close" onClick={onClose}>Đóng</Button>,
        ...(review && canPerform && normalize(review.status) !== "completed" ? [
          <Button
            icon={<SaveOutlined />}
            key="save"
            loading={saveMutation.isPending}
            onClick={() => void form.validateFields().then((values) => saveMutation.mutate(values))}
          >
            Lưu dự thảo F.11
          </Button>,
          <Button
            disabled={!allItemsAccepted || !allCriteriaAnswered || !allOfficialPdfsReady}
            icon={<SafetyCertificateOutlined />}
            key="complete"
            loading={completeMutation.isPending}
            onClick={() => modal.confirm({
              title: "Hoàn thành thẩm xét kỹ thuật?",
              content: "Sau khi hoàn thành, F.11 và kết quả thẩm xét sẽ bị khóa để chuyển bước quyết định chứng nhận.",
              okText: "Hoàn thành",
              cancelText: "Hủy",
              onOk: async () => completeMutation.mutateAsync(),
            })}
            type="primary"
          >
            Hoàn thành thẩm xét
          </Button>,
        ] : []),
      ]}
      maskClosable={false}
      onCancel={onClose}
      open={open}
      title={(
        <Space direction="vertical" size={0}>
          <Text type="secondary">Không gian thẩm xét kỹ thuật</Text>
          <Title level={5} style={{ margin: 0 }}>
            {workspace?.plan.plan_code || "F.11-P.09"}
          </Title>
        </Space>
      )}
      width="min(1580px, 96vw)"
      styles={{ body: { maxHeight: "78vh", overflowY: "auto", paddingTop: 12 } }}
    >
      {workspaceQuery.isLoading ? <Skeleton active /> : workspaceQuery.isError ? (
        <Alert
          action={<Button icon={<ReloadOutlined />} onClick={() => workspaceQuery.refetch()}>Thử lại</Button>}
          message="Không tải được không gian thẩm xét"
          description={getErrorMessage(workspaceQuery.error)}
          showIcon
          type="error"
        />
      ) : !workspace ? <Empty description="Không có dữ liệu" /> : (
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Card size="small">
            <Descriptions column={{ xs: 1, sm: 2, lg: 4 }} size="small">
              <Descriptions.Item label="Khách hàng">{workspace.plan.organization_name || "—"}</Descriptions.Item>
              <Descriptions.Item label="Hồ sơ">{workspace.plan.project_code || "—"}</Descriptions.Item>
              <Descriptions.Item label="Báo cáo">{workspace.report?.report_code || "Chưa có"}</Descriptions.Item>
              <Descriptions.Item label="Người thẩm xét">{reviewerName(review)}</Descriptions.Item>
              <Descriptions.Item label="Tiêu chuẩn" span={2}>{workspace.plan.standard_name || "—"}</Descriptions.Item>
              <Descriptions.Item label="Thời gian đánh giá">
                {formatDate(workspace.plan.planned_start_date)} – {formatDate(workspace.plan.planned_end_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={reviewStatusColor(review?.status)}>{reviewStatusLabel(review?.status)}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {!review ? (
            <Alert
              action={canPerform ? (
                <Button
                  disabled={!workspace.can_start}
                  icon={<FileSearchOutlined />}
                  loading={ensureMutation.isPending}
                  onClick={() => ensureMutation.mutate()}
                  type="primary"
                >
                  Bắt đầu thẩm xét
                </Button>
              ) : undefined}
              description={workspace.eligibility_errors.length
                ? workspace.eligibility_errors.join("\n")
                : "Báo cáo và hồ sơ đã đủ điều kiện để bắt đầu thẩm xét kỹ thuật."}
              message={workspace.can_start ? "Sẵn sàng thẩm xét" : "Chưa đủ điều kiện thẩm xét"}
              showIcon
              type={workspace.can_start ? "info" : "warning"}
            />
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                <Card size="small"><Statistic title="Hạng mục hồ sơ" value={`${acceptedCount}/${reviewItems.length}`} /></Card>
                <Card size="small"><Statistic title="Tiêu chí F.11" value={`${answeredCount}/${criteriaTotal}`} /></Card>
                <Card size="small"><Statistic title="Phiên bản F.11" value={workspace.document_history.length} /></Card>
                <Card size="small">
                  <Progress
                    percent={Math.round(((acceptedCount + answeredCount) / Math.max(1, reviewItems.length + criteriaTotal)) * 100)}
                    size="small"
                    status={allItemsAccepted && allCriteriaAnswered && allOfficialPdfsReady ? "success" : "active"}
                  />
                </Card>
              </div>

              <Form form={form} layout="vertical">
                <Tabs
                  items={[
                    {
                      key: "documents",
                      label: `Hồ sơ thẩm xét (${acceptedCount}/${reviewItems.length})`,
                      children: (
                        <Space direction="vertical" size={10} style={{ width: "100%" }}>
                          <Alert
                            action={canPerform && normalize(review.status) !== "completed" ? (
                              <Button
                                icon={<SyncOutlined />}
                                loading={syncMutation.isPending}
                                onClick={() => syncMutation.mutate()}
                                size="small"
                              >
                                Đồng bộ tài liệu
                              </Button>
                            ) : undefined}
                            message="Thẩm xét độc lập từng thành phần hồ sơ"
                            description="Chỉ hoàn thành khi toàn bộ hạng mục được chấp nhận. Khi tài liệu thay đổi, bấm Đồng bộ tài liệu để lấy phiên bản mới nhất."
                            showIcon
                            type="info"
                          />
                          <Table
                            columns={reviewItemColumns}
                            dataSource={reviewItems}
                            pagination={false}
                            rowKey="document_key"
                            scroll={{ x: 1150 }}
                            size="small"
                          />
                        </Space>
                      ),
                    },
                    {
                      key: "preliminary",
                      label: `Thẩm xét sơ bộ (${preliminaryRows.filter((item) => item.result !== "pending").length}/${preliminaryRows.length})`,
                      children: (
                        <Space direction="vertical" size={12} style={{ width: "100%" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <Button
                              disabled={!canPerform || normalize(review.status) === "completed"}
                              icon={<CheckCircleOutlined />}
                              onClick={() => setPreliminaryRows((rows) => rows.map((item) => ({ ...item, result: "yes" })))}
                            >
                              Tất cả đạt
                            </Button>
                          </div>
                          <Table
                            columns={criterionColumns(preliminaryRows, setPreliminaryRows)}
                            dataSource={preliminaryRows}
                            pagination={false}
                            rowKey="key"
                            scroll={{ x: 1150 }}
                            size="small"
                          />
                          <Form.Item label="Nhận xét khác – Thẩm xét sơ bộ" name="preliminary_other_comment">
                            <Input.TextArea disabled={!canPerform || normalize(review.status) === "completed"} rows={3} />
                          </Form.Item>
                        </Space>
                      ),
                    },
                    {
                      key: "technical",
                      label: `Thẩm xét kỹ thuật (${technicalRows.filter((item) => item.result !== "pending").length}/${technicalRows.length})`,
                      children: (
                        <Space direction="vertical" size={12} style={{ width: "100%" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <Button
                              disabled={!canPerform || normalize(review.status) === "completed"}
                              icon={<CheckCircleOutlined />}
                              onClick={() => setTechnicalRows((rows) => rows.map((item) => ({ ...item, result: "yes" })))}
                            >
                              Tất cả đạt
                            </Button>
                          </div>
                          <Table
                            columns={criterionColumns(technicalRows, setTechnicalRows)}
                            dataSource={technicalRows}
                            pagination={false}
                            rowKey="key"
                            scroll={{ x: 1150 }}
                            size="small"
                          />
                          <Form.Item label="Nhận xét khác – Thẩm xét kỹ thuật" name="technical_other_comment">
                            <Input.TextArea disabled={!canPerform || normalize(review.status) === "completed"} rows={4} />
                          </Form.Item>
                        </Space>
                      ),
                    },
                    {
                      key: "recommendation",
                      label: "Kiến nghị & F.11 Word/PDF",
                      children: (
                        <Space direction="vertical" size={14} style={{ width: "100%" }}>
                          <Card size="small" title="Thông tin lập F.11-P.09">
                            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12 }}>
                              <Form.Item
                                label="Ngày thẩm xét"
                                name="review_date"
                                rules={[{ required: true, message: "Chọn ngày thẩm xét" }]}
                              >
                                <DatePicker disabled={!canPerform || normalize(review.status) === "completed"} format="DD/MM/YYYY" style={{ width: "100%" }} />
                              </Form.Item>
                              <Form.Item
                                label="Ngôn ngữ đánh giá"
                                name="audit_language"
                                rules={[{ required: true, message: "Nhập ngôn ngữ đánh giá" }]}
                              >
                                <Input disabled={!canPerform || normalize(review.status) === "completed"} />
                              </Form.Item>
                            </div>
                            <Form.Item label="Kiến nghị" name="recommendation" rules={[{ required: true }]}>
                              <Radio.Group disabled={!canPerform || normalize(review.status) === "completed"}>
                                <Radio value="certification_recommended">Cấp/duy trì chứng nhận</Radio>
                                <Radio value="certification_not_recommended">Không cấp/không duy trì chứng nhận</Radio>
                              </Radio.Group>
                            </Form.Item>
                            <Form.Item label="Nhận xét/kiến nghị" name="recommendation_comment">
                              <Input.TextArea disabled={!canPerform || normalize(review.status) === "completed"} rows={4} />
                            </Form.Item>
                            <Form.Item label="Điều kiện kèm theo (nếu có)" name="conditions">
                              <Input.TextArea disabled={!canPerform || normalize(review.status) === "completed"} rows={3} />
                            </Form.Item>
                          </Card>

                          <Card
                            extra={(
                              <Space>
                                <Button
                                  disabled={!canPerform}
                                  icon={<FileWordOutlined />}
                                  loading={generateMutation.isPending}
                                  onClick={() => generateMutation.mutate("docx")}
                                  type="primary"
                                >
                                  Xuất Word
                                </Button>
                                <Button
                                  disabled={!canPerform}
                                  icon={<FilePdfOutlined />}
                                  loading={generateMutation.isPending}
                                  onClick={() => generateMutation.mutate("pdf")}
                                >
                                  Xuất PDF
                                </Button>
                              </Space>
                            )}
                            size="small"
                            title="Phiên bản F.11-P.09 đã sinh"
                          >
                            <List
                              dataSource={workspace.document_history}
                              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa sinh F.11" /> }}
                              renderItem={(document) => (
                                <List.Item
                                  actions={[
                                    <Button
                                      icon={<DownloadOutlined />}
                                      key="download"
                                      onClick={() => void downloadDocument(document)}
                                      size="small"
                                    >
                                      Tải xuống
                                    </Button>,
                                  ]}
                                >
                                  <List.Item.Meta
                                    avatar={document.file_kind === "generated_pdf" ? <FilePdfOutlined /> : <FileWordOutlined />}
                                    title={(
                                      <Space>
                                        <Text>{document.original_name}</Text>
                                        {document.is_current ? <Tag color="green">Hiện hành</Tag> : null}
                                      </Space>
                                    )}
                                    description={`Phiên bản ${document.version_no ?? 1} · ${formatDate(document.created_at, true)}`}
                                  />
                                </List.Item>
                              )}
                            />
                          </Card>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Form>

              {(!allItemsAccepted || !allCriteriaAnswered || !allOfficialPdfsReady) && normalize(review.status) !== "completed" ? (
                <Alert
                  icon={<WarningOutlined />}
                  message="Chưa thể hoàn thành thẩm xét"
                  description={`Cần chấp nhận đủ ${reviewItems.length} hạng mục, có PDF chính thức cho ${requiredReviewItems.length} hạng mục bắt buộc (hiện ${officialPdfCount}/${requiredReviewItems.length}) và kết luận đủ ${criteriaTotal} tiêu chí F.11.`}
                  showIcon
                  type="warning"
                />
              ) : null}
              {normalize(review.status) === "completed" ? (
                <Alert
                  icon={<CheckCircleOutlined />}
                  message="Thẩm xét kỹ thuật đã hoàn thành"
                  description={`Hoàn thành ngày ${formatDate(review.completed_at, true)}. Hồ sơ đã sẵn sàng chuyển bước kết quả chứng nhận.`}
                  showIcon
                  type="success"
                />
              ) : null}
            </>
          )}
        </Space>
      )}
      <Modal
        footer={<Button onClick={() => setItemPreviewOpen(false)}>Đóng</Button>}
        onCancel={() => setItemPreviewOpen(false)}
        open={itemPreviewOpen}
        title={itemPreview?.document_name || "Xem hồ sơ/tài liệu"}
        width={920}
      >
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          {itemPreview?.fields?.length ? (
            <Descriptions bordered column={1} size="small">
              {itemPreview.fields.map((field) => (
                <Descriptions.Item key={field.label} label={field.label}>
                  <Text style={{ whiteSpace: "pre-wrap" }}>{field.value || "—"}</Text>
                </Descriptions.Item>
              ))}
            </Descriptions>
          ) : (
            <Alert
              description="Hạng mục này được thẩm xét chủ yếu trên tệp biểu mẫu/tài liệu hiện hành."
              message="Không có dữ liệu hệ thống bổ sung để hiển thị"
              showIcon
              type="info"
            />
          )}

          <Card size="small" title={`Tệp hồ sơ hiện hành (${itemPreview?.files?.length ?? 0})`}>
            {itemPreview?.files?.length ? (
              <List
                dataSource={itemPreview.files}
                renderItem={(file) => (
                  <List.Item
                    actions={[
                      <Button
                        icon={<FileSearchOutlined />}
                        key="open"
                        onClick={() => void openDocumentInBrowser(file)}
                        size="small"
                        type="primary"
                      >
                        Xem ngay
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={file.file_kind === "signed_scan" || file.file_kind === "generated_pdf" ? <FilePdfOutlined /> : <FileWordOutlined />}
                      title={(
                        <Space size={6} wrap>
                          <Text>{file.original_name}</Text>
                          <Tag color={file.file_kind === "signed_scan" ? "green" : undefined}>{reviewFileKindLabel(file)}</Tag>
                        </Space>
                      )}
                      description={`Phiên bản ${file.version_no ?? 1} · ${formatDate(file.created_at, true)}`}
                    />
                  </List.Item>
                )}
              />
            ) : <Empty description="Chưa có tệp đính kèm/biểu mẫu đã sinh" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
        </Space>
      </Modal>
    </Modal>
  );
}
