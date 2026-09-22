"use client";

import { ImportOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Tag } from "antd";

import { api, getErrorMessage } from "../lib/api";
import { CertificationBodyCapabilitiesPanel } from "./CertificationBodyCapabilitiesPanel";
import { CertificationProgramsPanel } from "./CertificationProgramsPanel";
import {
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  ReadinessBlockerPanel,
  SectionHeader,
  type StructuredBlocker,
} from "./design-system";
import { IndustryTaxonomyPanel } from "./IndustryTaxonomyPanel";
import {
  MasterDataConfigurationPanel,
  type ConfigurationReadiness,
  type MasterDataConfigurationSection,
} from "./MasterDataConfigurationPanel";

export type ConfigurationRouteSection =
  | "schemes"
  | "standards"
  | "capabilities"
  | "numbering"
  | "branding"
  | "classifications"
  | "mappings"
  | "import";

interface ConfigurationRouteScreenProps {
  section: ConfigurationRouteSection;
  onNavigate: (section: ConfigurationRouteSection) => void;
}

interface ConfigurationDestination {
  key: ConfigurationRouteSection;
  label: string;
  description: string;
}

const destinations: ConfigurationDestination[] = [
  {
    key: "schemes",
    label: "Chương trình & tiêu chuẩn",
    description: "Thiết lập chương trình chứng nhận, tiêu chuẩn, phiên bản và quy tắc áp dụng.",
  },
  {
    key: "capabilities",
    label: "Phạm vi năng lực",
    description: "Khai báo năng lực theo đúng phiên bản tiêu chuẩn và lĩnh vực IAF.",
  },
  {
    key: "numbering",
    label: "Quy tắc đánh số",
    description: "Cấu hình dãy số cho các hồ sơ nghiệp vụ.",
  },
  {
    key: "branding",
    label: "Tổ chức & nhận diện",
    description: "Thông tin pháp lý, tên hiển thị và nhận diện cổng thông tin.",
  },
  {
    key: "classifications",
    label: "Phân loại ngành",
    description: "Tra cứu danh mục và kiểm soát chuỗi ISIC → NACE → IAF trong một không gian làm việc.",
  },
  {
    key: "import",
    label: "Nhập dữ liệu",
    description: "Kiểm tra trước rồi ghi dữ liệu cấu hình hàng loạt.",
  },
];

const pageIdentity: Record<ConfigurationRouteSection, string> = {
  schemes: "Chương trình & tiêu chuẩn",
  standards: "Chương trình & tiêu chuẩn",
  capabilities: "Năng lực tổ chức chứng nhận",
  numbering: "Quy tắc đánh số",
  branding: "Tổ chức & nhận diện",
  classifications: "Phân loại ngành",
  mappings: "Phân loại ngành",
  import: "Nhập dữ liệu cấu hình",
};

const panelSection: Partial<Record<ConfigurationRouteSection, MasterDataConfigurationSection>> = {
  numbering: "numbering",
  branding: "organization",
  import: "import",
};

function normalizeSection(section: ConfigurationRouteSection): ConfigurationRouteSection {
  if (section === "standards") return "schemes";
  if (section === "mappings") return "classifications";
  return section;
}

function readinessBlockers(section: ConfigurationRouteSection, readiness?: ConfigurationReadiness): StructuredBlocker[] {
  if (!readiness) return [];
  if (section === "branding" && !readiness.organization.ready) {
    return [{
      code: "ORGANIZATION_PROFILE",
      label: "Chưa hoàn tất hồ sơ tổ chức",
      explanation: "Bổ sung thông tin bắt buộc trước khi sử dụng cấu hình nhận diện.",
      severity: "BLOCKING",
    }];
  }
  if ((section === "classifications" || section === "mappings") && !readiness.taxonomy.ready) {
    return [{
      code: "TAXONOMY",
      label: "Dữ liệu phân loại chưa sẵn sàng",
      explanation: "Kiểm tra danh mục ISIC, NACE, IAF và các bảng quy đổi nguồn.",
      severity: "BLOCKING",
    }];
  }
  if (section === "numbering") {
    return readiness.numbering.reasons.map((reason) => ({
      code: `${reason.code}_${reason.entity_type}`,
      label: reason.label,
      explanation: reason.message,
      severity: reason.blocking ? "BLOCKING" as const : "WARNING" as const,
    }));
  }
  return [];
}

function ConfigurationContent({ section }: { section: ConfigurationRouteSection }) {
  if (section === "schemes" || section === "standards") return <CertificationProgramsPanel />;
  if (section === "capabilities") return <CertificationBodyCapabilitiesPanel />;
  if (section === "classifications" || section === "mappings") return <IndustryTaxonomyPanel mode="all" />;
  const activeSection = panelSection[section];
  return activeSection ? <MasterDataConfigurationPanel activeSection={activeSection} routeMode /> : null;
}

export function ConfigurationRouteScreen({ section }: ConfigurationRouteScreenProps) {
  const readiness = useQuery({
    queryKey: ["configuration-readiness"],
    queryFn: async () => (await api.get<ConfigurationReadiness>("/master-data-configuration/configuration-readiness")).data,
  });
  const activeSection = normalizeSection(section);
  const destination = destinations.find((item) => item.key === activeSection) ?? destinations[0];
  const blockers = readinessBlockers(activeSection, readiness.data);
  const programsSurface = activeSection === "schemes";
  const compactReadiness = ["classifications", "mappings", "capabilities"].includes(activeSection);
  const hideCapabilityReadyBanner = activeSection === "capabilities"
    && !readiness.isLoading
    && !readiness.isError
    && blockers.length === 0;
  const numberingOwnsReadiness = activeSection === "numbering";
  const organizationOwnsReadiness = activeSection === "branding";
  const taxonomyOwnsReadiness = activeSection === "classifications";

  return (
    <div className="configuration-route-page">
      <PageHeader
        title={destination.label}
        identity={<Tag icon={activeSection === "import" ? <ImportOutlined /> : <SafetyCertificateOutlined />}>{pageIdentity[activeSection]}</Tag>}
        description={destination.description}
      />

      {!programsSurface && !hideCapabilityReadyBanner && !numberingOwnsReadiness && !organizationOwnsReadiness && !taxonomyOwnsReadiness ? (
        <section className="configuration-route-page__readiness" aria-label="Trạng thái sẵn sàng">
          {!compactReadiness ? <SectionHeader title="Trạng thái sẵn sàng" description="Hoàn tất các mục còn thiếu trước khi sử dụng cấu hình này." /> : null}
          {readiness.isLoading ? <LoadingSkeleton variant="detail" rows={2} /> : readiness.isError ? (
            <ErrorState
              title="Không thể tải trạng thái cấu hình"
              description={getErrorMessage(readiness.error)}
              retry={{ label: "Thử lại", onAction: () => void readiness.refetch() }}
            />
          ) : compactReadiness && blockers.length === 0 ? (
            <Alert type="success" showIcon title="Không có mục cấu hình bắt buộc nào còn thiếu." />
          ) : <ReadinessBlockerPanel blockers={blockers} readyMessage="Không có mục cấu hình bắt buộc nào còn thiếu." />}
        </section>
      ) : null}

      {programsSurface ? (
        <div className="configuration-route-page__content">
          <ConfigurationContent section={activeSection} />
        </div>
      ) : (
        <Card className="configuration-route-page__content" {...(compactReadiness ? { variant: "borderless" as const } : { bordered: false })}>
          <ConfigurationContent section={activeSection} />
        </Card>
      )}
    </div>
  );
}
