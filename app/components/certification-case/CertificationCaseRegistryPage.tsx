"use client";

import { FolderOpenOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import type { TableColumnsType } from "antd";
import { Button, Select, Space, Typography } from "antd";
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
import { caseCustomer, caseScope, formatCaseDate, normalizeCaseValue } from "./case-model";
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

export interface CertificationCaseRegistryPageProps {
  authorized: boolean;
  accessPending?: boolean;
  onExit: () => void;
  onOpenCase: (caseId: string) => void;
}

export function CertificationCaseRegistryPage({ authorized, accessPending = false, onExit, onOpenCase }: CertificationCaseRegistryPageProps) {
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

  const casesQuery = useQuery({
    queryKey: ["certification-projects", "case-registry-v2"],
    queryFn: async () => (await api.get<CertificationCaseRecord[]>("/certification-projects")).data,
    enabled: authorized,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const records = useMemo(() => casesQuery.data ?? [], [casesQuery.data]);
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

  if (accessPending) return <LoadingSkeleton variant="page" rows={8} />;
  if (!authorized || (isAxiosError(casesQuery.error) && casesQuery.error.response?.status === 403)) {
    return <ForbiddenState exit={{ label: "Về tổng quan", onAction: onExit }} />;
  }

  const columns: TableColumnsType<CertificationCaseRecord> = [
    {
      title: "Mã hồ sơ",
      dataIndex: "project_code",
      key: "project_code",
      fixed: "left",
      width: 150,
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: "Khách hàng",
      key: "customer",
      width: 230,
      render: (_, record) => {
        const customer = caseCustomer(record);
        return <div className="cmp-case-table-identity"><strong>{customer?.company_name ?? "Chưa xác định"}</strong><span>{customer?.customer_code ?? "Chưa có mã khách hàng"}</span></div>;
      },
    },
    { title: "Tiêu chuẩn / phiên bản", dataIndex: "standard_name", key: "standard_name", width: 210 },
    {
      title: "Chu kỳ & bước hiện tại",
      key: "cycle",
      width: 190,
      render: () => <Typography.Text type="secondary">Mở hồ sơ để xem dữ liệu theo chu kỳ</Typography.Text>,
    },
    {
      title: "Trách nhiệm & thời hạn",
      key: "responsibility",
      width: 190,
      render: () => <Typography.Text type="secondary">Xem thông tin theo bước trong từng hồ sơ</Typography.Text>,
    },
    {
      title: "Trạng thái hồ sơ",
      dataIndex: "status",
      key: "status",
      width: 170,
      render: (value: string) => <DomainStatusBadge domain="case" code={normalizeCaseValue(value)} />,
    },
    { title: "Cập nhật", dataIndex: "updated_at", key: "updated_at", width: 120, render: formatCaseDate },
    {
      title: "",
      key: "action",
      fixed: "right",
      width: 112,
      render: (_, record) => <Button icon={<FolderOpenOutlined />} onClick={() => onOpenCase(record.id)}>Mở hồ sơ</Button>,
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
        { key: "attention", label: "Lưu ý / thời hạn", value: "Xem trong từng hồ sơ" },
      ],
      actions: <Button block type="primary" onClick={() => onOpenCase(record.id)}>Mở hồ sơ</Button>,
    };
  });

  const appliedFilters = Number(status !== "all") + Number(standard !== "all");
  const filterControl = (
    <FilterPopover
      appliedCount={appliedFilters}
      onReset={() => { setStatus("all"); setStandard("all"); }}
    >
      <label className="cmp-case-filter-field"><span>Trạng thái hồ sơ</span><Select value={status} onChange={setStatus} options={[{ value: "all", label: "Tất cả" }, ...statusOptions]} /></label>
      <label className="cmp-case-filter-field"><span>Tiêu chuẩn / phiên bản</span><Select value={standard} onChange={setStandard} options={[{ value: "all", label: "Tất cả" }, ...standardOptions]} /></label>
    </FilterPopover>
  );

  return (
    <main className="cmp-case-page cmp-case-registry">
      <PageHeader
        identity="NGHIỆP VỤ CHỨNG NHẬN"
        title="Hồ sơ chứng nhận"
        description="Theo dõi từng hồ sơ từ thông tin nhận diện đến chu kỳ, bước xử lý và các điểm cần chú ý."
        metadata={<Typography.Text type="secondary">{filteredRecords.length} / {records.length} hồ sơ</Typography.Text>}
        secondaryActions={<Button icon={<ReloadOutlined />} loading={casesQuery.isFetching} onClick={() => void casesQuery.refetch()}>Làm mới</Button>}
      />

      <SearchToolbar
        query={query}
        onQueryChange={setQuery}
        queryParam="q"
        placeholder="Tìm theo mã hồ sơ, khách hàng, tiêu chuẩn hoặc phạm vi"
        filterControl={filterControl}
      />

      {casesQuery.isLoading ? <LoadingSkeleton variant="list" rows={7} /> : casesQuery.isError ? (
        <ErrorState description={getErrorMessage(casesQuery.error)} retry={{ label: "Thử lại", onAction: () => void casesQuery.refetch() }} />
      ) : (
        <DataTable
          aria-label="Danh sách hồ sơ chứng nhận"
          columns={columns}
          dataSource={filteredRecords}
          rowKey="id"
          scroll={{ x: 1380 }}
          pagination={{ pageSize: 12, showSizeChanger: true }}
          responsiveCards={responsiveCards}
          responsiveEmpty={<EmptyState title="Không tìm thấy hồ sơ" description="Thử thay đổi từ khóa hoặc bộ lọc đang áp dụng." />}
          locale={{ emptyText: <EmptyState title="Không tìm thấy hồ sơ" description="Thử thay đổi từ khóa hoặc bộ lọc đang áp dụng." /> }}
          onRow={(record) => ({ onDoubleClick: () => onOpenCase(record.id) })}
        />
      )}

      <div className="cmp-case-projection-note">
        <Space size={8}><Typography.Text type="secondary">Chu kỳ, bước, trách nhiệm và thời hạn được xác nhận khi mở từng hồ sơ.</Typography.Text></Space>
      </div>
    </main>
  );
}
