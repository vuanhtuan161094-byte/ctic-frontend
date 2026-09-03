import { ArrowRightOutlined } from "@ant-design/icons";
import { Button, Progress, Typography } from "antd";

import { EntitySummary, ReadinessBlockerPanel, SectionHeader } from "../design-system";
import { alertBlockers, caseCustomer, caseScope, cycleLabel, formatCaseDate } from "./case-model";
import type { CertificationCaseArea, CertificationCaseWorkspaceData, CertificationCycleGroup } from "./types";

export interface CertificationCaseOverviewProps {
  data: CertificationCaseWorkspaceData;
  cycle: CertificationCycleGroup | null;
  onNavigateArea: (area: CertificationCaseArea) => void;
}

export function CertificationCaseOverview({ data, cycle, onNavigateArea }: CertificationCaseOverviewProps) {
  const customer = caseCustomer(data.project) ?? data.dossier.project.customer;
  const application = data.project.certification_applications;
  const sites = application?.sites ?? [];
  const plans = cycle ? data.project.audit_plans.filter((plan) => cycle.plan_ids.includes(plan.id)) : [];
  const reviewActions = (application?.application_reviews ?? [])
    .flatMap((review) => review.workflow_actions ?? [])
    .filter((action) => action.created_at)
    .sort((left, right) => new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime())
    .slice(0, 3);
  const recentFiles = [...data.dossier.files]
    .sort((left, right) => new Date(right.uploaded_at).getTime() - new Date(left.uploaded_at).getTime())
    .slice(0, 3);

  return (
    <div className="cmp-case-area cmp-case-overview" data-case-area="overview">
      <section className="cmp-case-section">
        <SectionHeader title="Vị trí hiện tại" description="Tóm tắt chu kỳ và mức độ hoàn thiện từ dữ liệu nghiệp vụ hiện có; không suy diễn quyền thực hiện." />
        <div className="cmp-case-overview-grid">
          <div className="cmp-case-metric">
            <span>Chu kỳ</span>
            <strong>{cycle ? cycleLabel(cycle) : "Chưa có dữ liệu"}</strong>
            <small>{cycle?.dossier_description ?? "Chưa có mô tả chu kỳ"}</small>
          </div>
          <div className="cmp-case-metric">
            <span>Mức hoàn thiện nguồn hồ sơ</span>
            <Progress percent={cycle?.summary.completion_percentage ?? 0} size="small" strokeColor="var(--cmp-brand-primary)" />
            <small>{cycle ? `${cycle.summary.completed_items}/${cycle.summary.total_items} thành phần đã hoàn tất` : "Chưa có thành phần"}</small>
          </div>
          <div className="cmp-case-metric">
            <span>Điểm cần chú ý</span>
            <strong>{data.alerts.summary.total}</strong>
            <small>{data.alerts.summary.critical} nghiêm trọng · {data.alerts.summary.warning} cảnh báo</small>
          </div>
        </div>
      </section>

      {data.alerts.alerts.length ? (
        <section className="cmp-case-section" aria-label="Điểm cần chú ý">
          <ReadinessBlockerPanel title="Điểm cần chú ý và điều kiện sẵn sàng" blockers={alertBlockers(data.alerts.alerts)} />
        </section>
      ) : null}

      <section className="cmp-case-section">
        <SectionHeader title="Nhận diện chứng nhận" description="Thông tin gốc đã được xác nhận trên hồ sơ và đơn đăng ký liên kết." />
        <div className="cmp-case-identity-grid">
          <EntitySummary
            title="Khách hàng & phạm vi"
            items={[
              { label: "Khách hàng", value: customer?.company_name ?? "Chưa xác định" },
              { label: "Mã khách hàng", value: customer?.customer_code ?? "Chưa có" },
              { label: "Phạm vi", value: caseScope(data.project) },
              { label: "Số địa điểm", value: sites.length || application?.site_count || "Chưa ghi nhận" },
            ]}
          />
          <EntitySummary
            title="Tiêu chuẩn & chương trình"
            items={[
              { label: "Tiêu chuẩn / phiên bản", value: data.project.standard_name },
              { label: "Loại chứng nhận", value: application?.certification_type ?? "Chưa ghi nhận" },
              { label: "Mã đơn đăng ký", value: application?.application_code ?? "Chưa liên kết" },
              { label: "Trạng thái đơn", value: application?.status ?? "Chưa liên kết" },
            ]}
          />
        </div>
      </section>

      <section className="cmp-case-section">
        <SectionHeader
          title="Chu kỳ đang xem"
          description="Các mốc kế hoạch được lấy trực tiếp từ kế hoạch đánh giá thuộc chu kỳ."
          actions={<Button type="link" icon={<ArrowRightOutlined />} onClick={() => onNavigateArea("progress")}>Xem toàn bộ tiến trình</Button>}
        />
        <div className="cmp-case-plan-strip">
          <div><span>Bắt đầu dự kiến</span><strong>{formatCaseDate(cycle?.planned_start_date ?? plans[0]?.planned_start_date)}</strong></div>
          <div><span>Kết thúc dự kiến</span><strong>{formatCaseDate(cycle?.planned_end_date ?? plans.at(-1)?.planned_end_date)}</strong></div>
          <div><span>Kế hoạch liên quan</span><strong>{plans.length || cycle?.plan_ids.length || 0}</strong></div>
          <div><span>Ngày công dự kiến</span><strong>{cycle?.planned_mandays ?? "Chưa ghi nhận"}</strong></div>
        </div>
      </section>

      <div className="cmp-case-preview-grid">
        <section className="cmp-case-section">
          <SectionHeader
            title="Hoạt động gần đây"
            actions={<Button type="link" onClick={() => onNavigateArea("activity")}>Xem hoạt động</Button>}
          />
          {reviewActions.length ? reviewActions.map((action) => (
            <div className="cmp-case-preview-row" key={action.id}>
              <strong>{action.action?.replaceAll("_", " ") ?? "Cập nhật thẩm xét"}</strong>
              <span>{action.actor?.full_name ?? action.actor?.username ?? "Người dùng hệ thống"} · {formatCaseDate(action.created_at)}</span>
            </div>
          )) : <Typography.Text type="secondary">Chưa có hoạt động nghiệp vụ có cấu trúc để hiển thị.</Typography.Text>}
        </section>

        <section className="cmp-case-section">
          <SectionHeader
            title="Tài liệu mới nhất"
            actions={<Button type="link" onClick={() => onNavigateArea("documents")}>Xem tài liệu</Button>}
          />
          {recentFiles.length ? recentFiles.map((file) => (
            <div className="cmp-case-preview-row" key={file.id}>
              <strong>{file.original_name}</strong>
              <span>Phiên bản {file.version_no} · {formatCaseDate(file.uploaded_at)}</span>
            </div>
          )) : <Typography.Text type="secondary">Chưa có tệp được liên kết với hồ sơ.</Typography.Text>}
        </section>
      </div>
    </div>
  );
}
