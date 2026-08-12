"use client";

import {
  DeleteOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useEffect, useMemo } from "react";

import { api, getErrorMessage } from "../lib/api";
import { downloadDocumentFile } from "../lib/document-file-client";

const { Text, Title } = Typography;

interface ScheduleRow {
  time: string;
  content: string;
  auditor: string;
  auditee: string;
}

interface AttendanceRow {
  full_name: string;
  department_title: string;
  opening_attended: boolean;
  closing_attended: boolean;
}

type ChecklistResult = "NOT_EVALUATED" | "CONFORMITY" | "OFI" | "MINOR_NC" | "MAJOR_NC";

interface ChecklistRow {
  row_id: string;
  clause: string;
  content: string;
  is_section: boolean;
  result: ChecklistResult;
  description: string;
}

interface ChecklistProgram {
  program_key: string;
  program_code: string;
  management_system: string;
  source_label: string;
  auditor_name: string;
  rows: ChecklistRow[];
}

interface GeneratedDocumentFile {
  id: string;
  original_name: string;
  file_kind: string;
  version_no?: number | null;
  is_current?: boolean | null;
  created_at?: string | null;
  download_url: string;
}

export type AuditDocumentType = "audit_program_f03" | "audit_team_assignment_f04" | "audit_plan_f05" | "audit_attendance_f07" | "audit_log_f15" | "audit_monitoring_f17" | "audit_checklist_f06" | "corrective_action_request_f10" | "technical_review_report_f11";

export interface AuditDocumentFocus {
  documentType: AuditDocumentType;
  title?: string;
  memberId?: string | null;
  programKey?: string | null;
  findingId?: string | null;
}

export interface AuditDocumentCard {
  document_type: AuditDocumentType;
  stored_document_type: string;
  form_code: string;
  label: string;
  entity_type: string;
  entity_id: string;
  member_id?: string | null;
  program_key?: string | null;
  finding_id?: string | null;
  card_key?: string;
  missing_fields: string[];
  can_generate: boolean;
  history: GeneratedDocumentFile[];
}

export interface AuditDocumentPreview {
  plan: {
    id: string;
    plan_code?: string | null;
    audit_type?: string | null;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
  };
  supplemental_data: {
    audit_language: string;
    issue_date: string;
    schedule_rows: ScheduleRow[];
    opening_date: string;
    opening_time: string;
    closing_date: string;
    closing_time: string;
    attendance_rows: AttendanceRow[];
    checklists: ChecklistProgram[];
  };
  documents: AuditDocumentCard[];
}

interface DocumentDataFormValues {
  audit_language: string;
  issue_date: Dayjs;
  schedule_rows: ScheduleRow[];
  opening_date: Dayjs;
  opening_time: string;
  closing_date: Dayjs;
  closing_time: string;
  attendance_rows: AttendanceRow[];
  checklists: ChecklistProgram[];
}

interface GenerateResponse {
  format: "docx" | "pdf";
  document_type: string;
  form_code: string;
  label: string;
  missing_fields: string[];
  document: GeneratedDocumentFile;
}

interface AuditDocumentCenterModalProps {
  open: boolean;
  planId: string | null;
  focus?: AuditDocumentFocus | null;
  onChanged?: () => void | Promise<void>;
  onClose: () => void;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY HH:mm") : "—";
}

export default function AuditDocumentCenterModal({
  open,
  planId,
  focus = null,
  onChanged,
  onClose,
}: AuditDocumentCenterModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<DocumentDataFormValues>();

  const previewQuery = useQuery<AuditDocumentPreview>({
    queryKey: ["audit-documents", planId],
    enabled: open && Boolean(planId),
    queryFn: async () => {
      if (!planId) throw new Error("Chưa chọn kế hoạch đánh giá");
      return (await api.get<AuditDocumentPreview>(`/audit-documents/plan/${planId}`)).data;
    },
  });

  useEffect(() => {
    const data = previewQuery.data?.supplemental_data;
    if (!data || !open) return;
    form.setFieldsValue({
      audit_language: data.audit_language || "Tiếng Việt",
      issue_date: dayjs(data.issue_date),
      schedule_rows: data.schedule_rows,
      opening_date: dayjs(data.opening_date),
      opening_time: data.opening_time || "08:00",
      closing_date: dayjs(data.closing_date),
      closing_time: data.closing_time || "16:30",
      attendance_rows: data.attendance_rows,
      checklists: data.checklists,
    });
  }, [form, open, previewQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: DocumentDataFormValues) => {
      if (!planId) throw new Error("Chưa chọn kế hoạch đánh giá");
      const supplemental = previewQuery.data?.supplemental_data;
      const scheduleRows = values.schedule_rows ?? supplemental?.schedule_rows ?? [];
      const attendanceRows = values.attendance_rows ?? supplemental?.attendance_rows ?? [];
      const checklists = values.checklists ?? supplemental?.checklists ?? [];
      const openingDate = values.opening_date ?? dayjs(supplemental?.opening_date);
      const closingDate = values.closing_date ?? dayjs(supplemental?.closing_date);
      return (
        await api.patch<AuditDocumentPreview>(`/audit-documents/plan/${planId}/data`, {
          audit_language: values.audit_language.trim(),
          issue_date: values.issue_date.format("YYYY-MM-DD"),
          schedule_rows: scheduleRows.map((row) => ({
            time: row.time.trim(),
            content: row.content.trim(),
            auditor: row.auditor.trim(),
            auditee: row.auditee.trim(),
          })),
          opening_date: openingDate.format("YYYY-MM-DD"),
          opening_time: (values.opening_time ?? supplemental?.opening_time ?? "08:00").trim(),
          closing_date: closingDate.format("YYYY-MM-DD"),
          closing_time: (values.closing_time ?? supplemental?.closing_time ?? "16:30").trim(),
          attendance_rows: attendanceRows.map((row) => ({
            full_name: row.full_name.trim(),
            department_title: row.department_title.trim(),
            opening_attended: Boolean(row.opening_attended),
            closing_attended: Boolean(row.closing_attended),
          })),
          checklists: checklists.map((checklist) => ({
            program_key: checklist.program_key,
            program_code: checklist.program_code,
            management_system: checklist.management_system,
            auditor_name: checklist.auditor_name.trim(),
            rows: checklist.rows.map((row) => ({
              row_id: row.row_id,
              clause: row.clause.trim(),
              content: row.content.trim(),
              is_section: Boolean(row.is_section),
              result: row.is_section ? "NOT_EVALUATED" : row.result,
              description: row.is_section ? "" : row.description.trim(),
            })),
          })),
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã lưu dữ liệu biểu mẫu.");
      await previewQuery.refetch();
      await onChanged?.();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const downloadDocument = async (document: GeneratedDocumentFile) => {
    try {
      await downloadDocumentFile({
        url: document.download_url,
        filename: document.original_name,
      });
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const generateMutation = useMutation({
    mutationFn: async ({
      documentType,
      format,
      memberId,
      programKey,
      findingId,
    }: {
      documentType: AuditDocumentCard["document_type"];
      format: "docx" | "pdf";
      memberId?: string | null;
      programKey?: string | null;
      findingId?: string | null;
    }) => {
      if (!planId) throw new Error("Chưa chọn kế hoạch đánh giá");
      const values = await form.validateFields();
      await saveMutation.mutateAsync(values);
      return (
        await api.post<GenerateResponse>(
          `/audit-documents/plan/${planId}/generate`,
          {},
          {
            params: {
              documentType,
              format,
              ...(memberId ? { memberId } : {}),
              ...(programKey ? { programKey } : {}),
              ...(findingId ? { findingId } : {}),
            },
            timeout: documentType === "audit_checklist_f06" ? 600_000 : 150_000,
          },
        )
      ).data;
    },
    onSuccess: async (result) => {
      message.success(`Đã sinh ${result.form_code} ${result.format === "pdf" ? "PDF" : "Word"}.`);
      await previewQuery.refetch();
      await onChanged?.();
      await downloadDocument(result.document);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const isGenerating = (documentType: string, format: string, memberId?: string | null, programKey?: string | null, findingId?: string | null) => {
    const variables = generateMutation.variables;
    return generateMutation.isPending
      && variables?.documentType === documentType
      && variables?.format === format
      && (variables?.memberId ?? null) === (memberId ?? null)
      && (variables?.programKey ?? null) === (programKey ?? null)
      && (variables?.findingId ?? null) === (findingId ?? null);
  };

  const visibleDocuments = useMemo(() => {
    const documents = previewQuery.data?.documents ?? [];
    if (!focus) return documents;
    return documents.filter((document) => {
      if (document.document_type !== focus.documentType) return false;
      if (focus.memberId && document.member_id !== focus.memberId) return false;
      if (focus.programKey && document.program_key !== focus.programKey) return false;
      if (focus.findingId && document.finding_id !== focus.findingId) return false;
      return true;
    });
  }, [focus, previewQuery.data?.documents]);

  const showSchedule = !focus || focus.documentType === "audit_plan_f05";
  const showAttendance = !focus || focus.documentType === "audit_attendance_f07";
  const showChecklists = !focus || focus.documentType === "audit_checklist_f06";
  const workspaceTitle = focus?.title
    ?? visibleDocuments[0]?.label
    ?? "Hồ sơ Word/PDF đánh giá";

  return (
    <Modal
      destroyOnHidden
      footer={null}
      maskClosable={false}
      onCancel={onClose}
      open={open}
      title={`${workspaceTitle}${previewQuery.data?.plan.plan_code ? ` - ${previewQuery.data.plan.plan_code}` : ""}`}
      width={1120}
    >
      {previewQuery.isLoading ? (
        <Skeleton active paragraph={{ rows: 14 }} />
      ) : previewQuery.isError ? (
        <Alert
          action={<Button icon={<ReloadOutlined />} onClick={() => void previewQuery.refetch()}>Thử lại</Button>}
          description={getErrorMessage(previewQuery.error)}
          message="Không tải được dữ liệu hồ sơ"
          showIcon
          type="error"
        />
      ) : previewQuery.data ? (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Alert
            description={focus
              ? "Không gian này chỉ hiển thị dữ liệu, tài liệu và lịch sử phiên bản của biểu mẫu đang chọn."
              : "Hệ thống sinh F.03, F.04, F.05, F.06, F.07, F.10, F.15 và F.17 từ dữ liệu hồ sơ."}
            message={focus ? "Không gian biểu mẫu riêng" : "Trung tâm hồ sơ Word/PDF"}
            showIcon
            type="info"
          />

          <Card
            extra={(
              <Button
                icon={<SaveOutlined />}
                loading={saveMutation.isPending}
                onClick={() => form.submit()}
                type="primary"
              >
                Lưu dữ liệu
              </Button>
            )}
            size="small"
            title={focus ? `Dữ liệu biểu mẫu - ${workspaceTitle}` : "Dữ liệu bổ sung cho F.05, F.06 và F.07"}
          >
            <Form<DocumentDataFormValues>
              form={form}
              layout="vertical"
              onFinish={(values) => saveMutation.mutate(values)}
            >
              <Row gutter={12}>
                <Col md={12} xs={24}>
                  <Form.Item
                    label="Ngôn ngữ đánh giá"
                    name="audit_language"
                    rules={[{ required: true, message: "Nhập ngôn ngữ đánh giá" }]}
                  >
                    <Select
                      options={[
                        { label: "Tiếng Việt", value: "Tiếng Việt" },
                        { label: "Tiếng Anh", value: "Tiếng Anh" },
                        { label: "Tiếng Việt và Tiếng Anh", value: "Tiếng Việt và Tiếng Anh" },
                        { label: "Tiếng Trung", value: "Tiếng Trung" },
                      ]}
                      showSearch
                    />
                  </Form.Item>
                </Col>
                <Col md={12} xs={24}>
                  <Form.Item
                    label="Ngày lập tài liệu"
                    name="issue_date"
                    rules={[{ required: true, message: "Chọn ngày lập tài liệu" }]}
                  >
                    <DatePicker allowClear={false} format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>

              {showSchedule ? <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                <div>
                  <Title level={5} style={{ margin: 0 }}>Lịch trình chi tiết</Title>
                  <Text type="secondary">Có thể chỉnh từng dòng trước khi xuất F.05. Nội dung được lưu lại cho lần xuất sau.</Text>
                </div>
              </div>

              <Form.List name="schedule_rows">
                {(fields, { add, remove }) => (
                  <Space direction="vertical" size={10} style={{ width: "100%" }}>
                    {fields.map((field, index) => (
                      <Card
                        extra={(
                          <Button
                            danger
                            disabled={fields.length <= 1}
                            icon={<DeleteOutlined />}
                            onClick={() => remove(field.name)}
                            size="small"
                            type="text"
                          />
                        )}
                        key={field.key}
                        size="small"
                        title={`Dòng ${index + 1}`}
                      >
                        <Row gutter={10}>
                          <Col md={6} xs={24}>
                            <Form.Item
                              label="Thời gian"
                              name={[field.name, "time"]}
                              rules={[{ required: true, message: "Nhập thời gian" }]}
                            >
                              <Input placeholder="08:00-09:00 hoặc Theo lịch làm việc" />
                            </Form.Item>
                          </Col>
                          <Col md={18} xs={24}>
                            <Form.Item
                              label="Nội dung"
                              name={[field.name, "content"]}
                              rules={[{ required: true, message: "Nhập nội dung đánh giá" }]}
                            >
                              <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
                            </Form.Item>
                          </Col>
                          <Col md={12} xs={24}>
                            <Form.Item
                              label="Chuyên gia/Đoàn đánh giá"
                              name={[field.name, "auditor"]}
                              rules={[{ required: true, message: "Nhập người thực hiện" }]}
                            >
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col md={12} xs={24}>
                            <Form.Item
                              label="Bộ phận được đánh giá"
                              name={[field.name, "auditee"]}
                              rules={[{ required: true, message: "Nhập bộ phận được đánh giá" }]}
                            >
                              <Input />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    ))}
                    <Button
                      block
                      icon={<PlusOutlined />}
                      onClick={() => add({ time: "", content: "", auditor: "", auditee: "" })}
                      type="dashed"
                    >
                      Thêm dòng lịch trình
                    </Button>
                  </Space>
                )}
              </Form.List>
              </> : null}

              {showAttendance ? <>
              <Divider orientation="left">Danh sách tham dự F.07-P.09</Divider>
              <Row gutter={12}>
                <Col md={6} xs={24}>
                  <Form.Item
                    label="Ngày họp khai mạc"
                    name="opening_date"
                    rules={[{ required: true, message: "Chọn ngày họp khai mạc" }]}
                  >
                    <DatePicker allowClear={false} format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col md={6} xs={24}>
                  <Form.Item
                    label="Giờ họp khai mạc"
                    name="opening_time"
                    rules={[{ required: true, message: "Nhập giờ họp khai mạc" }]}
                  >
                    <Input placeholder="08:00" />
                  </Form.Item>
                </Col>
                <Col md={6} xs={24}>
                  <Form.Item
                    label="Ngày họp kết thúc"
                    name="closing_date"
                    rules={[{ required: true, message: "Chọn ngày họp kết thúc" }]}
                  >
                    <DatePicker allowClear={false} format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col md={6} xs={24}>
                  <Form.Item
                    label="Giờ họp kết thúc"
                    name="closing_time"
                    rules={[{ required: true, message: "Nhập giờ họp kết thúc" }]}
                  >
                    <Input placeholder="16:30" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.List name="attendance_rows">
                {(fields, { add, remove }) => (
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    {fields.map((field, index) => (
                      <Card
                        extra={(
                          <Button
                            danger
                            disabled={fields.length <= 1}
                            icon={<DeleteOutlined />}
                            onClick={() => remove(field.name)}
                            size="small"
                            type="text"
                          />
                        )}
                        key={field.key}
                        size="small"
                        title={`Người tham dự ${index + 1}`}
                      >
                        <Row gutter={10} align="middle">
                          <Col md={8} xs={24}>
                            <Form.Item
                              label="Họ và tên"
                              name={[field.name, "full_name"]}
                              rules={[{ required: true, message: "Nhập họ và tên" }]}
                            >
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col md={8} xs={24}>
                            <Form.Item
                              label="Bộ phận - Chức vụ"
                              name={[field.name, "department_title"]}
                              rules={[{ required: true, message: "Nhập bộ phận/chức vụ" }]}
                            >
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col md={4} xs={12}>
                            <Form.Item name={[field.name, "opening_attended"]} valuePropName="checked">
                              <Checkbox>Họp khai mạc</Checkbox>
                            </Form.Item>
                          </Col>
                          <Col md={4} xs={12}>
                            <Form.Item name={[field.name, "closing_attended"]} valuePropName="checked">
                              <Checkbox>Họp kết thúc</Checkbox>
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    ))}
                    <Button
                      block
                      icon={<PlusOutlined />}
                      onClick={() => add({ full_name: "", department_title: "", opening_attended: true, closing_attended: true })}
                      type="dashed"
                    >
                      Thêm người tham dự
                    </Button>
                  </Space>
                )}
              </Form.List>
              </> : null}

              {showChecklists ? <>
              <Divider orientation="left">Bảng kiểm đánh giá F.06-P.09</Divider>
              {previewQuery.data.supplemental_data.checklists.length ? (
                <Collapse
                  items={previewQuery.data.supplemental_data.checklists.map((checklist, checklistIndex) => ({
                    key: checklist.program_key,
                    label: `${checklist.program_code} - ${checklist.rows.length} dòng kiểm tra`,
                    children: (
                      <Space direction="vertical" size={10} style={{ width: "100%" }}>
                        <Alert
                          description="Mỗi tiêu chuẩn sinh một file F.06 riêng. Kết quả chỉ được đánh dấu tại một trong bốn cột: C, OFI, NC nhẹ hoặc NC nặng."
                          message={checklist.source_label}
                          showIcon
                          type={checklist.management_system === "QMS" ? "success" : "info"}
                        />
                        <Form.Item name={["checklists", checklistIndex, "program_key"]} hidden><Input /></Form.Item>
                        <Form.Item name={["checklists", checklistIndex, "program_code"]} hidden><Input /></Form.Item>
                        <Form.Item name={["checklists", checklistIndex, "management_system"]} hidden><Input /></Form.Item>
                        <Form.Item
                          label="Chuyên gia/đoàn thực hiện bảng kiểm"
                          name={["checklists", checklistIndex, "auditor_name"]}
                          rules={[{ required: true, message: "Nhập chuyên gia thực hiện bảng kiểm" }]}
                        >
                          <Input />
                        </Form.Item>
                        <Table<ChecklistRow>
                          bordered
                          dataSource={checklist.rows}
                          pagination={false}
                          rowClassName={(row) => row.is_section ? "audit-checklist-section-row" : ""}
                          rowKey="row_id"
                          scroll={{ x: 1250, y: 520 }}
                          size="small"
                          columns={[
                            {
                              title: "Điều khoản",
                              width: 110,
                              fixed: "left",
                              render: (_value, row, rowIndex) => (
                                <>
                                  <Form.Item name={["checklists", checklistIndex, "rows", rowIndex, "row_id"]} hidden><Input /></Form.Item>
                                  <Form.Item name={["checklists", checklistIndex, "rows", rowIndex, "is_section"]} hidden valuePropName="checked"><Checkbox /></Form.Item>
                                  <Form.Item name={["checklists", checklistIndex, "rows", rowIndex, "clause"]} style={{ margin: 0 }}>
                                    <Input variant="borderless" style={{ fontWeight: row.is_section ? 700 : 500 }} />
                                  </Form.Item>
                                </>
                              ),
                            },
                            {
                              title: "Nội dung điều khoản/Nội dung kiểm tra",
                              width: 460,
                              render: (_value, row, rowIndex) => (
                                <Form.Item name={["checklists", checklistIndex, "rows", rowIndex, "content"]} style={{ margin: 0 }}>
                                  <Input.TextArea
                                    autoSize={{ minRows: row.is_section ? 1 : 2, maxRows: 8 }}
                                    variant="borderless"
                                    style={{ fontWeight: row.is_section ? 700 : 400 }}
                                  />
                                </Form.Item>
                              ),
                            },
                            {
                              title: "Kết quả",
                              width: 155,
                              render: (_value, row, rowIndex) => row.is_section ? (
                                <Text type="secondary">—</Text>
                              ) : (
                                <Form.Item name={["checklists", checklistIndex, "rows", rowIndex, "result"]} style={{ margin: 0 }}>
                                  <Select
                                    options={[
                                      { label: "Chưa đánh giá", value: "NOT_EVALUATED" },
                                      { label: "Phù hợp (C)", value: "CONFORMITY" },
                                      { label: "Kiến nghị (OFI)", value: "OFI" },
                                      { label: "NC nhẹ", value: "MINOR_NC" },
                                      { label: "NC nặng", value: "MAJOR_NC" },
                                    ]}
                                  />
                                </Form.Item>
                              ),
                            },
                            {
                              title: "Diễn giải phát hiện/Bằng chứng",
                              width: 480,
                              render: (_value, row, rowIndex) => row.is_section ? null : (
                                <Form.Item name={["checklists", checklistIndex, "rows", rowIndex, "description"]} style={{ margin: 0 }}>
                                  <Input.TextArea autoSize={{ minRows: 2, maxRows: 8 }} variant="borderless" />
                                </Form.Item>
                              ),
                            },
                          ]}
                        />
                      </Space>
                    ),
                  }))}
                />
              ) : (
                <Alert
                  description="Phạm vi kế hoạch chưa có ISO 9001, ISO 14001 hoặc ISO 45001 để tạo bảng kiểm tự động."
                  message="Chưa có thư viện checklist phù hợp"
                  showIcon
                  type="warning"
                />
              )}
              </> : null}
            </Form>
          </Card>

          {focus && !visibleDocuments.length ? (
            <Alert
              description="Biểu mẫu này chưa đủ điều kiện hoặc chưa phát sinh đối tượng tương ứng trong kế hoạch."
              message="Chưa có biểu mẫu khả dụng"
              showIcon
              type="warning"
            />
          ) : null}

          <Row gutter={[12, 12]}>
            {visibleDocuments.map((document) => (
              <Col key={document.card_key ?? `${document.document_type}:${document.entity_id}`} lg={8} md={12} xs={24}>
                <Card
                  extra={<Tag color={document.can_generate ? "blue" : "default"}>{document.form_code}</Tag>}
                  style={{ height: "100%" }}
                  title={document.label}
                >
                  <Space direction="vertical" size={10} style={{ width: "100%" }}>
                    {document.missing_fields.length ? (
                      <Alert
                        description={(
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {document.missing_fields.map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        )}
                        icon={<WarningOutlined />}
                        message="Nội dung cần rà soát"
                        showIcon
                        type={document.can_generate ? "warning" : "error"}
                      />
                    ) : (
                      <Alert message="Đủ dữ liệu để sinh tài liệu" showIcon type="success" />
                    )}

                    <Space wrap>
                      <Button
                        disabled={!document.can_generate}
                        icon={<FileWordOutlined />}
                        loading={isGenerating(document.document_type, "docx", document.member_id, document.program_key, document.finding_id)}
                        onClick={() => generateMutation.mutate({ documentType: document.document_type, format: "docx", memberId: document.member_id, programKey: document.program_key, findingId: document.finding_id })}
                        type="primary"
                      >
                        Xuất Word
                      </Button>
                      <Button
                        disabled={!document.can_generate}
                        icon={<FilePdfOutlined />}
                        loading={isGenerating(document.document_type, "pdf", document.member_id, document.program_key, document.finding_id)}
                        onClick={() => generateMutation.mutate({ documentType: document.document_type, format: "pdf", memberId: document.member_id, programKey: document.program_key, findingId: document.finding_id })}
                      >
                        Xuất PDF
                      </Button>
                    </Space>

                    <div>
                      <Text strong>Phiên bản đã sinh</Text>
                      {document.history.length ? (
                        <List
                          dataSource={document.history.slice(0, 6)}
                          size="small"
                          renderItem={(item) => (
                            <List.Item
                              actions={[
                                <Button
                                  icon={<DownloadOutlined />}
                                  key="download"
                                  onClick={() => void downloadDocument(item)}
                                  size="small"
                                  type="text"
                                />,
                              ]}
                            >
                              <List.Item.Meta
                                description={`${item.file_kind === "generated_pdf" ? "PDF" : "Word"} - ${formatDateTime(item.created_at)}`}
                                title={(
                                  <span>
                                    Phiên bản {item.version_no ?? 1}
                                    {item.is_current ? <Tag color="green" style={{ marginLeft: 6 }}>Hiện hành</Tag> : null}
                                  </span>
                                )}
                              />
                            </List.Item>
                          )}
                        />
                      ) : (
                        <Empty description="Chưa sinh tài liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      )}
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Space>
      ) : null}
    </Modal>
  );
}
