"use client";

import {
  SearchOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { useMemo, useState, type TableHTMLAttributes } from "react";
import { api, getErrorMessage } from "../lib/api";
import "./configuration-workspaces.css";

const { Paragraph, Text, Title } = Typography;

type IndustryCode = {
  id: string;
  classification_type: "ISIC" | "NACE";
  revision: string;
  code: string;
  title_en: string;
  title_vi?: string | null;
  parent_code?: string | null;
  level: number;
  is_active: boolean;
};

type IafScope = {
  id: string;
  iaf_code: string;
  iaf_name: string;
  description?: string | null;
  is_active: boolean;
};

type IndustryMapping = {
  id: string;
  mapping_type: string;
  mapping_status: string;
  note?: string | null;
  source_code: IndustryCode;
  target_code: IndustryCode;
};

type IndustrySummary = {
  chain: string[];
  counts: {
    isic_total: number;
    isic_classes: number;
    nace_total: number;
    nace_classes: number;
    iaf_total: number;
    isic_nace_approved: number;
    nace_iaf_qms_approved: number;
    nace_iaf_ems_approved: number;
    nace_iaf_ohsms_approved: number;
  };
  sources: Array<{ key: string; label: string; owner: string; purpose: string; url?: string }>;
};

type ResolveResult = {
  source: IndustryCode;
  management_system: string;
  nace_candidates: Array<{
    mapping_id?: string;
    mapping_type: string;
    nace: IndustryCode;
    resolution_status?: string;
    outside_iaf_table?: boolean;
    derived_from_nace_classes?: string[];
    iaf_candidates: Array<{
      mapping_id: string;
      iaf_code: string;
      iaf_name: string;
      source_document?: string | null;
      derived?: boolean;
      derived_from_nace_codes?: string[];
    }>;
  }>;
  iaf_summary?: {
    status: "UNIQUE" | "MULTIPLE" | "OUTSIDE_IAF_TABLE" | "UNRESOLVED";
    iaf_codes: string[];
    candidates: Array<{ iaf_code: string; iaf_name: string; source_document?: string | null }>;
  };
  requires_selection?: boolean;
  iaf_auto_resolved?: boolean;
};

type ResolvedDemoRow = {
  key: string;
  isic: IndustryCode;
  nace: IndustryCode;
  mappingType: string;
  iaf: ResolveResult["nace_candidates"][number]["iaf_candidates"][number] | null;
};

type MappingCoverage = {
  management_system: string;
  total_isic_classes: number;
  resolved: number;
  unique_iaf: number;
  multiple_iaf: number;
  outside_iaf_table: number;
  unresolved: number;
  complete_for_certifiable_isic: boolean;
  unresolved_items: Array<{ code: string; title: string; missing_nace_codes: string[] }>;
  note: string;
};

type TaxonomyReadiness = {
  ready: boolean;
  operational_revisions: { ISIC: string; NACE: string };
  reasons: Array<{
    code: string;
    blocking: boolean;
    management_system?: string;
    message: string;
  }>;
};

type NaceIafProjection = {
  management_system: string;
  operational_revision: string;
  items: Array<{
    nace: IndustryCode;
    resolution_status: string;
    outside_iaf_table: boolean;
    derived_from_nace_classes: string[];
    iaf_candidates: Array<{
      mapping_id: string;
      iaf_scope_id: string;
      iaf_code: string;
      iaf_name: string;
      source_document?: string | null;
      derived: boolean;
      derived_from_nace_codes: string[];
    }>;
  }>;
};

type NaceIafDisplayRow = {
  id: string;
  nace_code: IndustryCode;
  iaf_candidate: NaceIafProjection["items"][number]["iaf_candidates"][number] | null;
  management_system: string;
  resolution_status: string;
  derived_from_nace_codes: string[];
  outside_iaf_table: boolean;
};

const managementSystemLabels: Record<string, string> = {
  QMS: "ISO 9001 / QMS",
  EMS: "ISO 14001 / EMS",
  OHSMS: "ISO 45001 / OH&SMS",
};

const mappingTypeLabels: Record<string, string> = {
  EXACT: "Tương ứng 1–1",
  PARTIAL: "Tương ứng một phần",
  ONE_TO_MANY: "Một ISIC → nhiều NACE",
  DIRECT: "Tra trực tiếp từ NACE",
  DERIVED_FROM_CHILDREN: "Tổng hợp từ mã NACE chi tiết",
};

function codeTitle(row: IndustryCode) {
  return row.title_vi?.trim() || row.title_en;
}

function ClassificationTable(props: TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} tabIndex={0} aria-label="Dữ liệu phân loại, dùng phím mũi tên để cuộn" />;
}

interface IndustryTaxonomyPanelProps {
  mode?: "all" | "classifications" | "mappings";
}

export function IndustryTaxonomyPanel({ mode = "all" }: IndustryTaxonomyPanelProps = {}) {
  const [messageApi, contextHolder] = message.useMessage();
  const [isicSearch, setIsicSearch] = useState("");
  const [naceSearch, setNaceSearch] = useState("");
  const [iafSearch, setIafSearch] = useState("");
  const [mappingSearch, setMappingSearch] = useState("");
  const [naceIafSearch, setNaceIafSearch] = useState("");
  const [naceIafSystem, setNaceIafSystem] = useState("QMS");
  const [demoSystem, setDemoSystem] = useState("QMS");
  const [demoIsicIds, setDemoIsicIds] = useState<string[]>([]);
  const [demoResults, setDemoResults] = useState<ResolveResult[]>([]);
  const [demoLoading, setDemoLoading] = useState(false);
  const [quickType, setQuickType] = useState<"ISIC" | "NACE">("ISIC");
  const [quickCode, setQuickCode] = useState("");
  const [quickSystem, setQuickSystem] = useState("QMS");
  const [isicLevel, setIsicLevel] = useState<"CLASS" | "ALL">("CLASS");
  const [naceLevel, setNaceLevel] = useState<"CLASS" | "ALL">("CLASS");
  const [quickResult, setQuickResult] = useState<ResolveResult | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [coverageSystem, setCoverageSystem] = useState("QMS");

  const summary = useQuery({
    queryKey: ["industry-summary"],
    queryFn: async () => (await api.get<IndustrySummary>("/industry-classifications/summary")).data,
  });
  const readiness = useQuery({
    queryKey: ["industry-taxonomy-readiness"],
    queryFn: async () => (await api.get<TaxonomyReadiness>("/industry-classifications/readiness")).data,
  });
  const coverage = useQuery({
    queryKey: ["industry-mapping-coverage", coverageSystem],
    queryFn: async () => (await api.get<MappingCoverage>("/industry-classifications/mapping-coverage", { params: { management_system: coverageSystem } })).data,
  });
  const isic = useQuery({
    queryKey: ["industry-isic", readiness.data?.operational_revisions.ISIC],
    enabled: Boolean(readiness.data?.operational_revisions.ISIC),
    queryFn: async () => (await api.get<IndustryCode[]>("/industry-classifications/codes", { params: { classification_type: "ISIC", revision: readiness.data!.operational_revisions.ISIC, active: true } })).data,
  });
  const nace = useQuery({
    queryKey: ["industry-nace", readiness.data?.operational_revisions.NACE],
    enabled: Boolean(readiness.data?.operational_revisions.NACE),
    queryFn: async () => (await api.get<IndustryCode[]>("/industry-classifications/codes", { params: { classification_type: "NACE", revision: readiness.data!.operational_revisions.NACE, active: true } })).data,
  });
  const iaf = useQuery({
    queryKey: ["industry-iaf"],
    queryFn: async () => (await api.get<IafScope[]>("/industry-classifications/iaf-scopes?active=true")).data,
  });
  const isicNaceMappings = useQuery({
    queryKey: ["industry-isic-nace-mappings"],
    queryFn: async () => (await api.get<IndustryMapping[]>("/industry-classifications/mappings?status=APPROVED")).data,
  });
  const naceIafProjection = useQuery({
    queryKey: ["industry-nace-iaf-projection", naceIafSystem],
    queryFn: async () => (await api.get<NaceIafProjection>("/industry-classifications/nace-iaf-projection", { params: { management_system: naceIafSystem } })).data,
  });

  const isicClasses = useMemo(() => (isic.data ?? []).filter((row) => row.level === 4), [isic.data]);
  const filteredIsic = useMemo(() => {
    const key = isicSearch.trim().toLowerCase();
    return (isic.data ?? []).filter((row) =>
      (isicLevel === "ALL" || row.level === 4)
      && (!key || `${row.code} ${row.title_en} ${row.title_vi ?? ""}`.toLowerCase().includes(key)),
    );
  }, [isic.data, isicSearch, isicLevel]);
  const filteredNace = useMemo(() => {
    const key = naceSearch.trim().toLowerCase();
    return (nace.data ?? []).filter((row) =>
      (naceLevel === "ALL" || row.level === 4)
      && (!key || `${row.code} ${row.title_en} ${row.title_vi ?? ""}`.toLowerCase().includes(key)),
    );
  }, [nace.data, naceSearch, naceLevel]);
  const filteredIaf = useMemo(() => {
    const key = iafSearch.trim().toLowerCase();
    return (iaf.data ?? []).filter((row) => !key || `${row.iaf_code} ${row.iaf_name} ${row.description ?? ""}`.toLowerCase().includes(key));
  }, [iaf.data, iafSearch]);
  const filteredIsicNace = useMemo(() => {
    const key = mappingSearch.trim().toLowerCase();
    return (isicNaceMappings.data ?? []).filter((row) => !key || `${row.source_code.code} ${row.source_code.title_en} ${row.source_code.title_vi ?? ""} ${row.target_code.code} ${row.target_code.title_en} ${row.target_code.title_vi ?? ""}`.toLowerCase().includes(key));
  }, [isicNaceMappings.data, mappingSearch]);
  const hierarchicalNaceIafRows = useMemo<NaceIafDisplayRow[]>(() => {
    return (naceIafProjection.data?.items ?? []).flatMap<NaceIafDisplayRow>((item) => {
      if (!item.iaf_candidates.length) {
        return [{
          id: `${item.nace.id}-none-${naceIafSystem}`,
          nace_code: item.nace,
          iaf_candidate: null,
          management_system: naceIafSystem,
          resolution_status: item.resolution_status,
          derived_from_nace_codes: item.derived_from_nace_classes,
          outside_iaf_table: item.outside_iaf_table,
        }];
      }
      return item.iaf_candidates.map((candidate) => ({
        id: `${item.nace.id}-${candidate.mapping_id}`,
        nace_code: item.nace,
        iaf_candidate: candidate,
        management_system: naceIafSystem,
        resolution_status: item.resolution_status,
        derived_from_nace_codes: candidate.derived_from_nace_codes,
        outside_iaf_table: item.outside_iaf_table,
      }));
    });
  }, [naceIafProjection.data, naceIafSystem]);

  const filteredNaceIaf = useMemo(() => {
    const key = naceIafSearch.trim().toLowerCase();
    return hierarchicalNaceIafRows.filter((row) => !key || `${row.nace_code.code} ${row.nace_code.title_en} ${row.nace_code.title_vi ?? ""} ${row.iaf_candidate?.iaf_code ?? ""} ${row.iaf_candidate?.iaf_name ?? ""}`.toLowerCase().includes(key));
  }, [hierarchicalNaceIafRows, naceIafSearch]);

  const runDemo = async () => {
    if (!demoIsicIds.length) {
      messageApi.warning("Chọn ít nhất một hoạt động ISIC để tra thử");
      return;
    }
    const operationalRevision = readiness.data?.operational_revisions.ISIC;
    if (!operationalRevision) {
      messageApi.warning("Chưa tải được phiên bản ISIC vận hành");
      return;
    }
    setDemoLoading(true);
    try {
      const selected = demoIsicIds.map((id) => isicClasses.find((row) => row.id === id)).filter(Boolean) as IndustryCode[];
      const results = await Promise.all(selected.map(async (row) => (
        await api.get<ResolveResult>("/industry-classifications/resolve", {
          params: { classification_type: "ISIC", revision: operationalRevision, code: row.code, management_system: demoSystem },
        })
      ).data));
      setDemoResults(results);
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setDemoLoading(false);
    }
  };

  const runQuickLookup = async () => {
    const code = quickCode.trim();
    if (!code) {
      messageApi.warning("Nhập mã ISIC hoặc NACE cần tra");
      return;
    }
    const operationalRevision = readiness.data?.operational_revisions[quickType];
    if (!operationalRevision) {
      messageApi.warning("Chưa tải được phiên bản phân loại vận hành");
      return;
    }
    setQuickLoading(true);
    try {
      const result = (await api.get<ResolveResult>("/industry-classifications/resolve", {
        params: {
          classification_type: quickType,
          revision: operationalRevision,
          code,
          management_system: quickSystem,
        },
      })).data;
      setQuickResult(result);
    } catch (error) {
      setQuickResult(null);
      messageApi.error(getErrorMessage(error));
    } finally {
      setQuickLoading(false);
    }
  };

  const resolvedRows: ResolvedDemoRow[] = demoResults.flatMap((result) => result.nace_candidates.flatMap<ResolvedDemoRow>((candidate) => {
    if (!candidate.iaf_candidates.length) {
      return [{ key: `${result.source.id}-${candidate.nace.id}-none`, isic: result.source, nace: candidate.nace, mappingType: candidate.mapping_type, iaf: null }];
    }
    return candidate.iaf_candidates.map((iafCandidate) => ({
      key: `${result.source.id}-${candidate.nace.id}-${iafCandidate.mapping_id}`,
      isic: result.source,
      nace: candidate.nace,
      mappingType: candidate.mapping_type,
      iaf: iafCandidate,
    }));
  }));

  const loadQueries = [summary, readiness, coverage, isic, nace, iaf, isicNaceMappings, naceIafProjection];
  const failedQuery = loadQueries.find((query) => query.isError);
  if (failedQuery) {
    return (
      <div>
        {contextHolder}
        <Alert
          showIcon
          type="error"
          title="Không tải được dữ liệu phân loại ngành"
          description={getErrorMessage(failedQuery.error)}
          action={(
            <Button
              onClick={() => void Promise.all(loadQueries.map((query) => query.refetch()))}
            >
              Thử lại
            </Button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="taxonomy-workspace">
      {contextHolder}
      {!readiness.isLoading && readiness.data && !readiness.data.ready ? (
        <Alert
          showIcon
          type="warning"
          style={{ marginTop: 12 }}
          title="Taxonomy vận hành chưa sẵn sàng"
          description={readiness.data.reasons.length
            ? readiness.data.reasons.map((reason) => `${reason.code}: ${reason.message}`).join(" · ")
            : "Backend chưa xác nhận chuỗi taxonomy vận hành."}
        />
      ) : null}

      <section className="taxonomy-model" aria-label="Chuỗi phân loại nghiệp vụ">
        <div className="taxonomy-model__heading">
          <div>
            <Text strong>Chuỗi phân loại dùng trong CMP</Text>
            <Text type="secondary">Đi từ hoạt động của khách hàng đến lĩnh vực chứng nhận, theo đúng từng lớp dữ liệu.</Text>
          </div>
          <Tag color={coverage.data?.unresolved ? "red" : "green"}>
            {coverage.data?.unresolved ? `${coverage.data.unresolved} lỗi mapping` : "Mapping vận hành đạt"}
          </Tag>
        </div>
        <div className="taxonomy-model__flow">
          <div className="taxonomy-model__node">
            <span className="taxonomy-model__step">1</span>
            <div><strong>ISIC Rev.4</strong><small>Hoạt động kinh tế của khách hàng</small></div>
          </div>
          <span className="taxonomy-model__arrow">→</span>
          <div className="taxonomy-model__node">
            <span className="taxonomy-model__step">2</span>
            <div><strong>NACE Rev.2</strong><small>Lớp trung gian để quy đổi</small></div>
          </div>
          <span className="taxonomy-model__arrow">→</span>
          <div className="taxonomy-model__node">
            <span className="taxonomy-model__step">3</span>
            <div><strong>IAF</strong><small>Lĩnh vực dùng cho chứng nhận & năng lực</small></div>
          </div>
        </div>
      </section>

      <Card className="taxonomy-lookup-card" size="small" title={mode === "mappings" ? "Kiểm tra chất lượng quy đổi" : "Tra cứu nghiệp vụ"}>
        <Tabs items={[
          { key: "quick", label: "Tra nhanh ISIC / NACE", children: (<div aria-label="Tra nhanh bất kỳ mã ISIC / NACE">
        <div className="configuration-task-controls">
          <Select value={quickType} onChange={(value) => { setQuickType(value); setQuickResult(null); }} options={[{ value: "ISIC", label: "ISIC Rev.4" }, { value: "NACE", label: "NACE Rev.2" }]} aria-label="Loại mã tra cứu" />
          <Input value={quickCode} onChange={(event) => { setQuickCode(event.target.value); setQuickResult(null); }} onPressEnter={() => void runQuickLookup()} placeholder="Ví dụ: 26.5 hoặc 2220" aria-label="Mã cần tra" />
          <Select value={quickSystem} onChange={(value) => { setQuickSystem(value); setQuickResult(null); }} options={Object.entries(managementSystemLabels).map(([value, label]) => ({ value, label }))} aria-label="Hệ thống quản lý tra nhanh" />
          <Button type="primary" icon={<SearchOutlined />} loading={quickLoading} onClick={() => void runQuickLookup()}>Tra IAF</Button>
        </div>
        {quickResult ? (
          <div style={{ marginTop: 12 }}>
            <Alert
              showIcon
              type={quickResult.iaf_summary?.status === "UNRESOLVED" ? "error" : quickResult.iaf_summary?.status === "OUTSIDE_IAF_TABLE" ? "warning" : "success"}
              title={<span><b>{quickResult.source.code}</b> · {codeTitle(quickResult.source)}</span>}
              description={quickResult.iaf_summary?.status === "UNIQUE"
                ? <span>Kết quả: {quickResult.iaf_summary.candidates.map((iaf) => <Tag color="blue" key={iaf.iaf_code}>IAF {iaf.iaf_code} · {iaf.iaf_name}</Tag>)}</span>
                : quickResult.iaf_summary?.status === "MULTIPLE"
                  ? <span>Mã này bao phủ nhiều lĩnh vực IAF: {quickResult.iaf_summary.candidates.map((iaf) => <Tag color="gold" key={iaf.iaf_code}>IAF {iaf.iaf_code}</Tag>)}. Chọn hoạt động chi tiết hơn khi lập hồ sơ.</span>
                  : quickResult.iaf_summary?.status === "OUTSIDE_IAF_TABLE"
                    ? "Hoạt động này nằm ngoài bảng lĩnh vực IAF hiện hành; CMP không gán IAF giả."
                    : "Không phân giải được IAF. Đây là lỗi dữ liệu mapping cần quản trị viên xử lý."}
            />
            <Table
              components={{ table: ClassificationTable }}
              scroll={{ x: 600 }}
              style={{ marginTop: 10 }}
              size="small"
              pagination={false}
              rowKey={(row) => `${row.nace.id}-${row.mapping_type}`}
              dataSource={quickResult.nace_candidates}
              columns={[
                { title: "NACE", render: (_, row) => <><b>{row.nace.code}</b><div><Text type="secondary">{codeTitle(row.nace)}</Text></div></> },
                { title: "Cách xác định", render: (_, row) => <Tag>{mappingTypeLabels[row.mapping_type] ?? row.mapping_type}</Tag> },
                { title: "IAF", render: (_, row) => row.iaf_candidates.length ? <Space wrap>{row.iaf_candidates.map((iaf) => <Tag color="blue" key={iaf.mapping_id}>IAF {iaf.iaf_code}</Tag>)}</Space> : row.outside_iaf_table ? <Tag color="orange">Ngoài bảng IAF</Tag> : <Tag color="red">Thiếu mapping</Tag> },
              ]}
            />
          </div>
        ) : null}
      </div>) },
          { key: "activities", label: "Nhiều hoạt động ISIC", children: (<div aria-label="Tra thử nhiều hoạt động ISIC">
        <Paragraph type="secondary" style={{ marginBottom: 10 }}>
          Chọn các hoạt động để tra NACE & IAF. Không ghi dữ liệu vào đơn đăng ký.
        </Paragraph>
        <div className="configuration-task-controls">
          <Select
            aria-label="Hệ thống quản lý nhiều hoạt động"
            value={demoSystem}
            onChange={(value) => { setDemoSystem(value); setDemoResults([]); }}
            options={Object.entries(managementSystemLabels).map(([value, label]) => ({ value, label }))}
          />
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            maxTagCount="responsive"
            placeholder="Tìm ISIC bằng mã hoặc tên hoạt động tiếng Việt..."
            className="configuration-isic-selection"
            aria-label="Hoạt động ISIC"
            value={demoIsicIds}
            onChange={(value) => { setDemoIsicIds(value); setDemoResults([]); }}
            options={isicClasses.map((row) => ({ value: row.id, label: `${row.code} · ${codeTitle(row)}` }))}
          />
          <Button type="primary" icon={<SearchOutlined />} loading={demoLoading} onClick={() => void runDemo()}>Tra NACE & IAF</Button>
        </div>
        {resolvedRows.length ? (
          <Table<ResolvedDemoRow>
            components={{ table: ClassificationTable }}
            scroll={{ x: 640 }}
            style={{ marginTop: 12 }}
            size="small"
            rowKey="key"
            pagination={false}
            dataSource={resolvedRows}
            columns={[
              { title: "ISIC khách hàng", render: (_, row) => <><b>{row.isic.code}</b><div><Text type="secondary">{codeTitle(row.isic)}</Text></div></> },
              { title: "NACE đề xuất", render: (_, row) => <><b>{row.nace.code}</b><div><Text type="secondary">{codeTitle(row.nace)}</Text></div></> },
              { title: "Kiểu quy đổi", dataIndex: "mappingType", render: (value) => <Tag>{mappingTypeLabels[value] ?? value}</Tag> },
              { title: "IAF", render: (_, row) => row.iaf ? <><Tag color="blue">IAF {row.iaf.iaf_code}</Tag><div>{row.iaf.iaf_name}</div></> : <Text type="danger">Chưa có ánh xạ IAF</Text> },
            ]}
          />
        ) : null}
      </div>) },
          { key: "coverage", label: "Độ phủ ISIC → IAF", children: (<div aria-label="Kiểm tra độ phủ ISIC → IAF">
        <Space wrap style={{ marginBottom: 10 }}>
          <Select value={coverageSystem} onChange={setCoverageSystem} options={Object.entries(managementSystemLabels).map(([value, label]) => ({ value, label }))} aria-label="Hệ thống quản lý độ phủ" style={{ width: "100%", minWidth: 0 }} />
          {coverage.data?.complete_for_certifiable_isic ? <Tag color="green">Không có mã ISIC chứng nhận bị thiếu IAF</Tag> : <Tag color="red">Có {coverage.data?.unresolved ?? "—"} mã cần sửa mapping</Tag>}
        </Space>
        <Row gutter={[12, 12]}>
          <Col xs={12} md={4}><Statistic title="ISIC lớp chi tiết" value={coverage.data?.total_isic_classes ?? "—"} /></Col>
          <Col xs={12} md={4}><Statistic title="Resolve được IAF" value={coverage.data?.resolved ?? "—"} /></Col>
          <Col xs={12} md={4}><Statistic title="IAF duy nhất" value={coverage.data?.unique_iaf ?? "—"} /></Col>
          <Col xs={12} md={4}><Statistic title="Nhiều IAF cần chọn" value={coverage.data?.multiple_iaf ?? "—"} /></Col>
          <Col xs={12} md={4}><Statistic title="Ngoài bảng IAF" value={coverage.data?.outside_iaf_table ?? "—"} /></Col>
          <Col xs={12} md={4}><Statistic title="Lỗi chưa ánh xạ" value={coverage.data?.unresolved ?? "—"} styles={{ content: { color: (coverage.data?.unresolved ?? 0) ? "var(--cmp-state-critical)" : undefined } }} /></Col>
        </Row>
        <Text type="secondary">Mục tiêu kiểm soát là <b>Lỗi chưa ánh xạ = 0</b>. Các hoạt động chỉ quy đổi tới NACE 97/98/99 được ghi rõ là ngoài bảng IAF, không tự gán IAF sai chuẩn.</Text>
      </div>) },
        ].filter((item) => mode === "mappings" ? item.key === "coverage" : mode === "classifications" ? item.key !== "coverage" : true)} />
      </Card>

      <div className="taxonomy-data-strip" aria-label="Tình trạng dữ liệu phân loại">
        <div>
          <Text type="secondary">ISIC Rev.4</Text>
          <strong>{summary.data?.counts.isic_classes ?? "—"}</strong>
          <small>{summary.data?.counts.isic_total ?? "—"} mã toàn cây</small>
        </div>
        <div>
          <Text type="secondary">NACE Rev.2</Text>
          <strong>{summary.data?.counts.nace_classes ?? "—"}</strong>
          <small>{summary.data?.counts.nace_total ?? "—"} mã toàn cây</small>
        </div>
        <div>
          <Text type="secondary">Lĩnh vực IAF</Text>
          <strong>{summary.data?.counts.iaf_total ?? "—"}</strong>
          <small>lĩnh vực đang dùng</small>
        </div>
        <div className={(coverage.data?.unresolved ?? 0) ? "taxonomy-data-strip__attention" : undefined}>
          <Text type="secondary">Chất lượng quy đổi · {coverageSystem}</Text>
          <strong>{coverage.data?.unresolved ?? "—"} lỗi</strong>
          <small>{coverage.data?.outside_iaf_table ?? "—"} ngoài bảng IAF</small>
        </div>
      </div>
      <div className="taxonomy-catalog-heading">
        <div>
          <Text strong>{mode === "mappings" ? "Bảng quy đổi" : "Danh mục nền"}</Text>
          <Text type="secondary">{mode === "mappings" ? "Kiểm tra quan hệ ISIC → NACE → IAF." : "Tra cứu dữ liệu gốc; mặc định ưu tiên lớp chi tiết dùng trong hồ sơ chứng nhận."}</Text>
        </div>
      </div>
      <Tabs
        className="taxonomy-catalog-tabs"
        defaultActiveKey={mode === "mappings" ? "isic-nace" : "isic"}
        items={[
          {
            key: "isic",
            label: `ISIC · ${summary.data?.counts.isic_classes ?? 0} lớp`,
            children: <>
              <div className="taxonomy-catalog-toolbar">
                <Text type="secondary">Lớp 4 chữ số là mức ưu tiên khi xác định hoạt động chứng nhận.</Text>
                <Select
                  value={isicLevel}
                  onChange={setIsicLevel}
                  options={[
                    { value: "CLASS", label: `Lớp chi tiết (${summary.data?.counts.isic_classes ?? 0})` },
                    { value: "ALL", label: `Toàn bộ cây (${summary.data?.counts.isic_total ?? 0})` },
                  ]}
                  aria-label="Mức phân cấp ISIC"
                />
              </div>
              <Input allowClear prefix={<SearchOutlined />} aria-label="Tìm trong danh mục" placeholder="Tìm mã hoặc hoạt động ISIC..." value={isicSearch} onChange={(event) => setIsicSearch(event.target.value)} className="taxonomy-catalog-search" />
              <Table components={{ table: ClassificationTable }} scroll={{ x: 640 }} size="small" rowKey="id" loading={isic.isLoading} dataSource={filteredIsic} pagination={{ pageSize: 20, showSizeChanger: true }} columns={[
                { title: "Mã ISIC", dataIndex: "code", width: 110, render: (value, row: IndustryCode) => <><b>{value}</b><div><Tag>{row.level === 1 ? "Phần" : row.level === 2 ? "Ngành" : row.level === 3 ? "Nhóm" : "Lớp"}</Tag></div></> },
                { title: "Hoạt động kinh tế", render: (_, row: IndustryCode) => <><div>{codeTitle(row)}</div>{row.title_vi ? <Text type="secondary">Tên chính thức EN: {row.title_en}</Text> : <Text type="secondary">Tên chính thức theo UNSD (EN)</Text>}</> },
                { title: "Mã cha", dataIndex: "parent_code", width: 110, render: (value) => value || "—" },
                { title: "Phiên bản", dataIndex: "revision", width: 130 },
              ]} />
            </>,
          },
          {
            key: "nace",
            label: `NACE · ${summary.data?.counts.nace_classes ?? 0} lớp`,
            children: <>
              <div className="taxonomy-catalog-toolbar">
                <Text type="secondary">NACE là lớp trung gian của chuỗi quy đổi; mặc định hiển thị lớp chi tiết.</Text>
                <Select
                  value={naceLevel}
                  onChange={setNaceLevel}
                  options={[
                    { value: "CLASS", label: `Lớp chi tiết (${summary.data?.counts.nace_classes ?? 0})` },
                    { value: "ALL", label: `Toàn bộ cây (${summary.data?.counts.nace_total ?? 0})` },
                  ]}
                  aria-label="Mức phân cấp NACE"
                />
              </div>
              <Input allowClear prefix={<SearchOutlined />} aria-label="Tìm trong danh mục" placeholder="Tìm mã hoặc hoạt động NACE..." value={naceSearch} onChange={(event) => setNaceSearch(event.target.value)} className="taxonomy-catalog-search" />
              <Table components={{ table: ClassificationTable }} scroll={{ x: 640 }} size="small" rowKey="id" loading={nace.isLoading} dataSource={filteredNace} pagination={{ pageSize: 20, showSizeChanger: true }} columns={[
                { title: "Mã NACE", dataIndex: "code", width: 110, render: (value, row: IndustryCode) => <><b>{value}</b><div><Tag>{row.level === 1 ? "Phần" : row.level === 2 ? "Ngành" : row.level === 3 ? "Nhóm" : "Lớp"}</Tag></div></> },
                { title: "Hoạt động kinh tế", render: (_, row: IndustryCode) => <><div>{codeTitle(row)}</div>{row.title_vi ? <Text type="secondary">Tên chính thức EN: {row.title_en}</Text> : <Text type="secondary">Nguồn danh mục: Eurostat NACE Rev.2</Text>}</> },
                { title: "Mã cha", dataIndex: "parent_code", width: 110, render: (value) => value || "—" },
              ]} />
            </>,
          },
          {
            key: "iaf",
            label: `IAF · ${summary.data?.counts.iaf_total ?? 0} lĩnh vực`,
            children: <>
              <Paragraph type="secondary">IAF dùng cho phạm vi công nhận, năng lực tổ chức và chuyên gia; được đề xuất theo hệ thống quản lý.</Paragraph>
              <Input allowClear prefix={<SearchOutlined />} aria-label="Tìm trong danh mục" placeholder="Tìm IAF theo số hoặc tên lĩnh vực..." value={iafSearch} onChange={(event) => setIafSearch(event.target.value)} style={{ maxWidth: 520, margin: "12px 0" }} />
              <Table components={{ table: ClassificationTable }} scroll={{ x: 640 }} size="small" rowKey="id" loading={iaf.isLoading} dataSource={filteredIaf} pagination={{ pageSize: 15 }} columns={[
                { title: "IAF", dataIndex: "iaf_code", width: 90, render: (value) => <Tag color="blue">IAF {value}</Tag> },
                { title: "Lĩnh vực", dataIndex: "iaf_name", width: 320 },
                { title: "Giải thích / nguồn", dataIndex: "description" },
              ]} />
            </>,
          },
          {
            key: "isic-nace",
            label: `Quy đổi ISIC → NACE (${summary.data?.counts.isic_nace_approved ?? 0})`,
            children: <>
              <Paragraph type="secondary">Một ISIC có thể có nhiều NACE; thẩm xét viên xác nhận khi quan hệ không phải 1–1.</Paragraph>
              <Input allowClear prefix={<SearchOutlined />} aria-label="Tìm trong danh mục" placeholder="Tìm theo ISIC, NACE hoặc tên hoạt động..." value={mappingSearch} onChange={(event) => setMappingSearch(event.target.value)} style={{ maxWidth: 520, margin: "12px 0" }} />
              <Table components={{ table: ClassificationTable }} scroll={{ x: 640 }} size="small" rowKey="id" loading={isicNaceMappings.isLoading} dataSource={filteredIsicNace} pagination={{ pageSize: 20, showSizeChanger: true }} columns={[
                { title: "ISIC", render: (_, row: IndustryMapping) => <><b>{row.source_code.code}</b><div><Text type="secondary">{codeTitle(row.source_code)}</Text></div></> },
                { title: "NACE Rev.2", render: (_, row: IndustryMapping) => <><b>{row.target_code.code}</b><div><Text type="secondary">{codeTitle(row.target_code)}</Text></div></> },
                { title: "Quan hệ", dataIndex: "mapping_type", width: 180, render: (value) => <Tag>{mappingTypeLabels[value] ?? value}</Tag> },
                { title: "Nguồn", dataIndex: "note", width: 270, render: (value) => value || "UNSD" },
              ]} />
            </>,
          },
          {
            key: "nace-iaf",
            label: "Quy đổi NACE → IAF",
            children: <>
              <Paragraph type="secondary">Tra toàn bộ cây NACE; mã cha tổng hợp từ lớp chi tiết, giữ đủ các IAF khi có nhiều kết quả.</Paragraph>
              <div className="configuration-task-controls" style={{ margin: "12px 0" }}>
                <Select value={naceIafSystem} onChange={setNaceIafSystem} options={Object.entries(managementSystemLabels).map(([value, label]) => ({ value, label }))} aria-label="Hệ thống quản lý NACE IAF" />
                <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm NACE hoặc IAF..." value={naceIafSearch} onChange={(event) => setNaceIafSearch(event.target.value)} aria-label="Tìm NACE hoặc IAF" />
              </div>
              <Table components={{ table: ClassificationTable }} scroll={{ x: 640 }} size="small" rowKey="id" loading={naceIafProjection.isLoading} dataSource={filteredNaceIaf} pagination={{ pageSize: 20, showSizeChanger: true }} columns={[
                { title: "NACE Rev.2", render: (_, row: NaceIafDisplayRow) => <><b>{row.nace_code.code}</b><div><Text type="secondary">{codeTitle(row.nace_code)}</Text></div></> },
                { title: "Cấp", width: 90, render: (_, row: NaceIafDisplayRow) => <Tag>{row.nace_code.level === 1 ? "Phần" : row.nace_code.level === 2 ? "Ngành" : row.nace_code.level === 3 ? "Nhóm" : "Lớp"}</Tag> },
                { title: "IAF", render: (_, row: NaceIafDisplayRow) => row.iaf_candidate ? <><Tag color="blue">IAF {row.iaf_candidate.iaf_code}</Tag><div>{row.iaf_candidate.iaf_name}</div></> : row.outside_iaf_table ? <Tag color="orange">Ngoài bảng IAF</Tag> : <Tag color="red">Chưa phân giải</Tag> },
                { title: "Trạng thái policy", width: 190, render: (_, row: NaceIafDisplayRow) => <><Tag color={row.resolution_status.includes("MULTIPLE") ? "gold" : row.resolution_status === "UNRESOLVED" ? "red" : row.outside_iaf_table ? "orange" : "green"}>{row.resolution_status}</Tag>{row.derived_from_nace_codes.length ? <div><Text type="secondary">Từ {row.derived_from_nace_codes.length} lớp NACE</Text></div> : null}</> },
                { title: "Nguồn", width: 250, render: (_, row: NaceIafDisplayRow) => row.iaf_candidate?.source_document || (row.resolution_status.startsWith("DERIVED_") ? "Kế thừa từ các lớp NACE con" : "—") },
              ]} />
            </>,
          },
          {
            key: "sources",
            label: "Nguồn tham chiếu",
            children: <>
              <Title level={5}>Nguồn tham chiếu đang dùng</Title>
              <Paragraph type="secondary">Các nguồn dưới đây được lưu như baseline nghiệp vụ của chuỗi phân loại chứng nhận. Việc cập nhật lên phiên bản phân loại mới phải đi kèm bảng correspondence và rule IAF phù hợp, không thay tự động.</Paragraph>
              <Table components={{ table: ClassificationTable }} scroll={{ x: 640 }} size="small" rowKey="key" pagination={false} dataSource={summary.data?.sources ?? []} columns={[
                { title: "Bộ dữ liệu / tài liệu", dataIndex: "label", width: 220 },
                { title: "Cơ quan", dataIndex: "owner", width: 280 },
                { title: "Dùng để làm gì", dataIndex: "purpose" },
                { title: "Nguồn", dataIndex: "url", width: 110, render: (value) => value ? <Typography.Link href={value} target="_blank" rel="noreferrer">Mở nguồn</Typography.Link> : "—" },
              ]} />
            </>,
          },
        ].filter((item) => mode === "all"
          || (mode === "classifications" && ["isic", "nace", "iaf", "sources"].includes(item.key))
          || (mode === "mappings" && ["isic-nace", "nace-iaf"].includes(item.key)))}
      />
    </div>
  );
}
