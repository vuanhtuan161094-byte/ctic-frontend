"use client";

import { DatabaseOutlined, ImportOutlined, SafetyCertificateOutlined, SettingOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Tag } from "antd";
import type { ReactNode } from "react";

import { api, getErrorMessage } from "../lib/api";
import { CertificationBodyCapabilitiesPanel } from "./CertificationBodyCapabilitiesPanel";
import { CertificationProgramsPanel } from "./CertificationProgramsPanel";
import {
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  ReadinessBlockerPanel,
  ResponsiveCardList,
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
  group: "certification" | "classification";
}

const destinations: ConfigurationDestination[] = [
  { key: "schemes", label: "Chương trình & tiêu chuẩn", description: "Quản lý chương trình chứng nhận và các phiên bản tiêu chuẩn được tổ chức áp dụng.", group: "certification" },
  { key: "capabilities", label: "Phạm vi năng lực", description: "Khai báo năng lực theo đúng phiên bản tiêu chuẩn và lĩnh vực IAF.", group: "certification" },
  { key: "numbering", label: "Quy tắc đánh số", description: "Cấu hình dãy số cho các hồ sơ nghiệp vụ.", group: "certification" },
  { key: "branding", label: "Tổ chức & nhận diện", description: "Thông tin pháp lý, tên hiển thị và nhận diện cổng thông tin.", group: "certification" },
  { key: "classifications", label: "Danh mục phân loại", description: "Tra cứu ISIC, NACE và lĩnh vực IAF.", group: "classification" },
  { key: "mappings", label: "Quy đổi phân loại", description: "Kiểm soát chuỗi quy đổi ISIC → NACE → IAF.", group: "classification" },
  { key: "import", label: "Nhập dữ liệu", description: "Kiểm tra trước rồi ghi dữ liệu cấu hình hàng loạt.", group: "classification" },
];

const pageIdentity: Record<ConfigurationRouteSection, string> = {
  schemes: "Chương trình & tiêu chuẩn",
  standards: "Chương trình & tiêu chuẩn",
  capabilities: "Năng lực tổ chức chứng nhận",
  numbering: "Quy tắc đánh số",
  branding: "Tổ chức & nhận diện",
  classifications: "Dữ liệu phân loại",
  mappings: "Quy đổi phân loại",
  import: "Nhập dữ liệu cấu hình",
};

const panelSection: Partial<Record<ConfigurationRouteSection, MasterDataConfigurationSection>> = {
  numbering: "numbering",
  branding: "organization",
  import: "import",
};

function normalizeSection(section: ConfigurationRouteSection): ConfigurationRouteSection {
  return section === "standards" ? "schemes" : section;
}

function readinessBlockers(section: ConfigurationRouteSection, readiness?: ConfigurationReadiness): StructuredBlocker[] {
  if (!readiness) return [];
  if (section === "branding" && !readiness.organization.ready) {
    return [{ code: "ORGANIZATION_PROFILE", label: "Chưa hoàn tất hồ sơ tổ chức", explanation: "Bổ sung thông tin bắt buộc trước khi sử dụng cấu hình nhận diện.", severity: "BLOCKING" }];
  }
  if (section === "schemes" || section === "standards") {
    return readiness.schemes.items.flatMap((scheme) => scheme.issues.map((issue, index) => ({
      code: `SCHEME_${scheme.id}_${index}`,
      label: `${scheme.code} — ${issue.replace(/ACTIVE/g, "đang áp dụng")}`,
      explanation: "Hoàn tất mục còn thiếu để chương trình sẵn sàng sử dụng.",
      severity: "BLOCKING" as const,
    })));
  }
  if ((section === "classifications" || section === "mappings") && !readiness.taxonomy.ready) {
    return [{ code: "TAXONOMY", label: "Dữ liệu phân loại chưa sẵn sàng", explanation: "Kiểm tra danh mục ISIC, NACE, IAF và các bảng quy đổi nguồn.", severity: "BLOCKING" }];
  }
  if (section === "numbering") {
    return readiness.numbering.missing_entity_types.map((entityType) => ({
      code: `NUMBERING_${entityType}`,
      label: `Chưa có quy tắc đánh số cho ${entityType}`,
      explanation: "Tạo dãy số có hiệu lực cho loại hồ sơ này.",
      severity: "BLOCKING" as const,
    }));
  }
  return [];
}

function ConfigurationNavigation({ section, onNavigate }: ConfigurationRouteScreenProps) {
  const activeSection = normalizeSection(section);
  const renderGroup = (group: ConfigurationDestination["group"], title: string, icon: ReactNode) => (
    <div className="configuration-route-nav__group">
      <div className="configuration-route-nav__title">{icon}<span>{title}</span></div>
      {destinations.filter((item) => item.group === group).map((item) => (
        <Button key={item.key} type={item.key === activeSection ? "primary" : "text"} onClick={() => onNavigate(item.key)}>
          {item.label}
        </Button>
      ))}
    </div>
  );

  return (
    <>
      <nav className="configuration-route-nav" aria-label="Điều hướng cấu hình">
        {renderGroup("certification", "CẤU HÌNH CHỨNG NHẬN", <SettingOutlined />)}
        {renderGroup("classification", "DỮ LIỆU PHÂN LOẠI", <DatabaseOutlined />)}
      </nav>
      <div className="configuration-route-nav-mobile">
        <ResponsiveCardList items={destinations.map((item) => ({
          key: item.key,
          title: item.label,
          status: item.key === activeSection ? <Tag color="blue">Đang xem</Tag> : undefined,
          fields: [{ key: "description", label: "", value: item.description }],
          actions: <Button size="small" type={item.key === activeSection ? "primary" : "default"} onClick={() => onNavigate(item.key)}>Mở</Button>,
        }))} />
      </div>
    </>
  );
}

function ConfigurationContent({ section }: { section: ConfigurationRouteSection }) {
  if (section === "schemes" || section === "standards") return <CertificationProgramsPanel />;
  if (section === "capabilities") return <CertificationBodyCapabilitiesPanel />;
  if (section === "classifications") return <IndustryTaxonomyPanel mode="classifications" />;
  if (section === "mappings") return <IndustryTaxonomyPanel mode="mappings" />;
  const activeSection = panelSection[section];
  return activeSection ? <MasterDataConfigurationPanel activeSection={activeSection} routeMode /> : null;
}

export function ConfigurationRouteScreen({ section, onNavigate }: ConfigurationRouteScreenProps) {
  const readiness = useQuery({
    queryKey: ["configuration-readiness"],
    queryFn: async () => (await api.get<ConfigurationReadiness>("/master-data-configuration/configuration-readiness")).data,
  });
  const activeSection = normalizeSection(section);
  const destination = destinations.find((item) => item.key === activeSection) ?? destinations[0];
  const blockers = readinessBlockers(activeSection, readiness.data);
  const programsSurface = activeSection === "schemes";

  return (
    <div className="configuration-route-page">
      <PageHeader
        title={destination.label}
        identity={<Tag icon={activeSection === "import" ? <ImportOutlined /> : <SafetyCertificateOutlined />}>{pageIdentity[activeSection]}</Tag>}
        description={destination.description}
      />
      <ConfigurationNavigation section={activeSection} onNavigate={onNavigate} />
      {!programsSurface ? (
        <section className="configuration-route-page__readiness" aria-label="Trạng thái sẵn sàng">
          <SectionHeader title="Trạng thái sẵn sàng" description="Hoàn tất các mục còn thiếu trước khi sử dụng cấu hình này." />
          {readiness.isLoading ? <LoadingSkeleton variant="detail" rows={2} /> : readiness.isError ? (
            <ErrorState
              title="Không thể tải trạng thái cấu hình"
              description={getErrorMessage(readiness.error)}
              retry={{ label: "Thử lại", onAction: () => void readiness.refetch() }}
            />
          ) : <ReadinessBlockerPanel blockers={blockers} readyMessage="Không có mục cấu hình bắt buộc nào còn thiếu." />}
        </section>
      ) : null}
      {programsSurface ? (
        <div className="configuration-route-page__content">
          <ConfigurationContent section={activeSection} />
        </div>
      ) : (
        <Card className="configuration-route-page__content" bordered={false}>
          <ConfigurationContent section={activeSection} />
        </Card>
      )}
    </div>
  );
}
