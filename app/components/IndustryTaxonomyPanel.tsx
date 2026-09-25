"use client";

import {
  SearchOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Input,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { useMemo, useState, type TableHTMLAttributes } from "react";
import { api, getErrorMessage } from "../lib/api";
import "./configuration-workspaces.css";

const { Text } = Typography;

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
  const [mappingStatus, setMappingStatus] = useState("ALL");
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
    queryFn: async () => (await api.get<IndustryMapping[]>("/industry-classifications/mappings", {
      params: { status: "APPROVED" },
    })).data,
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

  const unifiedMappingRows = useMemo(() => {
    const key = mappingSearch.trim().toLowerCase();
    return (isicNaceMappings.data ?? []).flatMap((mapping) => {
      const targets = hierarchicalNaceIafRows.filter((row) => row.nace_code.id === mapping.target_code.id);
      return (targets.length ? targets : [{ id: 'none', iaf_candidate: null, outside_iaf_table: false, resolution_status: 'UNRESOLVED' }]).map((target) => ({
        ...mapping, ...target, id: `${mapping.id}-${target.id}`, mapping_id: mapping.id,
      }));
    }).filter((row) => (mappingStatus === "ALL"
      || (mappingStatus === "RESOLVED" && Boolean(row.iaf_candidate))
      || (mappingStatus === "UNRESOLVED" && !row.iaf_candidate && !row.outside_iaf_table)
      || (mappingStatus === "OUTSIDE" && row.outside_iaf_table))
      && (!key || `${row.source_code.code} ${codeTitle(row.source_code)} ${row.target_code.code} ${codeTitle(row.target_code)} ${row.iaf_candidate?.iaf_code ?? ''} ${row.iaf_candidate?.iaf_name ?? ''}`.toLowerCase().includes(key)));
  }, [isicNaceMappings.data, hierarchicalNaceIafRows, mappingSearch, mappingStatus]);

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
      const response = await api.post<{ items: ResolveResult[] }>("/industry-classifications/resolve-batch", {
        items: selected.map((row) => ({ classification_type: "ISIC", revision: operationalRevision, code: row.code, management_system: demoSystem })),
      });
      setDemoResults(response.data.items);
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
          title="Dữ liệu phân loại chưa sẵn sàng"
          description={readiness.data.reasons.length
            ? readiness.data.reasons.map((reason) => reason.message).join(" · ")
            : "Backend chưa xác nhận chuỗi phân loại vận hành."}
        />
      ) : null}

      <section className="taxonomy-model" aria-label="Chuỗi phân loại nghiệp vụ">
        <div className="taxonomy-model__heading">
          <div>
            <Text strong>Chuỗi phân loại dùng trong CMP</Text>
            <Text type="secondary">Hoạt động khách hàng được xác định theo ISIC, quy đổi qua NACE và xác định lĩnh vực IAF.</Text>
          </div>
          <Tag color={coverage.data?.unresolved ? "red" : "green"}>
            {coverage.data?.unresolved ? `${coverage.data.unresolved} lỗi ánh xạ` : "Dữ liệu sẵn sàng"}
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
            <div><strong>IAF</strong><small>Lĩnh vực chứng nhận và năng lực</small></div>
          </div>
        </div>
      </section>

      <Tabs
        className="taxonomy-primary-tabs"
        defaultActiveKey={mode === "mappings" ? "mapping" : "lookup"}
        items={[
          {
            key: "lookup",
            label: "Tra cứu",
            children: (
              <section className="taxonomy-view" aria-label="Tra cứu phân loại">
                <div className="taxonomy-view__heading">
                  <div>
                    <Text strong>Tra cứu nghiệp vụ</Text>
                    <Text type="secondary">Dùng khi cần xác định IAF từ một hoặc nhiều hoạt động của khách hàng.</Text>
                  </div>
                </div>
                <Tabs
                  size="small"
                  items={[
                    {
                      key: "quick",
                      label: "Một mã",
                      children: (
                        <div className="taxonomy-task">
                          <div className="configuration-task-controls">
                            <Select
                              value={quickType}
                              onChange={(value) => { setQuickType(value); setQuickResult(null); }}
                              options={[{ value: "ISIC", label: "ISIC Rev.4" }, { value: "NACE", label: "NACE Rev.2" }]}
                              aria-label="Loại mã tra cứu"
                            />
                            <Input
                              value={quickCode}
                              onChange={(event) => { setQuickCode(event.target.value); setQuickResult(null); }}
                              onPressEnter={() => void runQuickLookup()}
                              placeholder="Nhập mã, ví dụ 0111 hoặc 01.11"
                              aria-label="Mã cần tra"
                            />
                            <Select
                              value={quickSystem}
                              onChange={(value) => { setQuickSystem(value); setQuickResult(null); }}
                              options={Object.entries(managementSystemLabels).map(([value, label]) => ({ value, label }))}
                              aria-label="Hệ thống quản lý tra nhanh"
                            />
                            <Button type="primary" icon={<SearchOutlined />} loading={quickLoading} onClick={() => void runQuickLookup()}>
                              Tra IAF
                            </Button>
                          </div>
                          {quickResult ? (
                            <div className="taxonomy-result">
                              <Alert
                                showIcon
                                type={quickResult.iaf_summary?.status === "UNRESOLVED" ? "error" : quickResult.iaf_summary?.status === "OUTSIDE_IAF_TABLE" ? "warning" : "success"}
                                title={<span><b>{quickResult.source.code}</b> · {codeTitle(quickResult.source)}</span>}
                                description={quickResult.iaf_summary?.status === "UNIQUE"
                                  ? <span>Kết quả: {quickResult.iaf_summary.candidates.map((candidate) => <Tag color="blue" key={candidate.iaf_code}>IAF {candidate.iaf_code} · {candidate.iaf_name}</Tag>)}</span>
                                  : quickResult.iaf_summary?.status === "MULTIPLE"
                                    ? <span>Có nhiều lĩnh vực IAF phù hợp. Cần xác nhận theo hoạt động thực tế của khách hàng.</span>
                                    : quickResult.iaf_summary?.status === "OUTSIDE_IAF_TABLE"
                                      ? "Hoạt động nằm ngoài bảng lĩnh vực IAF hiện hành."
                                      : "Chưa phân giải được IAF. Cần kiểm tra dữ liệu ánh xạ."}
                              />
                              <Table
                                components={{ table: ClassificationTable }}
                                scroll={{ x: 600 }}
                                size="small"
                                pagination={false}
                                rowKey={(row) => `${row.nace.id}-${row.mapping_type}`}
                                dataSource={quickResult.nace_candidates}
                                columns={[
                                  { title: "NACE", render: (_, row) => <><b>{row.nace.code}</b><div><Text type="secondary">{codeTitle(row.nace)}</Text></div></> },
                                  { title: "Quan hệ", width: 180, render: (_, row) => <Tag>{mappingTypeLabels[row.mapping_type] ?? row.mapping_type}</Tag> },
                                  { title: "IAF", render: (_, row) => row.iaf_candidates.length ? <Space wrap>{row.iaf_candidates.map((candidate) => <Tag color="blue" key={candidate.mapping_id}>IAF {candidate.iaf_code}</Tag>)}</Space> : row.outside_iaf_table ? <Tag color="orange">Ngoài bảng IAF</Tag> : <Tag color="red">Thiếu ánh xạ</Tag> },
                                ]}
                              />
                            </div>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      key: "activities",
                      label: "Nhiều hoạt động",
                      children: (
                        <div className="taxonomy-task">
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
                              placeholder="Chọn hoạt động ISIC..."
                              className="configuration-isic-selection"
                              aria-label="Hoạt động ISIC"
                              value={demoIsicIds}
                              onChange={(value) => { setDemoIsicIds(value); setDemoResults([]); }}
                              options={isicClasses.map((row) => ({ value: row.id, label: `${row.code} · ${codeTitle(row)}` }))}
                            />
                            <Button type="primary" icon={<SearchOutlined />} loading={demoLoading} onClick={() => void runDemo()}>
                              Tra NACE & IAF
                            </Button>
                          </div>
                          {resolvedRows.length ? (
                            <Table<ResolvedDemoRow>
                              components={{ table: ClassificationTable }}
                              scroll={{ x: 680 }}
                              size="small"
                              rowKey="key"
                              pagination={false}
                              dataSource={resolvedRows}
                              columns={[
                                { title: "ISIC", render: (_, row) => <><b>{row.isic.code}</b><div><Text type="secondary">{codeTitle(row.isic)}</Text></div></> },
                                { title: "NACE", render: (_, row) => <><b>{row.nace.code}</b><div><Text type="secondary">{codeTitle(row.nace)}</Text></div></> },
                                { title: "Quan hệ", dataIndex: "mappingType", width: 180, render: (value) => <Tag>{mappingTypeLabels[value] ?? value}</Tag> },
                                { title: "IAF", render: (_, row) => row.iaf ? <><Tag color="blue">IAF {row.iaf.iaf_code}</Tag><div>{row.iaf.iaf_name}</div></> : <Text type="danger">Chưa có ánh xạ IAF</Text> },
                              ]}
                            />
                          ) : null}
                        </div>
                      ),
                    },
                  ]}
                />
              </section>
            ),
          },
          {
            key: "catalog",
            label: "Danh mục",
            children: (
              <section className="taxonomy-view" aria-label="Danh mục phân loại">
                <div className="taxonomy-data-strip" aria-label="Tình trạng dữ liệu phân loại">
                  <div>
                    <Text type="secondary">ISIC Rev.4</Text>
                    <strong>{summary.data?.counts.isic_classes ?? "—"}</strong>
                    <small>lớp chi tiết · {summary.data?.counts.isic_total ?? "—"} mã toàn cây</small>
                  </div>
                  <div>
                    <Text type="secondary">NACE Rev.2</Text>
                    <strong>{summary.data?.counts.nace_classes ?? "—"}</strong>
                    <small>lớp chi tiết · {summary.data?.counts.nace_total ?? "—"} mã toàn cây</small>
                  </div>
                  <div>
                    <Text type="secondary">IAF</Text>
                    <strong>{summary.data?.counts.iaf_total ?? "—"}</strong>
                    <small>lĩnh vực đang dùng</small>
                  </div>
                </div>

                <Tabs
                  className="taxonomy-catalog-tabs"
                  size="small"
                  items={[
                    {
                      key: "isic",
                      label: "ISIC",
                      children: (
                        <>
                          <div className="taxonomy-catalog-toolbar">
                            <Text type="secondary">Mặc định hiển thị lớp 4 chữ số dùng khi xác định hoạt động chứng nhận.</Text>
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
                          <Input allowClear prefix={<SearchOutlined />} aria-label="Tìm ISIC" placeholder="Tìm mã hoặc hoạt động ISIC..." value={isicSearch} onChange={(event) => setIsicSearch(event.target.value)} className="taxonomy-catalog-search" />
                          <Table
                            components={{ table: ClassificationTable }}
                            scroll={{ x: 640 }}
                            size="small"
                            rowKey="id"
                            loading={isic.isLoading}
                            dataSource={filteredIsic}
                            pagination={{ pageSize: 20, showSizeChanger: true }}
                            columns={[
                              { title: "Mã ISIC", dataIndex: "code", width: 110, render: (value, row: IndustryCode) => <><b>{value}</b>{isicLevel === "ALL" ? <div><Tag>{row.level === 1 ? "Phần" : row.level === 2 ? "Ngành" : row.level === 3 ? "Nhóm" : "Lớp"}</Tag></div> : null}</> },
                              { title: "Hoạt động kinh tế", render: (_, row: IndustryCode) => <><div>{codeTitle(row)}</div><Text type="secondary">{row.title_en}</Text></> },
                              { title: "Mã cha", dataIndex: "parent_code", width: 110, render: (value) => value || "—" },
                            ]}
                          />
                        </>
                      ),
                    },
                    {
                      key: "nace",
                      label: "NACE",
                      children: (
                        <>
                          <div className="taxonomy-catalog-toolbar">
                            <Text type="secondary">NACE là lớp trung gian của chuỗi quy đổi sang IAF.</Text>
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
                          <Input allowClear prefix={<SearchOutlined />} aria-label="Tìm NACE" placeholder="Tìm mã hoặc hoạt động NACE..." value={naceSearch} onChange={(event) => setNaceSearch(event.target.value)} className="taxonomy-catalog-search" />
                          <Table
                            components={{ table: ClassificationTable }}
                            scroll={{ x: 640 }}
                            size="small"
                            rowKey="id"
                            loading={nace.isLoading}
                            dataSource={filteredNace}
                            pagination={{ pageSize: 20, showSizeChanger: true }}
                            columns={[
                              { title: "Mã NACE", dataIndex: "code", width: 110, render: (value, row: IndustryCode) => <><b>{value}</b>{naceLevel === "ALL" ? <div><Tag>{row.level === 1 ? "Phần" : row.level === 2 ? "Ngành" : row.level === 3 ? "Nhóm" : "Lớp"}</Tag></div> : null}</> },
                              { title: "Hoạt động kinh tế", render: (_, row: IndustryCode) => <><div>{codeTitle(row)}</div><Text type="secondary">{row.title_en}</Text></> },
                              { title: "Mã cha", dataIndex: "parent_code", width: 110, render: (value) => value || "—" },
                            ]}
                          />
                        </>
                      ),
                    },
                    {
                      key: "iaf",
                      label: "IAF",
                      children: (
                        <>
                          <Input allowClear prefix={<SearchOutlined />} aria-label="Tìm IAF" placeholder="Tìm số hoặc tên lĩnh vực IAF..." value={iafSearch} onChange={(event) => setIafSearch(event.target.value)} className="taxonomy-catalog-search" />
                          <Table
                            components={{ table: ClassificationTable }}
                            scroll={{ x: 640 }}
                            size="small"
                            rowKey="id"
                            loading={iaf.isLoading}
                            dataSource={filteredIaf}
                            pagination={{ pageSize: 15 }}
                            columns={[
                              { title: "IAF", dataIndex: "iaf_code", width: 90, render: (value) => <Tag color="blue">IAF {value}</Tag> },
                              { title: "Lĩnh vực", dataIndex: "iaf_name", width: 340 },
                              { title: "Ghi chú", dataIndex: "description", render: (value) => value || "—" },
                            ]}
                          />
                        </>
                      ),
                    },
                  ]}
                />
              </section>
            ),
          },
          {
            key: "mapping",
            label: "Ánh xạ & kiểm soát",
            children: (
              <section className="taxonomy-view" aria-label="Ánh xạ và kiểm soát phân loại">
                <div className="taxonomy-control-strip">
                  <Select
                    value={coverageSystem}
                    onChange={setCoverageSystem}
                    options={Object.entries(managementSystemLabels).map(([value, label]) => ({ value, label }))}
                    aria-label="Hệ thống quản lý kiểm tra độ phủ"
                  />
                  <div><Text type="secondary">ISIC lớp chi tiết</Text><strong>{coverage.data?.total_isic_classes ?? "—"}</strong></div>
                  <div><Text type="secondary">Đã xác định IAF</Text><strong>{coverage.data?.resolved ?? "—"}</strong></div>
                  <div><Text type="secondary">Cần chọn IAF</Text><strong>{coverage.data?.multiple_iaf ?? "—"}</strong></div>
                  <div><Text type="secondary">Ngoài bảng IAF</Text><strong>{coverage.data?.outside_iaf_table ?? "—"}</strong></div>
                  <div className={(coverage.data?.unresolved ?? 0) ? "taxonomy-control-strip__critical" : undefined}><Text type="secondary">Lỗi ánh xạ</Text><strong>{coverage.data?.unresolved ?? "—"}</strong></div>
                </div>
                <Text type="secondary">
                  Mục tiêu kiểm soát: <b>Lỗi ánh xạ = 0</b>. Trường hợp ngoài bảng IAF được ghi nhận riêng, không tự gán lĩnh vực.
                </Text>

                <div className="taxonomy-catalog-toolbar">
                  <Input allowClear prefix={<SearchOutlined />} aria-label="Tìm chuỗi ISIC NACE IAF" placeholder="Tìm ISIC, NACE, IAF hoặc tên..." value={mappingSearch} onChange={(event) => setMappingSearch(event.target.value)} className="taxonomy-catalog-search" />
                  <Select value={naceIafSystem} onChange={setNaceIafSystem} options={Object.entries(managementSystemLabels).map(([value, label]) => ({ value, label }))} aria-label="Hệ thống quản lý ánh xạ" />
                  <Select value={mappingStatus} onChange={setMappingStatus} aria-label="Trạng thái ánh xạ" options={[
                    { value: "ALL", label: "Tất cả trạng thái" }, { value: "RESOLVED", label: "Đã xác định IAF" },
                    { value: "UNRESOLVED", label: "Chưa phân giải" }, { value: "OUTSIDE", label: "Ngoài bảng IAF" },
                  ]} />
                </div>
                <Table
                  aria-label="Chuỗi ánh xạ ISIC NACE IAF"
                  components={{ table: ClassificationTable }}
                  scroll={{ x: 760 }}
                  size="small"
                  rowKey="id"
                  loading={isicNaceMappings.isFetching || naceIafProjection.isFetching}
                  dataSource={unifiedMappingRows}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                  columns={[
                    { title: "ISIC", render: (_, row) => <><b>{row.source_code.code}</b><div><Text type="secondary">{codeTitle(row.source_code)}</Text></div></> },
                    { title: "NACE", render: (_, row) => <><b>{row.target_code.code}</b><div><Text type="secondary">{codeTitle(row.target_code)}</Text></div></> },
                    { title: "IAF", render: (_, row) => row.iaf_candidate ? <><Tag color="blue">IAF {row.iaf_candidate.iaf_code}</Tag><div>{row.iaf_candidate.iaf_name}</div></> : <Tag color="orange">{row.outside_iaf_table ? "Ngoài bảng IAF" : "Chưa phân giải"}</Tag> },
                    { title: "Hệ thống", render: () => naceIafSystem },
                    { title: "Trạng thái", render: (_, row) => <Tag>{row.outside_iaf_table ? "Ngoài bảng IAF" : !row.iaf_candidate ? "Chưa phân giải" : row.resolution_status.includes("MULTIPLE") ? "Cần chọn IAF" : "Đã xác định IAF"}</Tag> },
                  ]}
                  expandable={{ expandedRowRender: (row) => <Space direction="vertical"><Text>ISIC–NACE: {row.mapping_id}</Text><Text>NACE–IAF: {row.iaf_candidate?.mapping_id ?? "—"}</Text><Text>{row.note || row.iaf_candidate?.source_document || "—"}</Text></Space> }}
                />
              </section>
            ),
          },
          {
            key: "sources",
            label: "Nguồn tham chiếu",
            children: (
              <section className="taxonomy-view" aria-label="Nguồn tham chiếu phân loại">
                <div className="taxonomy-view__heading">
                  <div>
                    <Text strong>Nguồn và phiên bản đang sử dụng</Text>
                    <Text type="secondary">Chỉ thay phiên bản khi có đủ bảng quy đổi tương ứng; không tự nâng phiên bản thống kê.</Text>
                  </div>
                </div>
                <Table
                  components={{ table: ClassificationTable }}
                  scroll={{ x: 640 }}
                  size="small"
                  rowKey="key"
                  pagination={false}
                  dataSource={summary.data?.sources ?? []}
                  columns={[
                    { title: "Bộ dữ liệu / tài liệu", dataIndex: "label", width: 220 },
                    { title: "Cơ quan", dataIndex: "owner", width: 280 },
                    { title: "Vai trò trong CMP", dataIndex: "purpose" },
                    { title: "Nguồn", dataIndex: "url", width: 110, render: (value) => value ? <Typography.Link href={value} target="_blank" rel="noreferrer">Mở nguồn</Typography.Link> : "—" },
                  ]}
                />
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
