"use client";

import { DeleteOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { invalidatePersonalWorkflowQueries } from "../lib/workspace-query-cache";

const { Text, Title } = Typography;

interface DelegationRecord {
  id: string;
  effective_from: string;
  effective_to: string;
  status: "SCHEDULED" | "ACTIVE" | "EXPIRED" | "REVOKED";
  scope_type: "ACTION" | "PROJECT_ACTION";
  action_codes: string[];
  reason: string;
  project?: { id?: string; project_code?: string | null } | null;
  delegator: { id: string; username: string; full_name?: string | null };
  delegate: { id: string; username: string; full_name?: string | null };
}

interface Candidate {
  id: string;
  username: string;
  full_name?: string | null;
  roles: string[];
}

interface ProjectOption {
  id: string;
  project_code?: string | null;
  certification_applications?: {
    customers?: { company_name?: string | null } | null;
  } | null;
}

interface FormValues {
  delegator_user_id?: string;
  delegate_user_id: string;
  period: [Dayjs, Dayjs];
  scope_type: "ACTION" | "PROJECT_ACTION";
  project_id?: string;
  action_codes: string[];
  reason: string;
}

interface GovernanceFilters {
  delegator_user_id?: string;
  delegate_user_id?: string;
  status?: string;
  from?: string;
  to?: string;
}

const actionOptions = [
  ["application.review", "Xem xét đăng ký"],
  ["surveillance.change_review", "Rà soát thay đổi giám sát"],
  ["audit_team.issue", "Bổ nhiệm đoàn đánh giá"],
  ["audit_plan.prepare", "Chuẩn bị kế hoạch đánh giá"],
  ["audit.execute", "Thực hiện đánh giá"],
  ["cap.review", "Xem xét hành động khắc phục"],
  ["technical_review.assign", "Phân công người thẩm xét"],
  ["technical_review.perform", "Thẩm xét kỹ thuật"],
  ["certification_decision.issue", "Ra quyết định chứng nhận"],
  ["certificate.issue", "Phát hành chứng chỉ"],
].map(([value, label]) => ({ value, label }));

const actionLabels = new Map(actionOptions.map((item) => [item.value, item.label]));
const statusLabels: Record<DelegationRecord["status"], string> = {
  SCHEDULED: "Chưa hiệu lực",
  ACTIVE: "Đang hiệu lực",
  EXPIRED: "Đã hết hạn",
  REVOKED: "Đã thu hồi",
};

export function DelegationScreen({ roles }: { roles: string[] }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [open, setOpen] = useState(false);
  const [governanceFilters, setGovernanceFilters] = useState<GovernanceFilters>({});
  const isAdmin = roles.some((role) => role.trim().toLowerCase() === "admin");
  const scopeType = Form.useWatch("scope_type", form) ?? "ACTION";
  const delegatorUserId = Form.useWatch("delegator_user_id", form);

  const recordsQuery = useQuery({
    queryKey: ["delegations", isAdmin ? "governance" : "me", governanceFilters],
    queryFn: async () => (await api.get<DelegationRecord[]>(isAdmin ? "/delegations" : "/delegations/me", {
      params: isAdmin ? governanceFilters : undefined,
    })).data,
  });
  const candidatesQuery = useQuery({
    queryKey: ["delegations", "candidates"],
    queryFn: async () => (await api.get<Candidate[]>("/delegations/candidates")).data,
  });
  const projectsQuery = useQuery({
    enabled: open && scopeType === "PROJECT_ACTION",
    queryKey: ["certification-projects", "delegation-scope"],
    queryFn: async () => (await api.get<ProjectOption[]>("/certification-projects")).data,
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => api.post("/delegations", {
      ...(isAdmin && values.delegator_user_id ? { delegator_user_id: values.delegator_user_id } : {}),
      delegate_user_id: values.delegate_user_id,
      effective_from: values.period[0].toISOString(),
      effective_to: values.period[1].toISOString(),
      scope_type: values.scope_type,
      ...(values.scope_type === "PROJECT_ACTION" ? { project_id: values.project_id } : {}),
      action_codes: values.action_codes,
      reason: values.reason.trim(),
    }),
    onSuccess: async () => {
      message.success("Đã tạo ủy quyền tạm thời");
      setOpen(false);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["delegations"] }),
        invalidatePersonalWorkflowQueries(queryClient),
      ]);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => api.patch(`/delegations/${id}/revoke`),
    onSuccess: async () => {
      message.success("Đã thu hồi ủy quyền");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["delegations"] }),
        invalidatePersonalWorkflowQueries(queryClient),
      ]);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns = useMemo<TableColumnsType<DelegationRecord>>(() => [
    {
      title: "Người ủy quyền",
      render: (_, item) => item.delegator.full_name || item.delegator.username,
    },
    {
      title: "Người xử lý thay",
      render: (_, item) => item.delegate.full_name || item.delegate.username,
    },
    {
      title: "Thời hạn",
      render: (_, item) => `${dayjs(item.effective_from).format("DD/MM/YYYY HH:mm")} – ${dayjs(item.effective_to).format("DD/MM/YYYY HH:mm")}`,
    },
    {
      title: "Phạm vi",
      render: (_, item) => (
        <Space direction="vertical" size={4}>
          {item.scope_type === "PROJECT_ACTION" ? (
            <Tag color="blue">Dự án {item.project?.project_code || "được chỉ định"}</Tag>
          ) : <Tag>Toàn hệ thống theo hành động</Tag>}
          <Space wrap>{item.action_codes.map((action) => <Tag key={action}>{actionLabels.get(action) ?? action}</Tag>)}</Space>
        </Space>
      ),
    },
    { title: "Lý do", dataIndex: "reason" },
    {
      title: "Trạng thái",
      render: (_, item) => (
        <Tag color={item.status === "ACTIVE" ? "green" : item.status === "REVOKED" ? "red" : item.status === "SCHEDULED" ? "blue" : "default"}>
          {statusLabels[item.status]}
        </Tag>
      ),
    },
    {
      title: "",
      width: 90,
      render: (_, item) => ["ACTIVE", "SCHEDULED"].includes(item.status) ? (
        <Button
          danger
          icon={<DeleteOutlined />}
          loading={revokeMutation.isPending && revokeMutation.variables === item.id}
          onClick={() => modal.confirm({
            title: "Thu hồi ủy quyền?",
            content: "Quyền xử lý thay sẽ dừng ngay lập tức; lịch sử vẫn được giữ.",
            okText: "Thu hồi",
            okButtonProps: { danger: true },
            cancelText: "Hủy",
            onOk: async () => revokeMutation.mutateAsync(item.id),
          })}
        />
      ) : null,
    },
  ], [modal, revokeMutation]);

  const candidateOptions = (candidatesQuery.data ?? []).map((candidate) => ({
    value: candidate.id,
    label: `${candidate.full_name || candidate.username} · ${candidate.roles.join(", ")}`,
  }));
  const delegateOptions = candidateOptions.filter((candidate) => candidate.value !== delegatorUserId);

  return (
    <div className="delegation-screen">
      <div className="screen-heading-row">
        <div>
          <Text className="screen-eyebrow">THAY THẾ TẠM THỜI</Text>
          <Title level={1}>Ủy quyền công việc</Title>
          <Text type="secondary">Ủy quyền có thời hạn và phạm vi; eligibility, resource scope và độc lập vẫn được kiểm tra tại thời điểm thực hiện.</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void recordsQuery.refetch()}>Làm mới</Button>
          <Button icon={<PlusOutlined />} onClick={() => setOpen(true)} type="primary">Tạo ủy quyền</Button>
        </Space>
      </div>
      {isAdmin ? (
        <Card title="Bộ lọc quản trị" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              allowClear
              onChange={(value) => setGovernanceFilters((current) => ({ ...current, delegator_user_id: value }))}
              options={candidateOptions}
              placeholder="Người ủy quyền"
              showSearch
              optionFilterProp="label"
              style={{ width: 220 }}
            />
            <Select
              allowClear
              onChange={(value) => setGovernanceFilters((current) => ({ ...current, delegate_user_id: value }))}
              options={candidateOptions}
              placeholder="Người xử lý thay"
              showSearch
              optionFilterProp="label"
              style={{ width: 220 }}
            />
            <Select
              allowClear
              onChange={(value) => setGovernanceFilters((current) => ({ ...current, status: value }))}
              options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
              placeholder="Trạng thái"
              style={{ width: 160 }}
            />
            <DatePicker.RangePicker
              onChange={(period) => setGovernanceFilters((current) => ({
                ...current,
                from: period?.[0]?.startOf("day").toISOString(),
                to: period?.[1]?.endOf("day").toISOString(),
              }))}
            />
          </Space>
        </Card>
      ) : null}
      <Card>
        <Table
          columns={columns}
          dataSource={recordsQuery.data ?? []}
          loading={recordsQuery.isLoading}
          rowKey="id"
          scroll={{ x: 1200 }}
        />
      </Card>
      <Modal
        cancelText="Hủy"
        confirmLoading={createMutation.isPending}
        okText="Tạo ủy quyền"
        onCancel={() => setOpen(false)}
        onOk={() => void form.validateFields().then((values) => createMutation.mutate(values))}
        open={open}
        title="Tạo ủy quyền tạm thời"
      >
        <Form form={form} initialValues={{ scope_type: "ACTION" }} layout="vertical">
          {isAdmin ? (
            <Form.Item extra="Để trống nếu ADMIN tự tạo ủy quyền cho chính mình." label="Tạo thay người ủy quyền" name="delegator_user_id">
              <Select allowClear loading={candidatesQuery.isLoading} options={candidateOptions} optionFilterProp="label" showSearch />
            </Form.Item>
          ) : null}
          <Form.Item label="Người xử lý thay" name="delegate_user_id" rules={[{ required: true, message: "Chọn người xử lý thay" }]}>
            <Select loading={candidatesQuery.isLoading} options={delegateOptions} optionFilterProp="label" showSearch />
          </Form.Item>
          <Form.Item label="Thời gian hiệu lực" name="period" rules={[{ required: true, message: "Chọn thời gian hiệu lực" }]}>
            <DatePicker.RangePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Kiểu phạm vi" name="scope_type" rules={[{ required: true }]}>
            <Select options={[
              { value: "ACTION", label: "Theo hành động — toàn hệ thống trong phạm vi quyền hiện có" },
              { value: "PROJECT_ACTION", label: "Theo hành động — chỉ một dự án" },
            ]} />
          </Form.Item>
          {scopeType === "PROJECT_ACTION" ? (
            <Form.Item label="Dự án" name="project_id" rules={[{ required: true, message: "Chọn dự án áp dụng" }]}>
              <Select
                loading={projectsQuery.isLoading}
                options={(projectsQuery.data ?? []).map((project) => ({
                  value: project.id,
                  label: [project.project_code, project.certification_applications?.customers?.company_name].filter(Boolean).join(" · ") || project.id,
                }))}
                optionFilterProp="label"
                showSearch
              />
            </Form.Item>
          ) : null}
          <Form.Item label="Hành động được ủy quyền" name="action_codes" rules={[{ required: true, message: "Chọn ít nhất một hành động" }]}>
            <Select mode="multiple" options={actionOptions} />
          </Form.Item>
          <Form.Item label="Lý do" name="reason" rules={[{ required: true, min: 3, message: "Nhập lý do" }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
