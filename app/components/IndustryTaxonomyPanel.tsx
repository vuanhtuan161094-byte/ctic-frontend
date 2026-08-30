"use client";

import {
  ApartmentOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  LinkOutlined,
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
import { useMemo, useState } from "react";
import { api, getErrorMessage } from "../lib/api";

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

type NaceIafMapping = {
  id: string;
  management_system: string;
  mapping_status: string;
  source_document?: string | null;
  note?: string | null;
  nace_code: IndustryCode;
  iaf_scope: IafScope;
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

type NaceIafDisplayRow = {
  id: string;
  nace_code: IndustryCode;
  iaf_scope: IafScope | null;
  management_system: string;
  source_document?: string | null;
  derived: boolean;
  derived_from_count: number;
  outside_iaf_table: boolean;
  unresolved: boolean;
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

function countReady(summary?: IndustrySummary) {
  if (!summary) return false;
  return summary.counts.isic_total > 700 && summary.counts.nace_total === 996 && summary.counts.iaf_total === 39;
}

export function IndustryTaxonomyPanel() {
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
  const [quickType, setQuickType] = useState<"ISIC" | "NACE">("NACE");
  const [quickCode, setQuickCode] = useState("26.5");
  const [quickSystem, setQuickSystem] = useState("QMS");
  const [quickResult, setQuickResult] = useState<ResolveResult | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [coverageSystem, setCoverageSystem] = useState("QMS");

  const summary = useQuery({
    queryKey: ["industry-summary"],
    queryFn: async () => (await api.get<IndustrySummary>("/industry-classifications/summary")).data,
  });
  const coverage = useQuery({
    queryKey: ["industry-mapping-coverage", coverageSystem],
    queryFn: async () => (await api.get<MappingCoverage>("/industry-classifications/mapping-coverage", { params: { management_system: coverageSystem } })).data,
  });
  const isic = useQuery({
    queryKey: ["industry-isic-rev4"],
    queryFn: async () => (await api.get<IndustryCode[]>("/industry-classifications/codes?classification_type=ISIC&revision=ISIC_REV_4&active=true")).data,
  });
  const nace = useQuery({
    queryKey: ["industry-nace-rev2"],
    queryFn: async () => (await api.get<IndustryCode[]>("/industry-classifications/codes?classification_type=NACE&revision=NACE_REV_2&active=true")).data,
  });
  const iaf = useQuery({
    queryKey: ["industry-iaf"],
    queryFn: async () => (await api.get<IafScope[]>("/industry-classifications/iaf-scopes?active=true")).data,
  });
  const isicNaceMappings = useQuery({
    queryKey: ["industry-isic-nace-mappings"],
    queryFn: async () => (await api.get<IndustryMapping[]>("/industry-classifications/mappings?status=APPROVED")).data,
  });
  const naceIafMappings = useQuery({
    queryKey: ["industry-nace-iaf-mappings"],
    queryFn: async () => (await api.get<NaceIafMapping[]>("/industry-classifications/nace-iaf-mappings?status=APPROVED")).data,
  });

  const isicClasses = useMemo(() => (isic.data ?? []).filter((row) => row.level === 4), [isic.data]);
  const filteredIsic = useMemo(() => {
    const key = isicSearch.trim().toLowerCase();
    return (isic.data ?? []).filter((row) => !key || `${row.code} ${row.title_en} ${row.title_vi ?? ""}`.toLowerCase().includes(key));
  }, [isic.data, isicSearch]);
  const filteredNace = useMemo(() => {
    const key = naceSearch.trim().toLowerCase();
    return (nace.data ?? []).filter((row) => !key || `${row.code} ${row.title_en} ${row.title_vi ?? ""}`.toLowerCase().includes(key));
  }, [nace.data, naceSearch]);
  const filteredIaf = useMemo(() => {
    const key = iafSearch.trim().toLowerCase();
    return (iaf.data ?? []).filter((row) => !key || `${row.iaf_code} ${row.iaf_name} ${row.description ?? ""}`.toLowerCase().includes(key));
  }, [iaf.data, iafSearch]);
  const filteredIsicNace = useMemo(() => {
    const key = mappingSearch.trim().toLowerCase();
    return (isicNaceMappings.data ?? []).filter((row) => !key || `${row.source_code.code} ${row.source_code.title_en} ${row.source_code.title_vi ?? ""} ${row.target_code.code} ${row.target_code.title_en} ${row.target_code.title_vi ?? ""}`.toLowerCase().includes(key));
  }, [isicNaceMappings.data, mappingSearch]);
  const hierarchicalNaceIafRows = useMemo<NaceIafDisplayRow[]>(() => {
    const codes = nace.data ?? [];
    const mappings = (naceIafMappings.data ?? []).filter((row) => row.management_system === naceIafSystem);
    const children = new Map<string, IndustryCode[]>();
    for (const row of codes) {
      if (!row.parent_code) continue;
      const bucket = children.get(row.parent_code) ?? [];
      bucket.push(row);
      children.set(row.parent_code, bucket);
    }
    const mappingByNace = new Map<string, NaceIafMapping[]>();
    for (const row of mappings) {
      const bucket = mappingByNace.get(row.nace_code.id) ?? [];
      bucket.push(row);
      mappingByNace.set(row.nace_code.id, bucket);
    }
    const descendantMemo = new Map<string, IndustryCode[]>();
    const descendants = (row: IndustryCode): IndustryCode[] => {
      const cached = descendantMemo.get(row.id);
      if (cached) return cached;
      if (row.level === 4) {
        descendantMemo.set(row.id, [row]);
        return [row];
      }
      const result = (children.get(row.code) ?? []).flatMap(descendants);
      descendantMemo.set(row.id, result);
      return result;
    };
    return codes.flatMap((row) => {
      const leaves = descendants(row);
      const directMappings = leaves.flatMap((leaf) => mappingByNace.get(leaf.id) ?? []);
      const uniqueIaf = new Map<string, NaceIafMapping>();
      for (const mapping of directMappings) uniqueIaf.set(mapping.iaf_scope.id, mapping);
      const outside = leaves.length > 0 && leaves.every((leaf) => /^(?:97|98|99)(?:\.|$)/.test(leaf.code));
      if (!uniqueIaf.size) {
        return [{
          id: `${row.id}-none-${naceIafSystem}`,
          nace_code: row,
          iaf_scope: null,
          management_system: naceIafSystem,
          derived: row.level < 4,
          derived_from_count: leaves.length,
          outside_iaf_table: outside,
          unresolved: !outside,
        }];
      }
      return [...uniqueIaf.values()].map((mapping) => ({
        id: `${row.id}-${mapping.iaf_scope.id}-${naceIafSystem}`,
        nace_code: row,
        iaf_scope: mapping.iaf_scope,
        management_system: naceIafSystem,
        source_document: mapping.source_document,
        derived: row.level < 4,
        derived_from_count: leaves.length,
        outside_iaf_table: false,
        unresolved: false,
      }));
    });
  }, [nace.data, naceIafMappings.data, naceIafSystem]);

  const filteredNaceIaf = useMemo(() => {
    const key = naceIafSearch.trim().toLowerCase();
    return hierarchicalNaceIafRows.filter((row) => !key || `${row.nace_code.code} ${row.nace_code.title_en} ${row.nace_code.title_vi ?? ""} ${row.iaf_scope?.iaf_code ?? ""} ${row.iaf_scope?.iaf_name ?? ""}`.toLowerCase().includes(key));
  }, [hierarchicalNaceIafRows, naceIafSearch]);

  const runDemo = async () => {
    if (!demoIsicIds.length) {
      messageApi.warning("Chọn ít nhất một hoạt động ISIC để tra thử");
      return;
    }
    setDemoLoading(true);
    try {
      const selected = demoIsicIds.map((id) => isicClasses.find((row) => row.id === id)).filter(Boolean) as IndustryCode[];
      const results = await Promise.all(selected.map(async (row) => (
        await api.get<ResolveResult>("/industry-classifications/resolve", {
          params: { classification_type: "ISIC", revision: "ISIC_REV_4", code: row.code, management_system: demoSystem },
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
    setQuickLoading(true);
    try {
      const result = (await api.get<ResolveResult>("/industry-classifications/resolve", {
        params: {
          classification_type: quickType,
          revision: quickType === "ISIC" ? "ISIC_REV_4" : "NACE_REV_2",
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

  const resolvedRows = demoResults.flatMap((result) => result.nace_candidates.flatMap((candidate) => {
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

  const loadQueries = [summary, coverage, isic, nace, iaf, isicNaceMappings, naceIafMappings];
  const failedQuery = loadQueries.find((query) => query.isError);
  if (failedQuery) {
    return (
      <div>
        {contextHolder}
        <Alert
          showIcon
          type="error"
          message="Không tải được dữ liệu phân loại ngành"
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
    <div>
      {contextHolder}
      <Alert
        showIcon
        icon={<ApartmentOutlined />}
        type="info"
        message="Luồng phân loại dùng trong CMP: ISIC của khách hàng → NACE Rev.2 → IAF"
        description={
          <div>
            <div>Khách hàng có thể có nhiều hoạt động. Khi xem xét đơn, người dùng chỉ cần tìm và tích một hoặc nhiều mã <b>ISIC Rev.4</b>; hệ thống tự tra bảng quy đổi để đề xuất NACE và IAF theo chương trình ISO 9001 / ISO 14001 / ISO 45001.</div>
            <div style={{ marginTop: 6 }}>Ví dụ: <b>ISIC 2220 – Sản xuất sản phẩm nhựa</b> có thể quy đổi sang nhiều lớp NACE 22.21 / 22.22 / 22.23 / 22.29; các lớp này đều thuộc <b>IAF 14 – Cao su và sản phẩm nhựa</b>. Khi có nhiều NACE phù hợp, thẩm xét viên chọn lớp đúng với phạm vi thực tế.</div>
          </div>
        }
      />

      <Alert
        showIcon
        type="warning"
        style={{ marginTop: 12 }}
        message="Phiên bản tham chiếu cho chứng nhận"
        description="CMP hiện khóa chuỗi ISIC Rev.4 → NACE Rev.2 → IAF vì các bảng phạm vi IAF ID 1:2023 (QMS/EMS) và IAF MD 22:2023 (OH&SMS) được xây dựng trên NACE Rev.2. Phiên bản thống kê mới hơn không tự động thay thế chuỗi chứng nhận này nếu chưa có bảng quy đổi IAF tương ứng."
      />

      <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
        <Col xs={12} md={6}><Card size="small"><Statistic title="ISIC Rev.4" value={summary.data?.counts.isic_total ?? 0} suffix="mã" prefix={<DatabaseOutlined />} /><Text type="secondary">{summary.data?.counts.isic_classes ?? 0} lớp 4 chữ số</Text></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="NACE Rev.2" value={summary.data?.counts.nace_total ?? 0} suffix="mã" prefix={<DatabaseOutlined />} /><Text type="secondary">{summary.data?.counts.nace_classes ?? 0} lớp chi tiết</Text></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Lĩnh vực IAF" value={summary.data?.counts.iaf_total ?? 0} suffix="lĩnh vực" prefix={<CheckCircleOutlined />} /><Text type="secondary">Danh mục 01–39</Text></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Quy đổi ISIC → NACE" value={summary.data?.counts.isic_nace_approved ?? 0} suffix="dòng" prefix={<LinkOutlined />} /><Text type="secondary">Đã phê duyệt</Text></Card></Col>
      </Row>

      {!summary.isLoading && !countReady(summary.data) ? (
        <Alert
          showIcon
          type="warning"
          style={{ marginTop: 12 }}
          message="Bộ dữ liệu chuẩn chưa được nạp đầy đủ"
          description="Sau khi cài patch Step 3, chạy LOAD_OFFICIAL_INDUSTRY_REFERENCE_20260826.cmd để nạp toàn bộ danh mục và các bảng quy đổi chính thức vào DEV."
        />
      ) : null}

      <Card size="small" style={{ marginTop: 16 }} title="Kiểm tra độ phủ ISIC → IAF">
        <Space wrap style={{ marginBottom: 10 }}>
          <Select value={coverageSystem} onChange={setCoverageSystem} options={Object.entries(managementSystemLabels).map(([value, label]) => ({ value, label }))} style={{ minWidth: 210 }} />
          {coverage.data?.complete_for_certifiable_isic ? <Tag color="green">Không có mã ISIC chứng nhận bị thiếu IAF</Tag> : <Tag color="red">Có {coverage.data?.unresolved ?? 0} mã cần sửa mapping</Tag>}
        </Space>
        <Row gutter={[12, 12]}>
          <Col xs={12} md={4}><Statistic title="ISIC lớp chi tiết" value={coverage.data?.total_isic_classes ?? 0} /></Col>
          <Col xs={12} md={4}><Statistic title="Resolve được IAF" value={coverage.data?.resolved ?? 0} /></Col>
          <Col xs={12} md={4}><Statistic title="IAF duy nhất" value={coverage.data?.unique_iaf ?? 0} /></Col>
          <Col xs={12} md={4}><Statistic title="Nhiều IAF cần chọn" value={coverage.data?.multiple_iaf ?? 0} /></Col>
          <Col xs={12} md={4}><Statistic title="Ngoài bảng IAF" value={coverage.data?.outside_iaf_table ?? 0} /></Col>
          <Col xs={12} md={4}><Statistic title="Lỗi chưa ánh xạ" value={coverage.data?.unresolved ?? 0} valueStyle={{ color: (coverage.data?.unresolved ?? 0) ? "#cf1322" : undefined }} /></Col>
        </Row>
        <Text type="secondary">Mục tiêu kiểm soát là <b>Lỗi chưa ánh xạ = 0</b>. Các hoạt động chỉ quy đổi tới NACE 97/98/99 được ghi rõ là ngoài bảng IAF, không tự gán IAF sai chuẩn.</Text>
      </Card>

      <Card size="small" style={{ marginTop: 16 }} title="Tra nhanh bất kỳ mã ISIC / NACE">
        <Paragraph type="secondary" style={{ marginBottom: 10 }}>
          Tra được cả mã cha. Ví dụ <b>NACE 26.5</b> được tổng hợp từ 26.51 và 26.52, vì cả hai cùng thuộc IAF 19 nên CMP trả về <b>IAF 19</b> ngay.
        </Paragraph>
        <Space wrap>
          <Select value={quickType} onChange={(value) => { setQuickType(value); setQuickResult(null); }} options={[{ value: "ISIC", label: "ISIC Rev.4" }, { value: "NACE", label: "NACE Rev.2" }]} style={{ width: 150 }} />
          <Input value={quickCode} onChange={(event) => { setQuickCode(event.target.value); setQuickResult(null); }} onPressEnter={() => void runQuickLookup()} placeholder="Ví dụ: 26.5 hoặc 2220" style={{ width: 190 }} />
          <Select value={quickSystem} onChange={(value) => { setQuickSystem(value); setQuickResult(null); }} options={Object.entries(managementSystemLabels).map(([value, label]) => ({ value, label }))} style={{ minWidth: 210 }} />
          <Button type="primary" icon={<SearchOutlined />} loading={quickLoading} onClick={() => void runQuickLookup()}>Tra IAF</Button>
        </Space>
        {quickResult ? (
          <div style={{ marginTop: 12 }}>
            <Alert
              showIcon
              type={quickResult.iaf_summary?.status === "UNRESOLVED" ? "error" : quickResult.iaf_summary?.status === "OUTSIDE_IAF_TABLE" ? "warning" : "success"}
              message={<span><b>{quickResult.source.code}</b> · {codeTitle(quickResult.source)}</span>}
              description={quickResult.iaf_summary?.status === "UNIQUE"
                ? <span>Kết quả: {quickResult.iaf_summary.candidates.map((iaf) => <Tag color="blue" key={iaf.iaf_code}>IAF {iaf.iaf_code} · {iaf.iaf_name}</Tag>)}</span>
                : quickResult.iaf_summary?.status === "MULTIPLE"
                  ? <span>Mã này bao phủ nhiều lĩnh vực IAF: {quickResult.iaf_summary.candidates.map((iaf) => <Tag color="gold" key={iaf.iaf_code}>IAF {iaf.iaf_code}</Tag>)}. Chọn hoạt động chi tiết hơn khi lập hồ sơ.</span>
                  : quickResult.iaf_summary?.status === "OUTSIDE_IAF_TABLE"
                    ? "Hoạt động này nằm ngoài bảng lĩnh vực IAF hiện hành; CMP không gán IAF giả."
                    : "Không phân giải được IAF. Đây là lỗi dữ liệu mapping cần quản trị viên xử lý."}
            />
            <Table
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
      </Card>

      <Card size="small" style={{ marginTop: 16 }} title="Tra thử nhiều hoạt động ISIC như lúc xem xét khách hàng">
        <Paragraph type="secondary" style={{ marginBottom: 10 }}>
          Đây là bản xem thử đúng luồng nghiệp vụ: chọn nhiều hoạt động ISIC của khách hàng, chọn hệ thống quản lý, CMP trả về các NACE và IAF tương ứng. Không ghi dữ liệu vào đơn đăng ký.
        </Paragraph>
        <Space wrap align="start" style={{ width: "100%" }}>
          <Select
            style={{ minWidth: 210 }}
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
            style={{ minWidth: 480, maxWidth: 760 }}
            value={demoIsicIds}
            onChange={(value) => { setDemoIsicIds(value); setDemoResults([]); }}
            options={isicClasses.map((row) => ({ value: row.id, label: `${row.code} · ${codeTitle(row)}` }))}
          />
          <Button type="primary" icon={<SearchOutlined />} loading={demoLoading} onClick={() => void runDemo()}>Tra NACE & IAF</Button>
        </Space>
        {resolvedRows.length ? (
          <Table
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
      </Card>

      <Tabs
        style={{ marginTop: 16 }}
        items={[
          {
            key: "isic",
            label: `Danh mục ISIC (${summary.data?.counts.isic_total ?? 0})`,
            children: <>
              <Alert showIcon type="info" message="ISIC là mã hoạt động khách hàng chọn trực tiếp" description="Danh mục được lưu đủ cấp: Section → Division → Group → Class. Bản dịch tiếng Việt dùng trong CMP được hiển thị chính để dễ tra cứu; tên tiếng Anh nguồn của UNSD vẫn giữ bên dưới để đối chiếu. Khi chọn hoạt động cho khách hàng, ưu tiên lớp chi tiết 4 chữ số; có thể tích nhiều lớp nếu khách có nhiều hoạt động." />
              <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm ISIC theo mã, tên tiếng Việt hoặc tiếng Anh..." value={isicSearch} onChange={(event) => setIsicSearch(event.target.value)} style={{ maxWidth: 520, margin: "12px 0" }} />
              <Table size="small" rowKey="id" loading={isic.isLoading} dataSource={filteredIsic} pagination={{ pageSize: 20, showSizeChanger: true }} columns={[
                { title: "Mã ISIC", dataIndex: "code", width: 110, render: (value, row: IndustryCode) => <><b>{value}</b><div><Tag>{row.level === 1 ? "Phần" : row.level === 2 ? "Ngành" : row.level === 3 ? "Nhóm" : "Lớp"}</Tag></div></> },
                { title: "Hoạt động kinh tế", render: (_, row: IndustryCode) => <><div>{codeTitle(row)}</div>{row.title_vi ? <Text type="secondary">Tên chính thức EN: {row.title_en}</Text> : <Text type="secondary">Tên chính thức theo UNSD (EN)</Text>}</> },
                { title: "Mã cha", dataIndex: "parent_code", width: 110, render: (value) => value || "—" },
                { title: "Phiên bản", dataIndex: "revision", width: 130 },
              ]} />
            </>,
          },
          {
            key: "nace",
            label: `Danh mục NACE (${summary.data?.counts.nace_total ?? 0})`,
            children: <>
              <Alert showIcon type="info" message="NACE là lớp trung gian để xác định IAF" description="Bản dịch tiếng Việt dùng trong CMP được hiển thị chính, đồng thời giữ tên tiếng Anh nguồn của Eurostat để đối chiếu. Người dùng không cần nhớ NACE khi tiếp nhận khách. CMP tự quy đổi từ ISIC; khi một ISIC tương ứng nhiều NACE, thẩm xét viên xác nhận NACE đúng với hoạt động thực tế." />
              <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm NACE theo mã, tên tiếng Việt hoặc tiếng Anh..." value={naceSearch} onChange={(event) => setNaceSearch(event.target.value)} style={{ maxWidth: 520, margin: "12px 0" }} />
              <Table size="small" rowKey="id" loading={nace.isLoading} dataSource={filteredNace} pagination={{ pageSize: 20, showSizeChanger: true }} columns={[
                { title: "Mã NACE", dataIndex: "code", width: 110, render: (value, row: IndustryCode) => <><b>{value}</b><div><Tag>{row.level === 1 ? "Phần" : row.level === 2 ? "Ngành" : row.level === 3 ? "Nhóm" : "Lớp"}</Tag></div></> },
                { title: "Hoạt động kinh tế", render: (_, row: IndustryCode) => <><div>{codeTitle(row)}</div>{row.title_vi ? <Text type="secondary">Tên chính thức EN: {row.title_en}</Text> : <Text type="secondary">Nguồn danh mục: Eurostat NACE Rev.2</Text>}</> },
                { title: "Mã cha", dataIndex: "parent_code", width: 110, render: (value) => value || "—" },
              ]} />
            </>,
          },
          {
            key: "iaf",
            label: `Lĩnh vực IAF (${summary.data?.counts.iaf_total ?? 0})`,
            children: <>
              <Alert showIcon type="info" message="IAF là nhóm lĩnh vực chứng nhận" description="IAF dùng cho phạm vi công nhận, năng lực tổ chức chứng nhận và năng lực chuyên gia. Người dùng thường không nhập IAF thủ công; hệ thống đề xuất IAF từ NACE theo từng hệ thống quản lý." />
              <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm IAF theo số hoặc tên lĩnh vực..." value={iafSearch} onChange={(event) => setIafSearch(event.target.value)} style={{ maxWidth: 520, margin: "12px 0" }} />
              <Table size="small" rowKey="id" loading={iaf.isLoading} dataSource={filteredIaf} pagination={{ pageSize: 15 }} columns={[
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
              <Alert showIcon type="info" message="Bảng quy đổi chính thức ISIC Rev.4 → NACE Rev.2" description="Một ISIC có thể tương ứng một hoặc nhiều NACE. Vì vậy hệ thống giữ toàn bộ ứng viên và yêu cầu thẩm xét viên xác nhận khi quan hệ không phải 1–1." />
              <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm theo ISIC, NACE hoặc tên hoạt động..." value={mappingSearch} onChange={(event) => setMappingSearch(event.target.value)} style={{ maxWidth: 520, margin: "12px 0" }} />
              <Table size="small" rowKey="id" loading={isicNaceMappings.isLoading} dataSource={filteredIsicNace} pagination={{ pageSize: 20, showSizeChanger: true }} columns={[
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
              <Alert showIcon type="info" message="NACE → IAF được hiển thị theo toàn bộ cây NACE" description="CMP lưu mapping chuẩn ở lớp NACE chi tiết và tự tổng hợp lên Nhóm/Ngành/Phần. Vì vậy tra 26.5 sẽ thấy IAF 19 dù mapping vật lý nằm ở 26.51 và 26.52. Nếu một mã cha bao phủ nhiều IAF, hệ thống hiển thị đủ các IAF thay vì đoán một mã." />
              <Space wrap style={{ margin: "12px 0" }}>
                <Select value={naceIafSystem} onChange={setNaceIafSystem} options={Object.entries(managementSystemLabels).map(([value, label]) => ({ value, label }))} style={{ minWidth: 210 }} />
                <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm NACE hoặc IAF..." value={naceIafSearch} onChange={(event) => setNaceIafSearch(event.target.value)} style={{ width: 360 }} />
              </Space>
              <Table size="small" rowKey="id" loading={naceIafMappings.isLoading || nace.isLoading} dataSource={filteredNaceIaf} pagination={{ pageSize: 20, showSizeChanger: true }} columns={[
                { title: "NACE Rev.2", render: (_, row: NaceIafDisplayRow) => <><b>{row.nace_code.code}</b><div><Text type="secondary">{codeTitle(row.nace_code)}</Text></div></> },
                { title: "Cấp", width: 90, render: (_, row: NaceIafDisplayRow) => <Tag>{row.nace_code.level === 1 ? "Phần" : row.nace_code.level === 2 ? "Ngành" : row.nace_code.level === 3 ? "Nhóm" : "Lớp"}</Tag> },
                { title: "IAF", render: (_, row: NaceIafDisplayRow) => row.iaf_scope ? <><Tag color="blue">IAF {row.iaf_scope.iaf_code}</Tag><div>{row.iaf_scope.iaf_name}</div></> : row.outside_iaf_table ? <Tag color="orange">Ngoài bảng IAF</Tag> : <Tag color="red">Thiếu mapping</Tag> },
                { title: "Cách xác định", width: 190, render: (_, row: NaceIafDisplayRow) => row.derived ? <Text>Tổng hợp từ {row.derived_from_count} lớp chi tiết</Text> : <Text>Ánh xạ trực tiếp</Text> },
                { title: "Nguồn", dataIndex: "source_document", width: 250, render: (value, row: NaceIafDisplayRow) => value || (row.derived ? "Kế thừa từ các lớp NACE con" : "—") },
              ]} />
            </>,
          },
          {
            key: "sources",
            label: "Nguồn & phiên bản",
            children: <>
              <Title level={5}>Nguồn tham chiếu đang dùng</Title>
              <Paragraph type="secondary">Các nguồn dưới đây được lưu như baseline nghiệp vụ của chuỗi phân loại chứng nhận. Việc cập nhật lên phiên bản phân loại mới phải đi kèm bảng correspondence và rule IAF phù hợp, không thay tự động.</Paragraph>
              <Table size="small" rowKey="key" pagination={false} dataSource={summary.data?.sources ?? []} columns={[
                { title: "Bộ dữ liệu / tài liệu", dataIndex: "label", width: 220 },
                { title: "Cơ quan", dataIndex: "owner", width: 280 },
                { title: "Dùng để làm gì", dataIndex: "purpose" },
                { title: "Nguồn", dataIndex: "url", width: 110, render: (value) => value ? <Typography.Link href={value} target="_blank" rel="noreferrer">Mở nguồn</Typography.Link> : "—" },
              ]} />
            </>,
          },
        ]}
      />
    </div>
  );
}
