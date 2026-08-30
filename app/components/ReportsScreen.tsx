"use client";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  FileDoneOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  List,
  Progress,
  Select,
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
import type { DashboardOverview, StatusCount, UpcomingAudit } from "../types/dashboard";

const { Text, Title } = Typography;

interface CustomerSummary {
  company_name?: string | null;
  customer_code?: string | null;
}

interface AuditReport {
  id: string;
  report_code: string;
  report_date?: string | null;
  audit_start_date?: string | null;
  audit_end_date?: string | null;
  audit_result?: string | null;
  status?: string | null;
  version_no?: number | null;
  audit_plans?: {
    id?: string;
    project_id?: string;
    plan_code?: string | null;
    audit_type?: string | null;
    certification_projects?: {
      id: string;
      project_code?: string | null;
      standard_name?: string | null;
      certification_applications?: {
        customers?: CustomerSummary | null;
      } | null;
    } | null;
    audit_event?: {
      audit_programs?: {
        standard_name?: string | null;
        organization_name?: string | null;
      } | null;
    } | null;
  } | null;
}

interface ReportsScreenProps {
  roles: string[];
  onOpenProject: (projectId: string) => void;
}

const statusLabels: Record<string, string> = {
  active: "Đang hiệu lực",
  approved: "Đã phê duyệt",
  certificate_issued: "Đã cấp chứng chỉ",
  completed: "Hoàn thành",
  corrective_action_required: "Chờ khắc phục NC",
  draft: "Bản nháp",
  expired: "Đã hết hạn",
  in_progress: "Đang thực hiện",
  in_review: "Đang thẩm xét",
  issued: "Đã phát hành",
  pending: "Chờ xử lý",
  planned: "Đã lập kế hoạch",
  replaced: "Đã thay thế",
  response_submitted: "Đã gửi phản hồi",
  revision_required: "Yêu cầu bổ sung",
  suspended: "Tạm đình chỉ",
  technical_review_completed: "Đã thẩm xét kỹ thuật",
  under_review: "Đang xem xét",
  withdrawn: "Đã thu hồi",
};

const resultLabels: Record<string, string> = {
  conformity: "Phù hợp",
  conformity_after_ca: "Phù hợp sau khắc phục",
  nonconformities_found: "Có điểm không phù hợp",
  pending: "Chưa kết luận",
  certification_recommended: "Đề nghị chứng nhận",
  certification_not_recommended: "Không đề nghị chứng nhận",
};

const resultColors: Record<string, string> = {
  conformity: "green",
  conformity_after_ca: "blue",
  nonconformities_found: "orange",
  certification_recommended: "green",
  certification_not_recommended: "red",
  pending: "default",
};

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function statusLabel(value?: string | null) {
  const key = normalize(value);
  return statusLabels[key] ?? (value || "Chưa cập nhật").replaceAll("_", " ");
}

function resultLabel(value?: string | null) {
  const key = normalize(value);
  return resultLabels[key] ?? (value || "Chưa kết luận").replaceAll("_", " ");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "—";
}

function reportStandard(report: AuditReport) {
  return report.audit_plans?.certification_projects?.standard_name
    ?? report.audit_plans?.audit_event?.audit_programs?.standard_name
    ?? "Chưa cập nhật";
}

function reportCustomer(report: AuditReport) {
  return report.audit_plans?.certification_projects?.certification_applications?.customers?.company_name
    ?? report.audit_plans?.audit_event?.audit_programs?.organization_name
    ?? "Chưa cập nhật";
}

function reportProjectId(report: AuditReport) {
  return report.audit_plans?.certification_projects?.id
    ?? report.audit_plans?.project_id
    ?? null;
}

function statusColor(value?: string | null) {
  const key = normalize(value);
  if (["active", "approved", "completed", "technical_review_completed", "certificate_issued"].includes(key)) return "green";
  if (["corrective_action_required", "revision_required", "suspended"].includes(key)) return "orange";
  if (["expired", "withdrawn"].includes(key)) return "red";
  if (["in_progress", "in_review", "planned", "under_review"].includes(key)) return "blue";
  return "default";
}

function exportCsv(reports: AuditReport[]) {
  const headers = [
    "Mã báo cáo",
    "Khách hàng",
    "Hồ sơ",
    "Kế hoạch",
    "Tiêu chuẩn",
    "Ngày đánh giá",
    "Kết quả",
    "Trạng thái",
    "Phiên bản",
  ];
  const rows = reports.map((report) => [
    report.report_code,
    reportCustomer(report),
    report.audit_plans?.certification_projects?.project_code ?? "",
    report.audit_plans?.plan_code ?? "",
    reportStandard(report),
    formatDate(report.audit_start_date ?? report.report_date),
    resultLabel(report.audit_result),
    statusLabel(report.status),
    String(report.version_no ?? 1),
  ]);
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const content = `\uFEFF${[headers, ...rows].map((row) => row.map(escape).join(";")).join("\r\n")}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `bao-cao-quan-tri-${dayjs().format("YYYYMMDD-HHmm")}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function DistributionPanel({ data }: { data: StatusCount[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  if (!total) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu thống kê" />;

  return (
    <div className="report-distribution-list">
      {data.slice(0, 7).map((item) => {
        const percentage = Math.round((item.count / total) * 100);
        return (
          <div className="report-distribution-row" key={item.status}>
            <div><span>{statusLabel(item.status)}</span><strong>{item.count}</strong></div>
            <Progress percent={percentage} showInfo={false} strokeColor="#1769c2" />
          </div>
        );
      })}
    </div>
  );
}

export function ReportsScreen({ roles, onOpenProject }: ReportsScreenProps) {
  const [warningDays, setWarningDays] = useState(90);
  const [standardFilter, setStandardFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedRoles = useMemo(() => roles.map(normalize), [roles]);
  const canReadAuditReports = normalizedRoles.some((role) => [
    "admin",
    "staff",
    "coordinator",
    "auditor",
    "lead_auditor",
    "technical_reviewer",
    "decision_maker",
  ].includes(role));

  const overviewQuery = useQuery({
    queryKey: ["reports-screen", "overview", warningDays],
    queryFn: async () => (await api.get<DashboardOverview>(`/dashboard/overview?warning_days=${warningDays}`)).data,
  });
  const reportsQuery = useQuery({
    enabled: canReadAuditReports,
    queryKey: ["reports-screen", "audit-reports"],
    queryFn: async () => (await api.get<AuditReport[]>("/reports")).data,
  });

  const overview = overviewQuery.data;
  const reports = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data]);
  const standards = useMemo(() => Array.from(new Set([
    ...(overview?.recent_projects.map((item) => item.standard_name) ?? []),
    ...reports.map(reportStandard),
  ].filter((item) => item && item !== "Chưa cập nhật"))).sort(), [overview, reports]);

  const filteredReports = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase("vi");
    return reports.filter((report) => {
      if (standardFilter !== "all" && reportStandard(report) !== standardFilter) return false;
      if (!keyword) return true;
      return [
        report.report_code,
        reportCustomer(report),
        reportStandard(report),
        report.audit_plans?.plan_code,
        report.audit_plans?.certification_projects?.project_code,
      ].join(" ").toLocaleLowerCase("vi").includes(keyword);
    });
  }, [reports, searchTerm, standardFilter]);

  const resultDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const report of reports) {
      const key = normalize(report.audit_result) || "pending";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [reports]);

  const upcomingAudits = useMemo(() => (overview?.upcoming_audits ?? []).filter((audit) => (
    standardFilter === "all" || audit.audit_programs?.standard_name === standardFilter
  )), [overview?.upcoming_audits, standardFilter]);

  const columns = useMemo<TableColumnsType<AuditReport>>(() => [
    {
      title: "Báo cáo",
      key: "report",
      width: 190,
      render: (_, report) => (
        <div className="report-primary-cell">
          <strong>{report.report_code}</strong>
          <span>Phiên bản {report.version_no ?? 1}</span>
        </div>
      ),
    },
    {
      title: "Khách hàng & hồ sơ",
      key: "customer",
      width: 250,
      render: (_, report) => (
        <div className="report-primary-cell">
          <strong>{reportCustomer(report)}</strong>
          <span>{report.audit_plans?.certification_projects?.project_code ?? "Chưa gắn hồ sơ"}</span>
        </div>
      ),
    },
    { title: "Tiêu chuẩn", key: "standard", width: 160, render: (_, report) => reportStandard(report) },
    {
      title: "Đánh giá",
      key: "audit",
      width: 190,
      render: (_, report) => (
        <div className="report-primary-cell">
          <strong>{report.audit_plans?.plan_code ?? "Chưa có kế hoạch"}</strong>
          <span>{formatDate(report.audit_start_date ?? report.report_date)}</span>
        </div>
      ),
    },
    {
      title: "Kết quả",
      dataIndex: "audit_result",
      key: "audit_result",
      width: 190,
      render: (value: string | null) => <Tag color={resultColors[normalize(value)] ?? "default"}>{resultLabel(value)}</Tag>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 185,
      render: (value: string | null) => <Tag color={statusColor(value)}>{statusLabel(value)}</Tag>,
    },
    {
      title: "",
      key: "actions",
      fixed: "right",
      width: 105,
      render: (_, report) => {
        const projectId = reportProjectId(report);
        return <Button disabled={!projectId} onClick={() => projectId && onOpenProject(projectId)} size="small">Mở hồ sơ</Button>;
      },
    },
  ], [onOpenProject]);

  const isLoading = overviewQuery.isLoading || (canReadAuditReports && reportsQuery.isLoading);
  const refresh = () => {
    void overviewQuery.refetch();
    if (canReadAuditReports) void reportsQuery.refetch();
  };

  return (
    <div className="reports-screen">
      <div className="page-heading reports-heading">
        <div>
          <span className="eyebrow">PHÂN TÍCH HOẠT ĐỘNG</span>
          <Title level={2}>Báo cáo quản trị</Title>
          <Text type="secondary">Tổng hợp hiệu quả chứng nhận, đánh giá, NC/CAP và các thời hạn cần kiểm soát.</Text>
        </div>
        <Space wrap>
          <Select
            aria-label="Khoảng theo dõi"
            onChange={setWarningDays}
            options={[
              { value: 30, label: "30 ngày" },
              { value: 90, label: "90 ngày" },
              { value: 365, label: "12 tháng" },
            ]}
            value={warningDays}
          />
          <Button icon={<DownloadOutlined />} disabled={!filteredReports.length} onClick={() => exportCsv(filteredReports)}>Xuất CSV</Button>
          <Button icon={<ReloadOutlined />} loading={overviewQuery.isFetching || reportsQuery.isFetching} onClick={refresh}>Làm mới</Button>
        </Space>
      </div>

      {isLoading ? <Card><Skeleton active paragraph={{ rows: 12 }} /></Card> : null}
      {overviewQuery.isError ? (
        <Alert action={<Button onClick={refresh}>Thử lại</Button>} description={getErrorMessage(overviewQuery.error)} message="Không thể tải dữ liệu báo cáo" showIcon type="error" />
      ) : null}

      {overview ? (
        <>
          <section className="report-kpi-grid" aria-label="Chỉ số báo cáo quản trị">
            <Card><Statistic prefix={<FolderOpenOutlined />} title="Tổng hồ sơ chứng nhận" value={overview.summary.projects.total} /><span>{overview.summary.projects.active} hồ sơ đang xử lý</span></Card>
            <Card><Statistic prefix={<FileDoneOutlined />} title="Báo cáo đánh giá" value={reports.length} /><span>{resultDistribution.find((item) => item.status === "nonconformities_found")?.count ?? 0} báo cáo có NC</span></Card>
            <Card><Statistic prefix={<SafetyCertificateOutlined />} title="Chứng chỉ hiệu lực" value={overview.summary.certificates.active} /><span>{overview.summary.certificates.expiring} sắp hết hạn</span></Card>
            <Card><Statistic prefix={<WarningOutlined />} title="NC/CAP chưa đóng" value={overview.summary.findings.open} /><span>{overview.summary.findings.overdue} NC quá hạn</span></Card>
            <Card><Statistic prefix={<CalendarOutlined />} title={`Lịch trong ${warningDays} ngày`} value={overview.summary.audits.upcoming} /><span>{overview.summary.audits.overdue} lịch quá hạn</span></Card>
            <Card><Statistic prefix={<ClockCircleOutlined />} title="Chờ thẩm xét kỹ thuật" value={overview.summary.technical_reviews.pending} /><span>{overview.summary.notifications.unsent} thông báo chưa gửi</span></Card>
          </section>

          <section className="report-analysis-grid">
            <Card title="Tình trạng hồ sơ chứng nhận" extra={<Text type="secondary">{overview.summary.projects.total} hồ sơ</Text>}>
              <DistributionPanel data={overview.status_breakdown.projects} />
            </Card>
            <Card title="Kết quả báo cáo đánh giá" extra={<Text type="secondary">{reports.length} báo cáo</Text>}>
              {resultDistribution.length ? (
                <div className="report-result-grid">
                  {resultDistribution.slice(0, 6).map((item) => (
                    <div key={item.status}>
                      <Tag color={resultColors[item.status] ?? "default"}>{resultLabel(item.status)}</Tag>
                      <strong>{item.count}</strong>
                      <span>{reports.length ? Math.round((item.count / reports.length) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={canReadAuditReports ? "Chưa có báo cáo đánh giá" : "Vai trò hiện tại không có quyền xem danh sách báo cáo đánh giá"} />}
            </Card>
          </section>

          <Card className="report-table-card" title="Báo cáo đánh giá gần đây" extra={<Text type="secondary">Dữ liệu nghiệp vụ đã ghi nhận</Text>}>
            {canReadAuditReports ? (
              <>
                <div className="report-toolbar">
                  <Input allowClear onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm mã báo cáo, khách hàng, hồ sơ, kế hoạch..." prefix={<SearchOutlined />} value={searchTerm} />
                  <Select aria-label="Lọc tiêu chuẩn" onChange={setStandardFilter} options={[{ value: "all", label: "Tất cả tiêu chuẩn" }, ...standards.map((item) => ({ value: item, label: item }))]} value={standardFilter} />
                </div>
                {reportsQuery.isError ? <Alert description={getErrorMessage(reportsQuery.error)} message="Không thể tải danh sách báo cáo đánh giá" showIcon type="warning" /> : null}
                <Table columns={columns} dataSource={filteredReports.slice(0, 50)} locale={{ emptyText: "Không có báo cáo phù hợp bộ lọc" }} pagination={{ pageSize: 10, showSizeChanger: false }} rowKey="id" scroll={{ x: 1220 }} />
              </>
            ) : (
              <Empty description="Vai trò hiện tại chỉ được xem số liệu tổng hợp." />
            )}
          </Card>

          <section className="report-bottom-grid">
            <Card title="Lịch đánh giá sắp tới" extra={<Tag color="blue">{upcomingAudits.length} lịch</Tag>}>
              <List<UpcomingAudit>
                dataSource={upcomingAudits.slice(0, 6)}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`Không có lịch trong ${warningDays} ngày tới`} /> }}
                renderItem={(audit) => (
                  <List.Item>
                    <div className="report-audit-item">
                      <span className="report-audit-date"><strong>{audit.planned_start_date ? dayjs(audit.planned_start_date).format("DD") : "—"}</strong><small>{audit.planned_start_date ? dayjs(audit.planned_start_date).format("MM/YYYY") : "Chưa xếp"}</small></span>
                      <div><strong>{audit.audit_programs?.organization_name ?? "Chưa cập nhật tổ chức"}</strong><span>{audit.audit_programs?.standard_name ?? "—"} · {statusLabel(audit.status)}</span></div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="Cảnh báo điều hành" extra={<Tag color={overview.summary.alerts.critical ? "red" : "orange"}>{overview.summary.alerts.total} cảnh báo</Tag>}>
              <List
                dataSource={overview.priority_alerts.slice(0, 6)}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có cảnh báo cần xử lý" /> }}
                renderItem={(alert) => (
                  <List.Item>
                    <div className="report-alert-item">
                      {alert.severity === "critical" ? <WarningOutlined className="critical" /> : <ClockCircleOutlined />}
                      <div><strong>{alert.title}</strong><span>{alert.message}</span></div>
                      <Tag color={alert.severity === "critical" ? "red" : alert.severity === "warning" ? "orange" : "blue"}>{alert.severity === "critical" ? "Nghiêm trọng" : alert.severity === "warning" ? "Cảnh báo" : "Thông tin"}</Tag>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </section>

          <footer className="reports-footer"><CheckCircleOutlined /> Dữ liệu tổng hợp lúc {dayjs(overview.generated_at).format("HH:mm · DD/MM/YYYY")} · Các chỉ số đầu trang phản ánh toàn hệ thống.</footer>
        </>
      ) : null}
    </div>
  );
}
