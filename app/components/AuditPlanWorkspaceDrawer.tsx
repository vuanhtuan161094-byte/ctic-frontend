"use client";

import {
  EditOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Progress,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import AuditExecutionWorkspaceModal, { type AuditExecutionWorkspaceMode } from "./AuditExecutionWorkspaceModal";

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface AuditProgramSummary {
  id: string;
  program_code?: string | null;
  program_year?: number | null;
  organization_name?: string | null;
  standard_name?: string | null;
  certification_scope?: string | null;
}

interface AuditPlanDetail {
  id: string;
  project_id: string;
  audit_event_id?: string | null;
  plan_code?: string | null;
  version_no?: number | null;
  audit_type?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  location?: string | null;
  audit_scope?: string | null;
  audit_criteria?: string | null;
  audit_objectives?: string | null;
  status?: string | null;
  form_data?: Record<string, unknown> | null;
  certification_projects?: {
    id: string;
    project_code?: string | null;
    standard_name?: string | null;
    certification_applications?: {
      certification_scope?: string | null;
      customers?: {
        company_name?: string | null;
      } | null;
    } | null;
  } | null;
  audit_event?: {
    id: string;
    event_type?: string | null;
    status?: string | null;
    planned_mandays?: number | string | null;
    audit_programs?: AuditProgramSummary | null;
  } | null;
}

interface AuditTeamMemberScope {
  id?: string;
  project_scope_id?: string | null;
  iaf_code?: string | null;
  nace_code?: string | null;
  activity_description?: string | null;
  coverage_type?: string | null;
  planned_mandays?: number | string | null;
}

interface AuditTeamMember {
  id: string;
  team_role?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  planned_mandays?: number | string | null;
  competency_status?: string | null;
  competency_note?: string | null;
  experts?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    status?: string | null;
  } | null;
  scopes?: AuditTeamMemberScope[];
}

interface AuditTeamAppointment {
  id: string;
  appointment_number?: string | null;
  appointment_date?: string | null;
  status?: string | null;
  approved_at?: string | null;
  approved_by_user?: {
    full_name?: string | null;
    username?: string | null;
  } | null;
  members?: AuditTeamMember[];
}

interface AuditReport {
  id: string;
  report_code?: string | null;
  version_no?: number | null;
  report_date?: string | null;
  audit_result?: string | null;
  status?: string | null;
}

interface AuditFinding {
  id: string;
  report_id: string;
  finding_code?: string | null;
  finding_type?: string | null;
  clause?: string | null;
  description?: string | null;
  due_date?: string | null;
  status?: string | null;
}

interface AuditPlanWorkspace {
  plan: AuditPlanDetail;
  appointment: AuditTeamAppointment | null;
  reports: AuditReport[];
  findings: AuditFinding[];
}

interface PlanEditValues {
  planned_dates: [Dayjs, Dayjs];
  location: string;
  audit_scope: string;
  audit_criteria: string;
  audit_objectives: string;
  status: string;
  audit_methods?: string[];
}

interface AuditPlanWorkspaceDrawerProps {
  planId: string | null;
  roles: string[];
  onClose: () => void;
  onOpenScheduling: (planId: string) => void;
  onChanged?: () => void | Promise<void>;
}

const auditTypeLabels: Record<string, string> = {
  initial: "Chứng nhận lần đầu",
  stage1: "Đánh giá giai đoạn 1",
  stage2: "Đánh giá giai đoạn 2",
  surveillance: "Đánh giá giám sát",
  surveillance1: "Giám sát lần 1",
  surveillance2: "Giám sát lần 2",
  recertification: "Tái chứng nhận",
  special: "Đánh giá đặc biệt",
  extension: "Đánh giá mở rộng",
  supplementary: "Đánh giá bổ sung",
};

const teamRoleLabels: Record<string, string> = {
  team_leader: "Trưởng đoàn đánh giá",
  lead_auditor: "Trưởng đoàn đánh giá",
  auditor: "Chuyên gia đánh giá",
  technical_expert: "Chuyên gia kỹ thuật",
  observer: "Quan sát viên",
  trainee: "Chuyên gia tập sự",
  witness_evaluator: "Đánh giá viên chứng kiến",
};

const countedMandayRoles = new Set(["team_leader", "lead_auditor", "auditor"]);
const manageRoles = new Set(["admin", "coordinator"]);
const executeRoles = new Set(["admin", "staff", "auditor", "lead_auditor"]);

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function numberValue(value?: number | string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string | null) {
  if (!value) return "Chưa thiết lập";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "Chưa thiết lập";
}

function readableStatus(value?: string | null) {
  const normalized = normalize(value);
  const labels: Record<string, string> = {
    approved: "Đã phê duyệt",
    cancelled: "Đã hủy",
    closed: "Đã đóng",
    completed: "Hoàn thành",
    draft: "Dự thảo",
    in_progress: "Đang thực hiện",
    issued: "Đã ban hành",
    planned: "Đã lập kế hoạch",
    pending: "Chờ xử lý",
    ready_for_technical_review: "Sẵn sàng thẩm xét",
    recorded: "Đã ghi nhận",
  };
  return labels[normalized] ?? (value || "Chưa cập nhật").replaceAll("_", " ");
}

function StatusTag({ status }: { status?: string | null }) {
  const normalized = normalize(status);
  const color = ["completed", "issued", "approved", "closed"].includes(normalized)
    ? "green"
    : ["cancelled"].includes(normalized)
      ? "default"
      : ["in_progress", "pending"].includes(normalized)
        ? "gold"
        : "blue";
  return <Tag color={color}>{readableStatus(status)}</Tag>;
}

async function getOptionalData<T>(promise: Promise<{ data: T }>): Promise<T | null> {
  try {
    return (await promise).data;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw error;
  }
}

function getAuditMethods(formData?: Record<string, unknown> | null) {
  const raw = formData?.audit_methods;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const methods = raw as Record<string, unknown>;
  return Object.entries(methods)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key);
}

export default function AuditPlanWorkspaceDrawer({
  planId,
  roles,
  onClose,
  onOpenScheduling,
  onChanged,
}: AuditPlanWorkspaceDrawerProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [executionMode, setExecutionMode] = useState<AuditExecutionWorkspaceMode | null>(null);
  const [editForm] = Form.useForm<PlanEditValues>();
  const canManage = roles.some((role) => manageRoles.has(normalize(role)));
  const canExecute = roles.some((role) => executeRoles.has(normalize(role)));

  const workspaceQuery = useQuery<AuditPlanWorkspace>({
    queryKey: ["audit-plan", planId, "workspace-v2"],
    enabled: Boolean(planId),
    queryFn: async () => {
      if (!planId) throw new Error("Chưa chọn kế hoạch đánh giá");

      const [planResponse, appointment, reportsResponse] = await Promise.all([
        api.get<AuditPlanDetail>(`/audit-plans/${planId}`),
        getOptionalData(api.get<AuditTeamAppointment>(`/audit-team-appointments/plan/${planId}`)),
        api.get<AuditReport[]>(`/reports/plan/${planId}`),
      ]);

      const findingsByReport = await Promise.all(
        reportsResponse.data.map((report) =>
          getOptionalData(api.get<AuditFinding[]>(`/audit-findings/report/${report.id}`)),
        ),
      );

      return {
        plan: planResponse.data,
        appointment,
        reports: reportsResponse.data,
        findings: findingsByReport.flatMap((items) => items ?? []),
      };
    },
  });

  const workspace = workspaceQuery.data;
  const plan = workspace?.plan;
  const appointment = workspace?.appointment;

  const readiness = useMemo(() => {
    if (!workspace) {
      return {
        requiredMandays: 0,
        allocatedMandays: 0,
        completedChecks: 0,
        totalChecks: 7,
        issues: [] as string[],
        ready: false,
      };
    }

    const requiredMandays = numberValue(workspace.plan.audit_event?.planned_mandays);
    const countedMembers = (workspace.appointment?.members ?? []).filter((member) =>
      countedMandayRoles.has(normalize(member.team_role)),
    );
    const allocatedMandays = countedMembers.reduce(
      (sum, member) => sum + numberValue(member.planned_mandays),
      0,
    );
    const leaderCount = (workspace.appointment?.members ?? []).filter((member) =>
      ["team_leader", "lead_auditor"].includes(normalize(member.team_role)),
    ).length;
    const checks = [
      Boolean(workspace.plan.planned_start_date && workspace.plan.planned_end_date),
      Boolean(workspace.plan.location?.trim()),
      Boolean(workspace.plan.audit_scope?.trim() && workspace.plan.audit_criteria?.trim() && workspace.plan.audit_objectives?.trim()),
      Boolean(workspace.appointment),
      normalize(workspace.appointment?.status) === "issued",
      leaderCount === 1,
      requiredMandays <= 0 || Math.abs(allocatedMandays - requiredMandays) < 0.01,
    ];

    const issues: string[] = [];
    if (!checks[0]) issues.push("Chưa thiết lập đầy đủ thời gian đánh giá.");
    if (!checks[1]) issues.push("Chưa cập nhật địa điểm đánh giá.");
    if (!checks[2]) issues.push("Chưa hoàn thiện phạm vi, tiêu chí hoặc mục tiêu đánh giá.");
    if (!checks[3]) issues.push("Chưa có dự thảo chỉ định đoàn đánh giá.");
    if (workspace.appointment && !checks[4]) issues.push("Chỉ định đoàn chưa được ban hành.");
    if (workspace.appointment && leaderCount !== 1) issues.push("Đoàn phải có đúng một trưởng đoàn đánh giá.");
    if (requiredMandays > 0 && Math.abs(allocatedMandays - requiredMandays) >= 0.01) {
      issues.push(`Tổng ngày công phân công là ${allocatedMandays.toFixed(1)} MD, chưa khớp ${requiredMandays.toFixed(1)} MD của kỳ đánh giá.`);
    }

    return {
      requiredMandays,
      allocatedMandays,
      completedChecks: checks.filter(Boolean).length,
      totalChecks: checks.length,
      issues,
      ready: checks.every(Boolean),
    };
  }, [workspace]);

  const executionSummary = useMemo(() => {
    const reports = workspace?.reports ?? [];
    const findings = workspace?.findings ?? [];
    const openNc = findings.filter((finding) =>
      ["major_nc", "minor_nc"].includes(normalize(finding.finding_type))
      && normalize(finding.status) !== "closed",
    );
    return {
      reportCount: reports.length,
      findingCount: findings.length,
      openNcCount: openNc.length,
    };
  }, [workspace]);

  const executionButtonLabel = !canExecute
    ? "Xem thực hiện"
    : normalize(plan?.status) === "in_progress"
      ? "Tiếp tục đánh giá"
      : normalize(plan?.status) === "completed"
        ? "Xem kết quả"
        : "Mở thực hiện";

  useEffect(() => {
    if (!editOpen || !plan) return;
    const start = dayjs(plan.planned_start_date);
    const end = dayjs(plan.planned_end_date ?? plan.planned_start_date);
    editForm.setFieldsValue({
      planned_dates: [
        start.isValid() ? start : dayjs(),
        end.isValid() ? end : start.isValid() ? start : dayjs(),
      ],
      location: plan.location ?? "",
      audit_scope: plan.audit_scope ?? plan.certification_projects?.certification_applications?.certification_scope ?? "",
      audit_criteria: plan.audit_criteria ?? plan.certification_projects?.standard_name ?? "",
      audit_objectives: plan.audit_objectives ?? "",
      status: normalize(plan.status) || "draft",
      audit_methods: getAuditMethods(plan.form_data),
    });
  }, [editForm, editOpen, plan]);

  const savePlanMutation = useMutation({
    mutationFn: async (values: PlanEditValues) => {
      if (!plan) throw new Error("Không tìm thấy kế hoạch đánh giá");
      const [start, end] = values.planned_dates;
      if (end.isBefore(start, "day")) {
        throw new Error("Ngày kết thúc không được trước ngày bắt đầu");
      }

      const methodSet = new Set(values.audit_methods ?? []);
      const payload = {
        planned_start_date: start.format("YYYY-MM-DD"),
        planned_end_date: end.format("YYYY-MM-DD"),
        location: values.location.trim(),
        audit_scope: values.audit_scope.trim(),
        audit_criteria: values.audit_criteria.trim(),
        audit_objectives: values.audit_objectives.trim(),
        status: values.status,
        form_data: {
          audit_methods: {
            onsite: methodSet.has("onsite"),
            remote: methodSet.has("remote"),
            document_review: methodSet.has("document_review"),
          },
        },
      };

      await api.patch(`/audit-plans/${plan.id}`, payload);

      if (plan.audit_event?.id && plan.audit_event.audit_programs?.id) {
        await api.patch(
          `/audit-programs/${plan.audit_event.audit_programs.id}/events/${plan.audit_event.id}`,
          {
            planned_start_date: payload.planned_start_date,
            planned_end_date: payload.planned_end_date,
            status: ["cancelled", "completed", "in_progress"].includes(values.status)
              ? values.status
              : "planned",
          },
        );
      }
    },
    onSuccess: async () => {
      message.success("Đã cập nhật kế hoạch và đồng bộ chương trình đánh giá.");
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["audit-plan", planId] });
      await queryClient.invalidateQueries({ queryKey: ["audit-plans"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-programs"] });
      await workspaceQuery.refetch();
      await onChanged?.();
    },
    onError: (error) => message.error(error instanceof Error ? error.message : getErrorMessage(error)),
  });

  return (
    <>
      <Drawer
        className="audit-plan-drawer audit-plan-drawer-v2"
        destroyOnHidden
        onClose={onClose}
        open={Boolean(planId)}
        title={(
          <div className="audit-plan-drawer-title">
            <span>Không gian kế hoạch đánh giá</span>
            <strong>{plan?.plan_code ?? "Đang tải dữ liệu..."}</strong>
          </div>
        )}
        width={900}
      >
        {workspaceQuery.isLoading ? (
          <Skeleton active paragraph={{ rows: 16 }} />
        ) : workspaceQuery.isError ? (
          <Alert
            action={<Button onClick={() => void workspaceQuery.refetch()} size="small">Thử lại</Button>}
            description={getErrorMessage(workspaceQuery.error)}
            message="Không tải được kế hoạch đánh giá"
            showIcon
            type="error"
          />
        ) : workspace && plan ? (
          <div className="audit-plan-workspace audit-plan-workspace-v2">
            <div className="audit-plan-actionbar audit-plan-actionbar-simplified">
              <div className="audit-plan-status-summary">
                <Space wrap size={6}>
                  <StatusTag status={plan.status} />
                  <Tag color={readiness.ready ? "green" : "orange"}>
                    {readiness.ready ? "Sẵn sàng" : "Cần hoàn thiện"}
                  </Tag>
                </Space>
                <Text type="secondary">
                  Một điểm vào cho kế hoạch; báo cáo, phát hiện và hoàn thành được xử lý trong Không gian thực hiện đánh giá.
                </Text>
              </div>
              <Space wrap>
                <Button
                  icon={<PlayCircleOutlined />}
                  onClick={() => setExecutionMode("full")}
                  type="primary"
                >
                  {executionButtonLabel}
                </Button>
                <Button
                  icon={<TeamOutlined />}
                  onClick={() => planId && onOpenScheduling(planId)}
                >
                  {appointment ? "Điều phối đoàn" : "Phân công đoàn"}
                </Button>
                {canManage ? (
                  <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
                    Sửa kế hoạch
                  </Button>
                ) : null}
              </Space>
            </div>

            <section className="audit-plan-readiness-strip">
              <div className="audit-plan-readiness-item audit-plan-readiness-primary">
                <span>Mức độ chuẩn bị</span>
                <strong>{Math.round((readiness.completedChecks / readiness.totalChecks) * 100)}%</strong>
                <Progress
                  percent={Math.round((readiness.completedChecks / readiness.totalChecks) * 100)}
                  showInfo={false}
                  size="small"
                  status={readiness.ready ? "success" : "active"}
                />
              </div>
              <div className="audit-plan-readiness-item">
                <span>Ngày công</span>
                <strong>{readiness.allocatedMandays.toFixed(1)} / {readiness.requiredMandays.toFixed(1)} MD</strong>
                <small>đã phân / yêu cầu</small>
              </div>
              <div className="audit-plan-readiness-item">
                <span>Đoàn đánh giá</span>
                <strong>{appointment ? readableStatus(appointment.status) : "Chưa có"}</strong>
                <small>{appointment?.members?.length ?? 0} thành viên</small>
              </div>
              <div className="audit-plan-readiness-item">
                <span>Thực hiện</span>
                <strong>{executionSummary.reportCount} báo cáo</strong>
                <small>{executionSummary.findingCount} phát hiện · {executionSummary.openNcCount} NC mở</small>
              </div>
            </section>

            {readiness.issues.length ? (
              <Alert
                description={(
                  <ul className="audit-plan-readiness-issues">
                    {readiness.issues.map((issue) => <li key={issue}>{issue}</li>)}
                  </ul>
                )}
                message="Kế hoạch còn nội dung cần hoàn thiện"
                showIcon
                type="warning"
              />
            ) : null}

            <Card className="audit-plan-overview" size="small" title="Thông tin kế hoạch">
              <div className="audit-plan-overview-heading">
                <div>
                  <span>{auditTypeLabels[normalize(plan.audit_type)] ?? readableStatus(plan.audit_type)}</span>
                  <strong>{plan.plan_code || "Chưa cấp mã kế hoạch"}</strong>
                </div>
                <StatusTag status={plan.status} />
              </div>

              <Descriptions column={2} size="small">
                <Descriptions.Item label="Hồ sơ">{plan.certification_projects?.project_code ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Chương trình">{plan.audit_event?.audit_programs?.program_code ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Thời gian">
                  {formatDate(plan.planned_start_date)}
                  {plan.planned_end_date && plan.planned_end_date !== plan.planned_start_date
                    ? ` – ${formatDate(plan.planned_end_date)}`
                    : ""}
                </Descriptions.Item>
                <Descriptions.Item label="Địa điểm">{plan.location || "Chưa cập nhật"}</Descriptions.Item>
                <Descriptions.Item label="Phạm vi" span={2}>{plan.audit_scope || "Chưa cập nhật"}</Descriptions.Item>
                <Descriptions.Item label="Tiêu chí" span={2}>{plan.audit_criteria || "Chưa cập nhật"}</Descriptions.Item>
                <Descriptions.Item label="Mục tiêu" span={2}>{plan.audit_objectives || "Chưa cập nhật"}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card
              className="audit-plan-section"
              extra={appointment ? <StatusTag status={appointment.status} /> : null}
              title="Đoàn đánh giá"
            >
              {appointment ? (
                <>
                  <div className="audit-appointment-meta">
                    <span>Số quyết định <strong>{appointment.appointment_number || "—"}</strong></span>
                    <span>Ngày chỉ định <strong>{formatDate(appointment.appointment_date)}</strong></span>
                    <span>Người ban hành <strong>{appointment.approved_by_user?.full_name || appointment.approved_by_user?.username || "Chưa ban hành"}</strong></span>
                  </div>
                  <List<AuditTeamMember>
                    className="audit-team-list"
                    dataSource={appointment.members ?? []}
                    locale={{ emptyText: "Chưa có thành viên trong đoàn đánh giá" }}
                    renderItem={(member) => (
                      <List.Item>
                        <div className="audit-team-member audit-team-member-v2">
                          <div className="audit-team-member-avatar">{member.experts?.full_name?.trim().charAt(0).toUpperCase() || "CG"}</div>
                          <div className="audit-team-member-info">
                            <strong>{member.experts?.full_name || "Chưa cập nhật chuyên gia"}</strong>
                            <span>{teamRoleLabels[normalize(member.team_role)] ?? readableStatus(member.team_role)}</span>
                            <small>{member.experts?.email || member.experts?.phone || "Chưa có thông tin liên hệ"}</small>
                          </div>
                          <div className="audit-team-member-allocation">
                            <strong>{numberValue(member.planned_mandays).toFixed(1)} MD</strong>
                            <Text type="secondary">
                              {formatDate(member.planned_start_date)}
                              {member.planned_end_date && member.planned_end_date !== member.planned_start_date
                                ? ` – ${formatDate(member.planned_end_date)}`
                                : ""}
                            </Text>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                </>
              ) : (
                <Empty
                  description="Kế hoạch chưa có dự thảo chỉ định đoàn"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button icon={<TeamOutlined />} onClick={() => planId && onOpenScheduling(planId)} type="primary">
                    Phân công đoàn
                  </Button>
                </Empty>
              )}
            </Card>

            <Card className="audit-plan-execution-handoff" size="small">
              <div>
                <strong>Không gian thực hiện đánh giá</strong>
                <Text type="secondary">
                  Báo cáo, phát hiện/NC và xác nhận hoàn thành được quản lý tại một nơi. Hồ sơ Word/PDF chính thức được quản lý ở danh sách thành phần hồ sơ theo kỳ.
                </Text>
              </div>
              <Button icon={<PlayCircleOutlined />} onClick={() => setExecutionMode("full")}>
                {executionButtonLabel}
              </Button>
            </Card>
          </div>
        ) : null}
      </Drawer>

      <AuditExecutionWorkspaceModal
        mode={executionMode ?? "full"}
        onChanged={async () => {
          await workspaceQuery.refetch();
          await onChanged?.();
        }}
        onClose={() => setExecutionMode(null)}
        open={Boolean(executionMode)}
        planId={planId}
        roles={roles}
      />

      <Modal
        cancelText="Hủy"
        destroyOnHidden
        maskClosable={false}
        okButtonProps={{ loading: savePlanMutation.isPending }}
        okText="Lưu kế hoạch"
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        open={editOpen}
        title={`Sửa kế hoạch ${plan?.plan_code ?? ""}`}
        width={760}
      >
        <Form<PlanEditValues>
          form={editForm}
          layout="vertical"
          onFinish={(values) => savePlanMutation.mutate(values)}
        >
          <Form.Item
            label="Thời gian đánh giá"
            name="planned_dates"
            rules={[{ required: true, message: "Chọn thời gian đánh giá" }]}
          >
            <RangePicker allowClear={false} format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Địa điểm đánh giá"
            name="location"
            rules={[{ required: true, message: "Nhập địa điểm đánh giá" }]}
          >
            <Input placeholder="Tên cơ sở và địa chỉ thực hiện đánh giá" />
          </Form.Item>

          <Form.Item
            label="Phạm vi cuộc đánh giá"
            name="audit_scope"
            rules={[{ required: true, message: "Nhập phạm vi cuộc đánh giá" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            label="Tiêu chí đánh giá"
            name="audit_criteria"
            rules={[{ required: true, message: "Nhập tiêu chí đánh giá" }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item
            label="Mục tiêu cuộc đánh giá"
            name="audit_objectives"
            rules={[{ required: true, message: "Nhập mục tiêu cuộc đánh giá" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item label="Phương pháp đánh giá" name="audit_methods">
            <Checkbox.Group
              options={[
                { label: "Tại chỗ", value: "onsite" },
                { label: "Từ xa", value: "remote" },
                { label: "Xem xét tài liệu", value: "document_review" },
              ]}
            />
          </Form.Item>

          <Form.Item label="Trạng thái kế hoạch" name="status">
            <Select
              options={[
                { label: "Dự thảo", value: "draft" },
                { label: "Đã lập kế hoạch", value: "planned" },
                { label: "Đang thực hiện", value: "in_progress" },
                { label: "Hoàn thành", value: "completed" },
                { label: "Đã hủy", value: "cancelled" },
              ]}
            />
          </Form.Item>

          <Alert
            icon={<ExclamationCircleOutlined />}
            description="Khi thay đổi ngày, hệ thống đồng bộ lại kỳ tương ứng trong chương trình đánh giá. Lịch phân công đoàn phải nằm trong khoảng ngày mới."
            showIcon
            type="info"
          />
        </Form>
      </Modal>
    </>
  );
}
