"use client";

import {
  AuditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Card,
  Empty,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import CorrectiveActionWorkspaceModal from "./CorrectiveActionWorkspaceModal";

const { Text, Title } = Typography;

interface CustomerWorkspaceSummary {
  plan: {
    id: string;
    plan_code: string | null;
    audit_type: string | null;
    planned_start_date: string | null;
    planned_end_date: string | null;
    status: string | null;
  };
  project: {
    project_code: string;
    standard_name: string | null;
    status: string | null;
  };
  customer: {
    customer_code: string;
    company_name: string;
  };
  finding_summary: {
    total: number;
    open: number;
    overdue: number;
  };
}

interface CustomerCorrectiveActionsScreenProps {
  roles: string[];
  onOpenPath?: (path: string) => void;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "—";
}

function customerSafeError(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) {
    return "Bạn không có quyền truy cập không gian khắc phục này.";
  }
  return getErrorMessage(error);
}

export function CustomerCorrectiveActionsScreen({ roles, onOpenPath }: CustomerCorrectiveActionsScreenProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const workspacesQuery = useQuery({
    queryKey: ["customer-corrective-action-workspaces"],
    queryFn: async () => (
      await api.get<CustomerWorkspaceSummary[]>("/audit-findings/customer/workspaces")
    ).data,
    staleTime: 30_000,
    retry: false,
  });

  const workspaces = useMemo(
    () => workspacesQuery.data ?? [],
    [workspacesQuery.data],
  );
  const totals = useMemo(() => workspaces.reduce(
    (summary, workspace) => ({
      findings: summary.findings + workspace.finding_summary.total,
      open: summary.open + workspace.finding_summary.open,
      overdue: summary.overdue + workspace.finding_summary.overdue,
    }),
    { findings: 0, open: 0, overdue: 0 },
  ), [workspaces]);

  const columns: TableColumnsType<CustomerWorkspaceSummary> = [
    {
      title: "Hồ sơ",
      key: "project",
      render: (_, workspace) => (
        <div className="table-primary-cell">
          <strong>{workspace.project.project_code}</strong>
          <small>{workspace.project.standard_name ?? "Chưa xác định tiêu chuẩn"}</small>
        </div>
      ),
    },
    {
      title: "Kế hoạch đánh giá",
      key: "plan",
      render: (_, workspace) => (
        <div className="table-primary-cell">
          <strong>{workspace.plan.plan_code ?? "Chưa cấp mã"}</strong>
          <small>{workspace.plan.audit_type ?? "Đánh giá"} · {formatDate(workspace.plan.planned_start_date)}</small>
        </div>
      ),
    },
    {
      title: "NC/CAP",
      key: "findings",
      render: (_, workspace) => (
        <Space wrap>
          <Tag color={workspace.finding_summary.open > 0 ? "orange" : "green"}>
            {workspace.finding_summary.open} đang xử lý
          </Tag>
          {workspace.finding_summary.overdue > 0 ? (
            <Tag color="red">{workspace.finding_summary.overdue} quá hạn</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, workspace) => (
        <Button
          disabled={workspace.finding_summary.total === 0}
          icon={<AuditOutlined />}
          onClick={() => setSelectedPlanId(workspace.plan.id)}
          type={workspace.finding_summary.open > 0 ? "primary" : "default"}
        >
          Mở khắc phục
        </Button>
      ),
    },
  ];

  if (workspacesQuery.isLoading) {
    return <Card><Skeleton active paragraph={{ rows: 10 }} /></Card>;
  }

  if (workspacesQuery.isError) {
    return (
      <Card>
        <Alert
          action={<Button icon={<ReloadOutlined />} onClick={() => void workspacesQuery.refetch()}>Thử lại</Button>}
          description={customerSafeError(workspacesQuery.error)}
          message="Không tải được hồ sơ khắc phục"
          showIcon
          type="error"
        />
      </Card>
    );
  }

  return (
    <div className="projects-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">KHÔNG GIAN KHÁCH HÀNG</span>
          <Title level={2}>Hành động khắc phục</Title>
          <Text type="secondary">
            Theo dõi điểm không phù hợp, gửi kế hoạch khắc phục và đính kèm bằng chứng của tổ chức bạn.
          </Text>
        </div>
      </div>

      <section className="project-summary-grid" aria-label="Tổng hợp hành động khắc phục">
        <Card><Statistic prefix={<FolderOpenOutlined />} title="Kế hoạch đánh giá" value={workspaces.length} /></Card>
        <Card><Statistic prefix={<CheckCircleOutlined />} title="Tổng NC" value={totals.findings} /></Card>
        <Card><Statistic prefix={<ClockCircleOutlined />} title="Đang xử lý" value={totals.open} /></Card>
        <Card><Statistic prefix={<WarningOutlined />} title="Quá hạn" value={totals.overdue} valueStyle={totals.overdue ? { color: "#cf1322" } : undefined} /></Card>
      </section>

      <Card>
        {workspaces.length ? (
          <Table<CustomerWorkspaceSummary>
            columns={columns}
            dataSource={workspaces}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            rowKey={(workspace) => workspace.plan.id}
            scroll={{ x: 760 }}
          />
        ) : (
          <Empty description="Chưa có kế hoạch đánh giá được gán cho tài khoản này" />
        )}
      </Card>

      <CorrectiveActionWorkspaceModal
        onOpenFinding={onOpenPath ? (id) => onOpenPath(`/portal/corrective-actions/${encodeURIComponent(id)}`) : undefined}
        onChanged={async () => {
          await workspacesQuery.refetch();
        }}
        onClose={() => setSelectedPlanId(null)}
        open={Boolean(selectedPlanId)}
        planId={selectedPlanId}
        roles={roles}
      />
    </div>
  );
}
