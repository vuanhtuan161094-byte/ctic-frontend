"use client";

import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";

const { Text } = Typography;

type SnapshotStatus = "DRAFT" | "CONFIRMED" | "REVIEWED" | string;
type MandayDecision = "KEEP_CURRENT" | "RECALCULATED";

interface SurveillanceSite {
  site_no: number;
  site_name?: string | null;
  address?: string | null;
  activities?: string | null;
  employee_count?: number | null;
  is_headquarters?: boolean | null;
}

interface SurveillanceData {
  company_name?: string | null;
  company_name_en?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  tax_code?: string | null;
  registered_address?: string | null;
  headquarters_address?: string | null;
  representative_name?: string | null;
  representative_position?: string | null;
  representative_phone?: string | null;
  representative_email?: string | null;
  contact_name?: string | null;
  contact_position?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  standard_name?: string | null;
  certification_scope?: string | null;
  excluded_clauses?: string | null;
  site_count?: number | null;
  total_employee_count?: number | null;
  employee_count?: number | null;
  shift_count?: number | null;
  external_provider_used?: boolean | null;
  outsourced_processes?: string | null;
  management_system_details?: string | null;
  certificate_languages?: string | null;
  other_requests?: string | null;
  sites?: SurveillanceSite[];
}

interface SurveillanceChange {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
  category: "ADMINISTRATIVE" | "CERTIFICATION_RELEVANT";
  affects_manday: boolean;
}

interface SurveillanceInformationResponse {
  project_id: string;
  event: {
    id: string;
    event_type: string;
    sequence_no: number;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
    planned_mandays?: number | null;
    status?: string | null;
    program_id: string;
    program_code?: string | null;
  };
  source: {
    type: string;
    snapshot_id?: string | null;
    label: string;
  };
  classification_context: Array<{
    id: string;
    management_system: string;
    standard_code: string;
    scope_description: string;
    isic_code: string;
    nace_code: string;
    iaf_code: string;
    iaf_name: string;
  }>;
  baseline: SurveillanceData;
  current_data: SurveillanceData;
  snapshot?: {
    id: string;
    version_no: number;
    status: SnapshotStatus;
    manday_decision: MandayDecision;
    baseline_mandays?: number | null;
    effective_mandays?: number | null;
    note?: string | null;
    confirmed_at?: string | null;
  } | null;
  history: Array<{
    id: string;
    version_no: number;
    status: SnapshotStatus;
    confirmed_at?: string | null;
  }>;
  changes: SurveillanceChange[];
  summary: {
    changed_count: number;
    administrative_count: number;
    certification_relevant_count: number;
    manday_relevant_count: number;
    change_impact: string;
    manday_review_recommended: boolean;
    scope_review_required: boolean;
  };
  next_action?: {
    code: "UPDATE_INFORMATION" | "REVIEW_CHANGE" | "APPOINT_TEAM";
    label: string;
    event_id: string;
    plan_id?: string | null;
  } | null;
  manday: {
    baseline_mandays?: number | null;
    current_mandays?: number | null;
    effective_mandays?: number | null;
    decision: MandayDecision;
    review_recommended: boolean;
  };
}

interface DataFormValues {
  data: SurveillanceData;
}

interface ReviewFormValues {
  manday_decision: MandayDecision;
  review_note: string;
}

interface SurveillanceInformationSnapshotModalProps {
  open: boolean;
  projectId: string;
  eventId: string | null;
  canEdit: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

function eventLabel(eventType?: string | null) {
  const key = (eventType ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (key.includes("2")) return "Giám sát lần 2";
  if (key.includes("1")) return "Giám sát lần 1";
  return "Đánh giá giám sát";
}

function displayChangeValue(value: unknown, field: string) {
  if (field === "sites" && Array.isArray(value)) return `${value.length} địa điểm`;
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function SurveillanceInformationSnapshotModal({
  open,
  projectId,
  eventId,
  canEdit,
  onClose,
  onUpdated,
}: SurveillanceInformationSnapshotModalProps) {
  const [dataForm] = Form.useForm<DataFormValues>();
  const [reviewForm] = Form.useForm<ReviewFormValues>();
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [creatingRevision, setCreatingRevision] = useState(false);
  const feedbackContext = `${projectId}:${eventId ?? ""}`;
  const [actionFeedback, setActionFeedback] = useState<{
    context: string;
    error: string | null;
    message: string | null;
  } | null>(null);
  const currentFeedback = actionFeedback?.context === feedbackContext
    ? actionFeedback
    : null;
  const actionError = currentFeedback?.error ?? null;
  const actionMessage = currentFeedback?.message ?? null;
  const setActionError = (error: string | null) => {
    setActionFeedback((current) => ({
      context: feedbackContext,
      error,
      message: current?.context === feedbackContext ? current.message : null,
    }));
  };
  const setActionMessage = (message: string | null) => {
    setActionFeedback((current) => ({
      context: feedbackContext,
      error: current?.context === feedbackContext ? current.error : null,
      message,
    }));
  };
  const handleClose = () => {
    setActionFeedback(null);
    onClose();
  };

  const query = useQuery({
    queryKey: ["surveillance-information", projectId, eventId],
    enabled: open && Boolean(eventId),
    queryFn: async () => (
      await api.get<SurveillanceInformationResponse>(
        `/surveillance-information/project/${projectId}/event/${eventId}`,
      )
    ).data,
  });

  const data = query.data;
  const locked = ["CONFIRMED", "REVIEWED"].includes(data?.snapshot?.status ?? "");
  const reviewable = canEdit && data?.next_action?.code === "REVIEW_CHANGE";
  const editable = canEdit && !locked;

  useEffect(() => {
    if (!open || !data) return;
    dataForm.setFieldsValue({
      data: data.current_data,
    });
    reviewForm.setFieldsValue({
      manday_decision: data.manday.decision ?? "KEEP_CURRENT",
      review_note: data.snapshot?.note ?? "",
    });
  }, [data, dataForm, open, reviewForm]);

  const changeColumns = useMemo(() => [
    {
      title: "Nội dung thay đổi",
      dataIndex: "label",
      key: "label",
      width: 210,
      render: (value: string, record: SurveillanceChange) => (
        <Space direction="vertical" size={2}>
          <Text strong>{value}</Text>
          {record.affects_manday ? <Tag color="orange">Có thể ảnh hưởng MD</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Trước",
      key: "before",
      render: (_: unknown, record: SurveillanceChange) => (
        <Text type="secondary">{displayChangeValue(record.before, record.field)}</Text>
      ),
    },
    {
      title: "Sau",
      key: "after",
      render: (_: unknown, record: SurveillanceChange) => displayChangeValue(record.after, record.field),
    },
    {
      title: "Phân loại",
      key: "category",
      width: 175,
      render: (_: unknown, record: SurveillanceChange) => record.category === "CERTIFICATION_RELEVANT"
        ? <Tag color="blue">Liên quan chứng nhận</Tag>
        : <Tag>Hành chính</Tag>,
    },
  ], []);

  const payload = async () => {
    const values = await dataForm.validateFields();
    return {
      data: values.data,
    };
  };

  const saveDraft = async () => {
    if (!eventId) return;
    setSaving(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await api.put(
        `/surveillance-information/project/${projectId}/event/${eventId}`,
        await payload(),
      );
      setActionMessage("Đã lưu nháp. Hệ thống đã cập nhật bảng so sánh thay đổi.");
      await query.refetch();
      onUpdated?.();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const confirm = async () => {
    if (!eventId) return;
    setConfirming(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await api.post(
        `/surveillance-information/project/${projectId}/event/${eventId}/confirm`,
        await payload(),
      );
      setActionMessage("Đã xác nhận thông tin áp dụng cho kỳ giám sát. Bản đã xác nhận được khóa để bảo toàn lịch sử.");
      await query.refetch();
      onUpdated?.();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setConfirming(false);
    }
  };

  const createRevision = async () => {
    if (!eventId) return;
    setCreatingRevision(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await api.post(`/surveillance-information/project/${projectId}/event/${eventId}/revision`);
      setActionMessage("Đã tạo bản cập nhật mới từ snapshot hiệu lực gần nhất.");
      await query.refetch();
      onUpdated?.();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setCreatingRevision(false);
    }
  };

  const reviewChange = async () => {
    if (!eventId) return;
    setReviewing(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const values = await reviewForm.validateFields();
      await api.post(
        `/surveillance-information/project/${projectId}/event/${eventId}/review-change`,
        {
          decision: values.manday_decision,
          review_note: values.review_note,
        },
      );
      setActionMessage(values.manday_decision === "KEEP_CURRENT"
        ? "Đã hoàn tất xem xét và giữ nguyên MD giám sát hiện tại."
        : "Đã hoàn tất xem xét và áp dụng MD từ cơ chế tính ngày công hiện hành.");
      await query.refetch();
      onUpdated?.();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setReviewing(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={1120}
      destroyOnHidden
      title={data ? `Cập nhật thông tin trước ${eventLabel(data.event.event_type)}` : "Cập nhật thông tin trước giám sát"}
    >
      {query.isLoading ? <Card loading /> : null}
      {query.isError ? <Alert type="error" showIcon message={getErrorMessage(query.error)} /> : null}
      {data ? (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Alert
            showIcon
            type={locked ? "success" : "info"}
            message={locked ? `Thông tin kỳ giám sát đã được khóa · Phiên bản ${data.snapshot?.version_no}` : "Chỉ cập nhật những nội dung thay đổi"}
            description={locked
              ? "Bản đã xác nhận được lưu như hồ sơ lịch sử và không được sửa đè. Có thể tạo một bản cập nhật mới kế thừa dữ liệu hiệu lực hiện tại."
              : `Dữ liệu được kế thừa từ: ${data.source.label}. Nếu không có thay đổi, chỉ cần kiểm tra và xác nhận.`}
          />

          <Row gutter={12}>
            <Col xs={24} md={6}><Card size="small"><Statistic title="Nội dung thay đổi" value={data.summary.changed_count} /></Card></Col>
            <Col xs={24} md={6}><Card size="small"><Statistic title="Liên quan chứng nhận" value={data.summary.certification_relevant_count} /></Card></Col>
            <Col xs={24} md={6}><Card size="small"><Statistic title="Có thể ảnh hưởng MD" value={data.summary.manday_relevant_count} /></Card></Col>
            <Col xs={24} md={6}><Card size="small"><Statistic title="MD giám sát hiện tại" value={data.manday.current_mandays ?? "—"} suffix={data.manday.current_mandays != null ? "MD" : undefined} /></Card></Col>
          </Row>

          <Form<DataFormValues> form={dataForm} layout="vertical" disabled={!editable}>
            <Card size="small" title="1. Thông tin tổ chức">
              <Row gutter={12}>
                <Col xs={24} md={12}><Form.Item label="Tên tổ chức" name={["data", "company_name"]}><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Tên tiếng Anh" name={["data", "company_name_en"]}><Input /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item label="Mã quốc gia" name={["data", "country_code"]}><Input maxLength={2} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item label="Quốc gia (khác)" name={["data", "country_name"]}><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Mã số thuế / đăng ký kinh doanh" name={["data", "tax_code"]}><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Địa chỉ đăng ký" name={["data", "registered_address"]}><Input.TextArea rows={2} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Địa chỉ trụ sở / địa điểm chính" name={["data", "headquarters_address"]}><Input.TextArea rows={2} /></Form.Item></Col>
              </Row>
            </Card>

            <Card size="small" title="2. Liên hệ" style={{ marginTop: 12 }}>
              <Row gutter={12}>
                <Col xs={24} md={6}><Form.Item label="Người đại diện" name={["data", "representative_name"]}><Input /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item label="Chức vụ" name={["data", "representative_position"]}><Input /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item label="Điện thoại" name={["data", "representative_phone"]}><Input /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item label="Email" name={["data", "representative_email"]}><Input /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item label="Người liên hệ" name={["data", "contact_name"]}><Input /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item label="Chức vụ liên hệ" name={["data", "contact_position"]}><Input /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item label="Điện thoại liên hệ" name={["data", "contact_phone"]}><Input /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item label="Email liên hệ" name={["data", "contact_email"]}><Input /></Form.Item></Col>
              </Row>
            </Card>

            <Card size="small" title="3. Thông tin chứng nhận" style={{ marginTop: 12 }}>
              <Row gutter={12}>
                <Col xs={24} md={12}><Form.Item label="Tiêu chuẩn" name={["data", "standard_name"]}><Input /></Form.Item></Col>
                <Col xs={24} md={4}><Form.Item label="Tổng nhân sự" name={["data", "total_employee_count"]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={4}><Form.Item label="Nhân sự hiệu dụng" name={["data", "employee_count"]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={4}><Form.Item label="Số ca" name={["data", "shift_count"]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
                <Col span={24}><Form.Item label="Phạm vi chứng nhận" name={["data", "certification_scope"]}><Input.TextArea rows={3} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Điều khoản loại trừ" name={["data", "excluded_clauses"]}><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Ngôn ngữ chứng chỉ" name={["data", "certificate_languages"]}><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Quá trình thuê ngoài" name={["data", "outsourced_processes"]}><Input.TextArea rows={2} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Thông tin hệ thống quản lý / tích hợp" name={["data", "management_system_details"]}><Input.TextArea rows={2} /></Form.Item></Col>
              </Row>
            </Card>

            <Card size="small" title="Phân loại ngành hiện hành" style={{ marginTop: 12 }}>
              <Space wrap>
                {data.classification_context.length ? data.classification_context.map((scope) => (
                  <Tag key={scope.id} color="geekblue">
                    {scope.standard_code} · ISIC {scope.isic_code} · NACE {scope.nace_code} · IAF {scope.iaf_code}
                  </Tag>
                )) : <Text type="secondary">Chưa có phạm vi ISIC/NACE/IAF đã phê duyệt.</Text>}
              </Space>
              {data.summary.scope_review_required ? (
                <Alert
                  showIcon
                  type="warning"
                  message="Cần rà soát lại phân loại ngành và năng lực tổ chức"
                  description="Có thay đổi về tiêu chuẩn, phạm vi hoặc địa điểm. Trước khi ban hành đoàn đánh giá, cần xác nhận lại ISIC/NACE/IAF, chương trình đánh giá và năng lực tổ chức chứng nhận cho phần thay đổi."
                  style={{ marginTop: 12 }}
                />
              ) : null}
            </Card>

            <Card size="small" title="4. Địa điểm" style={{ marginTop: 12 }}>
              <Form.List name={["data", "sites"]}>
                {(fields, { add, remove }) => (
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    {fields.map(({ key, name, ...restField }, index) => (
                      <Card key={key} size="small" type="inner" title={`Địa điểm ${index + 1}`} extra={editable && fields.length > 1 ? <Button danger type="link" onClick={() => remove(name)}>Xóa</Button> : null}>
                        <Row gutter={8}>
                          <Col xs={24} md={3}><Form.Item {...restField} label="STT" name={[name, "site_no"]} rules={[{ required: true }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item></Col>
                          <Col xs={24} md={7}><Form.Item {...restField} label="Tên địa điểm" name={[name, "site_name"]}><Input /></Form.Item></Col>
                          <Col xs={24} md={5}><Form.Item {...restField} label="Nhân sự" name={[name, "employee_count"]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
                          <Col xs={24} md={9}><Form.Item {...restField} label="Địa chỉ" name={[name, "address"]} rules={[{ required: true }]}><Input /></Form.Item></Col>
                          <Col span={24}><Form.Item {...restField} label="Hoạt động / phạm vi tại địa điểm" name={[name, "activities"]}><Input.TextArea rows={2} /></Form.Item></Col>
                        </Row>
                      </Card>
                    ))}
                    {editable ? <Button type="dashed" onClick={() => add({ site_no: fields.length + 1 })} block>+ Thêm địa điểm</Button> : null}
                  </Space>
                )}
              </Form.List>
            </Card>

          </Form>

          <Form<ReviewFormValues> form={reviewForm} layout="vertical" disabled={!reviewable}>
            <Card size="small" title="5. Xem xét thay đổi và ngày công giám sát">
              {data.summary.manday_review_recommended ? (
                <Alert
                  showIcon
                  type="warning"
                  icon={<ExclamationCircleOutlined />}
                  message="Có thay đổi có thể ảnh hưởng thời lượng đánh giá"
                  description="Không tự động tăng/giảm MD. Điều phối viên giữ MD hiện tại hoặc yêu cầu hệ thống tính lại bằng cơ chế ngày công đã được phê duyệt."
                  style={{ marginBottom: 12 }}
                />
              ) : null}
              <Row gutter={12} align="bottom">
                <Col span={24}>
                  <Form.Item label="Xử lý MD" name="manday_decision" initialValue="KEEP_CURRENT">
                    <Radio.Group>
                      <Space direction="vertical">
                        <Radio value="KEEP_CURRENT">Giữ MD hiện tại ({data.manday.current_mandays ?? "—"} MD)</Radio>
                        <Radio value="RECALCULATED">Tính lại bằng cơ chế ngày công hiện hành và áp dụng kết quả</Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                label="Ghi chú xem xét"
                name="review_note"
                rules={[{ required: reviewable, whitespace: true, message: "Nhập ghi chú xem xét" }]}
              >
                <Input.TextArea rows={2} />
              </Form.Item>
            </Card>
          </Form>

          <Card size="small" title={`Thay đổi so với ${data.source.label.toLowerCase()}`}>
            {data.changes.length ? (
              <Table<SurveillanceChange>
                rowKey="field"
                size="small"
                pagination={false}
                columns={changeColumns}
                dataSource={data.changes}
                scroll={{ x: 820 }}
              />
            ) : (
              <Alert showIcon type="success" icon={<CheckCircleOutlined />} message="Không ghi nhận thay đổi" description="Thông tin kỳ giám sát đang kế thừa nguyên trạng từ hồ sơ hiện hành." />
            )}
          </Card>

          {actionError ? <Alert type="error" showIcon message={actionError} /> : null}
          {actionMessage ? <Alert type="success" showIcon message={actionMessage} /> : null}

          <Divider style={{ margin: 0 }} />
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleClose}>{locked ? "Đóng" : "Hủy"}</Button>
            {editable ? <Button icon={<SaveOutlined />} loading={saving} onClick={() => void saveDraft()}>Lưu nháp</Button> : null}
            {editable ? <Button type="primary" icon={<CheckCircleOutlined />} loading={confirming} onClick={() => void confirm()}>Xác nhận thông tin GS</Button> : null}
            {reviewable ? <Button type="primary" icon={<CheckCircleOutlined />} loading={reviewing} onClick={() => void reviewChange()}>Xem xét thay đổi</Button> : null}
            {canEdit && locked ? <Button loading={creatingRevision} onClick={() => void createRevision()}>Tạo bản cập nhật mới</Button> : null}
          </Space>
        </Space>
      ) : null}
    </Modal>
  );
}
