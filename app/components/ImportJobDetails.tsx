import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Descriptions, Modal, Select, Space, Table, Typography } from "antd";
import { api, getErrorMessage } from "../lib/api";

export type ImportRow = { row_number: number; raw_data: string; normalized_data: string | null; validation_status: string; errors: string | null; warnings: string | null };
export const rowMessages = (value: string | null): string[] => value ? JSON.parse(value) as string[] : [];
export function filterImportRows(rows: ImportRow[], filter: string) {
  return rows.filter((row) => filter === "ALL" || (filter === "WARNINGS" ? rowMessages(row.warnings).length > 0 : row.validation_status === filter));
}
export function importErrorCsv(rows: ImportRow[]) {
  const cell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
  return "\uFEFF" + [["row", "status", "values", "errors", "warnings"], ...rows.filter((row) => row.validation_status !== "VALID" || rowMessages(row.warnings).length).map((row) => [String(row.row_number), row.validation_status, row.raw_data, rowMessages(row.errors).join("; "), rowMessages(row.warnings).join("; ")])].map((row) => row.map(cell).join(",")).join("\r\n");
}
type Job = { id: string; entity_type: string; source_file_name: string; source_sha256: string; total_rows: number; valid_rows: number; invalid_rows: number; duplicate_rows: number; warning_rows: number; publication_state: string; can_commit: boolean; can_publish: boolean; rows: ImportRow[] };
const labels: Record<string, string> = { VALIDATED: "Đã kiểm tra", STORED: "Đã lưu dữ liệu", READY_FOR_PUBLICATION: "Đã lưu mapping nháp · Sẵn sàng công bố", DRAFTS_NEED_REVIEW: "Mapping nháp cần xem xét lại", OPERATIONAL: "Đã công bố · Đang vận hành", PUBLISHED_NOT_CURRENT: "Đã phê duyệt · Không đang hiệu lực" };
export function ImportJobDetails({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [filter, setFilter] = useState("ALL");
  const client = useQueryClient();
  const job = useQuery({ queryKey: ["import-job-detail", id], enabled: Boolean(id), queryFn: async () => (await api.get<Job>(`/master-data-configuration/imports/${id}`)).data });
  const action = useMutation({ mutationFn: (name: string) => api.post(`/master-data-configuration/imports/${id}/${name}`), onSuccess: async () => { await client.invalidateQueries(); } });
  const data = job.data;
  const download = () => {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([importErrorCsv(data.rows)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `import-${id}-errors.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <Modal open={Boolean(id)} onCancel={onClose} width={1100} footer={null} title="Chi tiết kiểm tra và công bố dữ liệu">
    {job.isError ? <Alert type="error" message={getErrorMessage(job.error)} action={<Button onClick={() => void job.refetch()}>Thử lại</Button>} /> : null}
    {action.isError ? <Alert type="error" message={getErrorMessage(action.error)} description="Thao tác không thành công; tải lại chi tiết để xem trạng thái hiện tại." action={<Button onClick={() => void job.refetch()}>Tải lại trạng thái</Button>} /> : null}
    {data ? <>
      <Descriptions column={1} items={[{ key: "file", label: "Tệp nguồn", children: data.source_file_name }, { key: "hash", label: "SHA-256", children: <Typography.Text copyable>{data.source_sha256}</Typography.Text> }, { key: "status", label: "Trạng thái", children: labels[data.publication_state] ?? data.publication_state }, { key: "counts", label: "Kết quả", children: `${data.total_rows} dòng · ${data.valid_rows} hợp lệ · ${data.invalid_rows} lỗi · ${data.duplicate_rows} trùng · ${data.warning_rows} cảnh báo` }]} />
      <Space wrap style={{ margin: "12px 0" }}>
        <Select value={filter} onChange={setFilter} options={[{ value: "ALL", label: "Tất cả" }, { value: "INVALID", label: "Lỗi" }, { value: "DUPLICATE", label: "Trùng" }, { value: "WARNINGS", label: "Cảnh báo" }, { value: "VALID", label: "Hợp lệ" }]} style={{ width: 160 }} />
        <Button onClick={download}>Tải báo cáo lỗi CSV</Button>
        {data.can_commit ? <Button loading={action.isPending} onClick={() => action.mutate("commit")}>{data.entity_type.endsWith("_MAPPING") ? "Lưu mapping nháp" : "Lưu dữ liệu"}</Button> : null}
        {data.can_publish ? <Button type="primary" loading={action.isPending} onClick={() => Modal.confirm({ title: "Công bố toàn bộ mapping của lô?", content: "Các mapping hợp lệ sẽ được sử dụng trong phân loại ngành sau khi công bố thành công.", onOk: () => action.mutateAsync("publish") })}>Công bố lô mapping</Button> : null}
      </Space>
      <Table<ImportRow> rowKey="row_number" scroll={{ x: 900 }} dataSource={filterImportRows(data.rows, filter)} pagination={{ pageSize: 20 }} columns={[{ title: "Dòng", dataIndex: "row_number", width: 70 }, { title: "Trạng thái", dataIndex: "validation_status", width: 110 }, { title: "Dữ liệu nguồn / chuẩn hóa", render: (_, row) => <><div style={{ overflowWrap: "anywhere" }}>{row.raw_data}</div><Typography.Text type="secondary">{row.normalized_data}</Typography.Text></> }, { title: "Lỗi", render: (_, row) => rowMessages(row.errors).join("; ") }, { title: "Cảnh báo", render: (_, row) => rowMessages(row.warnings).join("; ") }]} />
    </> : <Typography.Text>Đang tải kết quả kiểm tra…</Typography.Text>}
  </Modal>;
}
