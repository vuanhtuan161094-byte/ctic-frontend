"use client";

import { FolderOpenOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import type { TableColumnsType } from "antd";
import { Button, Select, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";

import { api, getErrorMessage } from "../../lib/api";
import {
  DataTable,
  DomainStatusBadge,
  EmptyState,
  ErrorState,
  FilterPopover,
  ForbiddenState,
  LoadingSkeleton,
  PageHeader,
  SearchToolbar,
} from "../design-system";
import "./certification-case.css";
import { caseCustomer, caseScope, normalizeCaseValue } from "./case-model";
import type { CertificationCaseRecord } from "./types";

interface RegistryFilters {
  query: string;
  status: string;
  standard: string;
}

function filtersFromLocation(): RegistryFilters {
  if (typeof window === "undefined") return { query: "", status: "all", standard: "all" };
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get("q") ?? "",
    status: params.get("status") ?? "all",
    standard: params.get("standard") ?? "all",
  };
}

function replaceRegistryQuery(filters: RegistryFilters) {
  const params = new URLSearchParams(window.location.search);
  const update = (key: string, value: string) => value && value !== "all" ? params.set(key, value) : params.delete(key);
  update("q", filters.query.trim());
  update("status", filters.status);
  update("standard", filters.standard);
  const next = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`;
  window.history.replaceState(window.history.state, "", next);
}

export interface CertificationCaseRegistryViewProps {
  records: CertificationCaseRecord[];
  loading?: boolean;
  error?: unknown;
  refreshing?: boolean;
  onRefresh: () => void;
  onOpenCase: (caseId: string) => void;
}

export function CertificationCaseRegistryView({ records, loading = false, error, refreshing = false, onRefresh, onOpenCase }: CertificationCaseRegistryViewProps) {
  const initialFilters = useMemo(() => filtersFromLocation(), []);
  const [query, setQuery] = useState(initialFilters.query);
  const [status, setStatus] = useState(initialFilters.status);
  const [standard, setStandard] = useState(initialFilters.standard);

  useEffect(() => {
    const handlePopState = () => {
      const next = filtersFromLocation();
      setQuery(next.query);
      setStatus(next.status);
      setStandard(next.standard);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    replaceRegistryQuery({ query, status, standard });
  }, [query, standard, status]);

  const standardOptions = useMemo(() => Array.from(new Set(records.map((record) => record.standard_name).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, "vi"))
    .map((value) => ({ value, label: value })), [records]);
  const statusOptions = useMemo(() => Array.from(new Set(records.map((record) => record.status).filter(Boolean)))
    .sort()
    .map((value) => ({ value, label: value.replaceAll("_", " ") })), [records]);

  const filteredRecords = useMemo(() => {
    const keyword = normalizeCaseValue(query);
    return records.filter((record) => {
      const customer = caseCustomer(record);
      const searchable = normalizeCaseValue([
        record.project_code,
        customer?.customer_code,
        customer?.company_name,
        record.standard_name,
        caseScope(record),
      ].filter(Boolean).join(" "));
      return (!keyword || searchable.includes(keyword))
        && (status === "all" || record.status === status)
        && (standard === "all" || record.standard_name === standard);
    });
  }, [query, records, standard, status]);

  const columns: TableColumnsType<CertificationCaseRecord> = [
    {
      title: "Mã hồ sơ",
      dataIndex: "project_code",
      key: "project_code",
      width: 108,
      ellipsis: true,
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: "Khách hàng",
      key: "customer",
      width: 178,
      ellipsis: true,
      render: (_, record) => {
        const customer = caseCustomer(record);
        return <div className="cmp-case-table-identity"><strong>{customer?.company_name ?? "Chưa xác định"}</strong><span>{customer?.customer_code ?? "Chưa có mã khách hàng"}</span></div>;
      },
    },
    { title: "Tiêu chuẩn / phiên bản", dataIndex: "standard_name", key: "standard_name", width: 164, ellipsis: true },
    {
      title: "Chu kỳ & bước hiện tại",
      key: "cycle",
      width: 144,
      render: () => <span className="cmp-case-table-secondary">Xem dữ liệu theo chu kỳ trong hồ sơ</span>,
    },
    {
      title: "Trách nhiệm / thời hạn",
      key: "responsibility",
      width: 148,
      render: () => <span className="cmp-case-table-secondary">Xác nhận theo bước trong hồ sơ</span>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (value: string) => <DomainStatusBadge domain="case" code={normalizeCaseValue(value)} />,
    },
    {
      title: <span className="cmp-visually-hidden">Thao tác</span>,
      key: "action",
      width: 48,
      align: "right",
      render: (_, record) => <Button aria-label={`Xem hồ sơ chứng nhận ${record.project_code}`} icon={<FolderOpenOutlined />} onClick={() => onOpenCase(record.id)} type="text" />,
    },
  ];

  const responsiveCards = filteredRecords.map((record) => {
    const customer = caseCustomer(record);
    return {
      key: record.id,
      title: record.project_code,
      status: <DomainStatusBadge domain="case" code={normalizeCaseValue(record.status)} />,
      fields: [
        { key: "customer", label: "Khách hàng", value: customer?.company_name ?? "Chưa xác định" },
        { key: "standard", label: "Tiêu chuẩn", value: record.standard_name },
        { key: "cycle", label: "Chu kỳ / bước", value: "Xem trong hồ sơ" },
        { key: "attention", label: "Trách nhiệm / hạn", value: "Xác nhận trong hồ sơ" },
      ],
      actions: <Button block type="primary" onClick={() => onOpenCase(record.id)}>Xem hồ sơ chứng nhận</Button>,
    };
  });

  const appliedFilters = Number(status !== "all") + Number(standard !== "all");
  const hasSearchOrFilters = Boolean(query.trim()) || appliedFilters > 0;
  const filterControl = (
    <FilterPopover appliedCount={appliedFilters} onReset={() => { setStatus("all"); setStandard("all"); }}>
      <label className="cmp-case-filter-field"><span>Trạng thái hồ sơ</span><Select value={status} onChange={setStatus} options={[{ value: "all", label: "Tất cả" }, ...statusOptions]} /></label>
      <label className="cmp-case-filter-field"><span>Tiêu chuẩn / phiên bản</span><Select value={standard} onChange={setStandard} options={[{ value: "all", label: "Tất cả" }, ...standardOptions]} /></label>
    </FilterPopover>
  );
  const emptyState = records.length === 0 ? (
    <EmptyState title="Chưa có hồ sơ chứng nhận" description="Hồ sơ chứng nhận sẽ xuất hiện sau khi đơn đăng ký và quy trình liên quan tạo hồ sơ." />
  ) : (
    <EmptyState title="Không tìm thấy hồ sơ phù hợp" description="Thử thay đổi từ khóa hoặc bộ lọc đang áp dụng." />
  );

  return (
    <main className="cmp-case-page cmp-case-registry">
      <PageHeader
        identity="NGHIỆP VỤ CHỨNG NHẬN"
        title="Hồ sơ chứng nhận"
        description="Theo dõi hồ sơ, chu kỳ xử lý và các điểm cần chú ý trong toàn bộ hành trình chứng nhận."
      />

      <section className="cmp-case-registry-surface" aria-label="Sổ hồ sơ chứng nhận">
        <SearchToolbar
          query={query}
          onQueryChange={setQuery}
          queryParam="q"
          placeholder="Tìm mã hồ sơ, khách hàng hoặc tiêu chuẩn"
          filterControl={filterControl}
          actions={(
            <div className="cmp-case-toolbar-actions">
              <Typography.Text className="cmp-case-result-count">{filteredRecords.length} / {records.length} hồ sơ</Typography.Text>
              <Button aria-label="Làm mới danh sách hồ sơ" icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh}>Làm mới</Button>
            </div>
          )}
        />

        {loading ? <LoadingSkeleton variant="list" rows={7} /> : error ? (
          <ErrorState description={getErrorMessage(error)} retry={{ label: "Thử lại", onAction: onRefresh }} />
        ) : filteredRecords.length === 0 ? (
          <div data-empty-kind={hasSearchOrFilters && records.length > 0 ? "filtered" : "registry"}>{emptyState}</div>
        ) : (
          <DataTable
            aria-label="Danh sách hồ sơ chứng nhận"
            columns={columns}
            dataSource={filteredRecords}
            rowKey="id"
            scroll={{ x: 900 }}
            tableLayout="fixed"
            pagination={{ pageSize: 12, showSizeChanger: true }}
            responsiveCards={responsiveCards}
            onRow={(record) => ({ onDoubleClick: () => onOpenCase(record.id) })}
          />
        )}
      </section>

      <p className="cmp-case-projection-note">Chu kỳ, bước, trách nhiệm và thời hạn được xác nhận khi mở từng hồ sơ.</p>
    </main>
  );
}

export interface CertificationCaseRegistryPageProps {
  authorized: boolean;
  accessPending?: boolean;
  onExit: () => void;
  onOpenCase: (caseId: string) => void;
}

export function CertificationCaseRegistryPage({ authorized, accessPending = false, onExit, onOpenCase }: CertificationCaseRegistryPageProps) {
  const casesQuery = useQuery({
    queryKey: ["certification-projects", "case-registry-v2"],
    queryFn: async () => (await api.get<CertificationCaseRecord[]>("/certification-projects")).data,
    enabled: authorized,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (accessPending) return <LoadingSkeleton variant="page" rows={8} />;
  if (!authorized || (isAxiosError(casesQuery.error) && casesQuery.error.response?.status === 403)) {
    return <ForbiddenState exit={{ label: "Về tổng quan", onAction: onExit }} />;
  }

  return (
    <CertificationCaseRegistryView
      records={casesQuery.data ?? []}
      loading={casesQuery.isLoading}
      error={casesQuery.isError ? casesQuery.error : undefined}
      refreshing={casesQuery.isFetching}
      onRefresh={() => void casesQuery.refetch()}
      onOpenCase={onOpenCase}
    />
  );
}
