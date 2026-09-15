import { ArrowRightOutlined } from "@ant-design/icons";
import { Button, Progress, Typography } from "antd";

import { ReadinessBlockerPanel, SectionHeader } from "../design-system";
import { caseCustomer, caseScope, cycleLabel, formatCaseDate, projectionBlockers } from "./case-model";
import type { CertificationCaseArea, CertificationCaseProjectionCycle, CertificationCaseWorkspaceProjection } from "./types";

export interface CertificationCaseOverviewProps {
  data: CertificationCaseWorkspaceProjection;
  cycle: CertificationCaseProjectionCycle | null;
  onNavigateArea: (area: CertificationCaseArea) => void;
}

export function CertificationCaseOverview({ data, cycle, onNavigateArea }: CertificationCaseOverviewProps) {
  const customer = caseCustomer(data);
  const sites = data.standards_scope.sites;
  const reviewActions = data.recent_activity.items.slice(0, 3);
  const recentFiles = data.document_summary.groups
    .flatMap((group) => group.latest ? [group.latest] : [])
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
            <small>{cycle?.description ?? "Chưa có mô tả chu kỳ"}</small>
          </div>
          <div className="cmp-case-metric">
            <span>Mức hoàn thiện nguồn hồ sơ</span>
            <Progress aria-label="Mức hoàn thiện nguồn hồ sơ" percent={cycle?.summary.completion_percentage ?? 0} size="small" strokeColor="var(--cmp-brand-primary)" />
            <small>{cycle ? `${cycle.summary.completed_items ?? 0}/${cycle.summary.total_items ?? 0} thành phần đã hoàn tất` : "Chưa có thành phần"}</small>
          </div>
          <div className="cmp-case-metric">
            <span>Điểm cần chú ý</span>
            <strong>{data.blockers.length}</strong>
            <small>{data.blockers.filter((item) => item.severity === "CRITICAL").length} nghiêm trọng · {data.blockers.filter((item) => item.severity === "WARNING").length} cảnh báo</small>
          </div>
        </div>
      </section>

      {data.blockers.length ? (
        <section className="cmp-case-blocker-section" aria-label="Điểm cần chú ý">
          <ReadinessBlockerPanel title="Điểm cần chú ý và điều kiện sẵn sàng" blockers={projectionBlockers(data)} />
        </section>
      ) : null}

      <section className="cmp-case-section">
        <SectionHeader title="Nhận diện chứng nhận" description="Thông tin gốc đã được xác nhận trên hồ sơ và đơn đăng ký liên kết." />
        <div className="cmp-case-identity-grid">
          <div className="cmp-case-identity-block">
            <h3>Khách hàng & phạm vi</h3>
            <dl>
              <div><dt>Khách hàng</dt><dd>{customer?.name ?? "Chưa xác định"}</dd></div>
              <div><dt>Mã khách hàng</dt><dd>{customer?.code ?? "Chưa có"}</dd></div>
              <div><dt>Phạm vi</dt><dd>{caseScope(data)}</dd></div>
              <div><dt>Số địa điểm</dt><dd>{sites.length || "Chưa ghi nhận"}</dd></div>
            </dl>
          </div>
          <div className="cmp-case-identity-block">
            <h3>Tiêu chuẩn & chương trình</h3>
            <dl>
              <div><dt>Tiêu chuẩn / phiên bản</dt><dd>{data.standards_scope.display_name}</dd></div>
              <div><dt>Loại chứng nhận</dt><dd>{data.standards_scope.certification_type ?? "Chưa ghi nhận"}</dd></div>
              <div><dt>Mã đơn đăng ký</dt><dd>{data.identity.application_reference}</dd></div>
              <div><dt>Phiên bản contract</dt><dd>{data.contract_version}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="cmp-case-section">
        <SectionHeader
          title="Chu kỳ đang xem"
          description="Các mốc kế hoạch được lấy trực tiếp từ kế hoạch đánh giá thuộc chu kỳ."
          actions={<Button type="link" icon={<ArrowRightOutlined />} onClick={() => onNavigateArea("progress")}>Xem toàn bộ tiến trình</Button>}
        />
        <div className="cmp-case-plan-strip">
          <div><span>Bắt đầu dự kiến</span><strong>{formatCaseDate(cycle?.planned_start_date)}</strong></div>
          <div><span>Kết thúc dự kiến</span><strong>{formatCaseDate(cycle?.planned_end_date)}</strong></div>
          <div><span>Kế hoạch liên quan</span><strong>{cycle?.plan_ids.length || 0}</strong></div>
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
              <strong>{action.title}</strong>
              <span>{action.actor?.display_name ?? "Hệ thống nghiệp vụ"} · {formatCaseDate(action.occurred_at)}</span>
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
