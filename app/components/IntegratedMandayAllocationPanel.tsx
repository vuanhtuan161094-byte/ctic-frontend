"use client";

import {
  CheckCircleOutlined,
  EditOutlined,
  ReloadOutlined,
  RobotOutlined,
  SaveOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  InputNumber,
  Space,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState, type SetStateAction } from "react";

import { api, getErrorMessage } from "../lib/api";

const { Text } = Typography;
const EMPTY_NUMBER_MAP: Record<string, number> = {};

interface AllocationProgram {
  program_key: string;
  program_code: string;
  management_system: string;
  pre_ims_mandays: number;
  required_units: number;
  required_mandays: number;
  allocated_units: number;
  allocated_mandays: number;
  difference_units: number;
}

interface AllocationMember {
  member_id: string;
  expert_id: string;
  expert_name: string;
  team_role: string;
  counts_toward_mandays: boolean;
  must_receive_mandays: boolean;
  max_stage2_units: number;
  max_stage2_mandays: number;
  competent_program_keys: string[];
  program_allocations: Record<string, number>;
  total_stage2_units: number;
  total_stage2_mandays: number;
}

interface AllocationResponse {
  appointment_id: string;
  appointment_status: string;
  allocation_applicable: boolean;
  is_stage1: boolean;
  calculation_version: string;
  stage1_mandays: number;
  stage2_mandays: number;
  allocation_target_stage2_mandays: number;
  allocated_stage2_mandays: number;
  difference_mandays: number;
  plan_difference_mandays: number;
  balanced: boolean;
  programs: AllocationProgram[];
  members: AllocationMember[];
  latest_version?: {
    version_no?: number;
    allocation_mode?: string;
    change_reason?: string | null;
    created_at?: string;
  } | null;
  history?: Array<{
    id: string;
    version_no: number;
    allocation_mode: string;
    change_reason?: string | null;
    created_at: string;
    created_by_user?: {
      full_name?: string | null;
      username?: string | null;
    } | null;
  }>;
  stage1_note?: string | null;
}

interface IntegratedMandayAllocationPanelProps {
  appointmentId: string;
  onChanged?: () => Promise<unknown> | void;
}

const roleLabels: Record<string, string> = {
  TEAM_LEADER: "Trưởng đoàn",
  AUDITOR: "Đánh giá viên",
  TECHNICAL_EXPERT: "Chuyên gia kỹ thuật",
  TRAINEE: "Tập sự",
  OBSERVER: "Quan sát viên",
  WITNESS_EVALUATOR: "Đánh giá viên chứng kiến",
};

function formatMandays(value: number) {
  return Number(value || 0).toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function cellKey(memberId: string, programKey: string) {
  return `${memberId}::${programKey}`;
}

interface AllocationDraft {
  source: AllocationResponse;
  manualValues: Record<string, number>;
  weights: Record<string, number>;
}

function createAllocationDraft(data: AllocationResponse): AllocationDraft {
  return {
    source: data,
    weights: Object.fromEntries(
      data.programs.map((program) => [program.program_key, program.pre_ims_mandays ?? 0]),
    ),
    manualValues: Object.fromEntries(
      data.members.flatMap((member) =>
        data.programs.map((program) => [
          cellKey(member.member_id, program.program_key),
          member.program_allocations[program.program_key] ?? 0,
        ] as const),
      ),
    ),
  };
}

function resolveStateAction<T>(next: SetStateAction<T>, current: T): T {
  return typeof next === "function"
    ? (next as (value: T) => T)(current)
    : next;
}

export function IntegratedMandayAllocationPanel({
  appointmentId,
  onChanged,
}: IntegratedMandayAllocationPanelProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [manualMode, setManualMode] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [allocationDraft, setAllocationDraft] = useState<AllocationDraft | null>(null);

  const allocationQuery = useQuery({
    queryKey: ["audit-team-manday-allocation", appointmentId],
    queryFn: async () => (
      await api.get<AllocationResponse>(
        `/audit-team-appointments/${appointmentId}/manday-allocation`,
      )
    ).data,
    enabled: Boolean(appointmentId),
  });

  const data = allocationQuery.data;
  const initialDraft = useMemo(() => data ? createAllocationDraft(data) : null, [data]);
  const activeDraft = allocationDraft?.source === data ? allocationDraft : initialDraft;
  const manualValues = activeDraft?.manualValues ?? EMPTY_NUMBER_MAP;
  const weights = activeDraft?.weights ?? EMPTY_NUMBER_MAP;
  const setManualValues = (next: SetStateAction<Record<string, number>>) => {
    if (!data) return;
    setAllocationDraft((current) => {
      const base = current?.source === data ? current : createAllocationDraft(data);
      return {
        ...base,
        manualValues: resolveStateAction(next, base.manualValues),
      };
    });
  };
  const setWeights = (next: SetStateAction<Record<string, number>>) => {
    if (!data) return;
    setAllocationDraft((current) => {
      const base = current?.source === data ? current : createAllocationDraft(data);
      return {
        ...base,
        weights: resolveStateAction(next, base.weights),
      };
    });
  };

  const invalidate = async () => {
    await allocationQuery.refetch();
    await queryClient.invalidateQueries({ queryKey: ["audit-team-appointments"] });
    await onChanged?.();
  };

  const autoMutation = useMutation({
    mutationFn: async () => (
      await api.post<AllocationResponse>(
        `/audit-team-appointments/${appointmentId}/manday-allocation/auto`,
        {
          program_weights: (data?.programs ?? []).map((program) => ({
            program_key: program.program_key,
            pre_ims_mandays: Number(weights[program.program_key] ?? 0),
          })),
        },
      )
    ).data,
    onSuccess: async () => {
      setManualMode(false);
      setChangeReason("");
      await invalidate();
      message.success("Đã tự động phân bổ man-day theo chương trình");
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const manualMutation = useMutation({
    mutationFn: async () => {
      if (!changeReason.trim()) {
        throw new Error("Phải nhập lý do điều chỉnh thủ công");
      }
      return (
        await api.patch<AllocationResponse>(
          `/audit-team-appointments/${appointmentId}/manday-allocation/manual`,
          {
            change_reason: changeReason.trim(),
            allocations: (data?.members ?? []).flatMap((member) =>
              (data?.programs ?? []).map((program) => ({
                member_id: member.member_id,
                program_key: program.program_key,
                mandays: Number(manualValues[cellKey(member.member_id, program.program_key)] ?? 0),
              })),
            ),
          },
        )
      ).data;
    },
    onSuccess: async () => {
      setManualMode(false);
      setChangeReason("");
      await invalidate();
      message.success("Đã lưu điều chỉnh man-day và audit log");
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const restoreMutation = useMutation({
    mutationFn: async () => (
      await api.post<AllocationResponse>(
        `/audit-team-appointments/${appointmentId}/manday-allocation/restore-auto`,
      )
    ).data,
    onSuccess: async () => {
      setManualMode(false);
      setChangeReason("");
      await invalidate();
      message.success("Đã khôi phục đề xuất tự động gần nhất");
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const manualProgramTotals = useMemo(() => {
    if (!data) return new Map<string, number>();
    return new Map(
      data.programs.map((program) => [
        program.program_key,
        data.members.reduce(
          (sum, member) => sum + Number(manualValues[cellKey(member.member_id, program.program_key)] ?? 0),
          0,
        ),
      ]),
    );
  }, [data, manualValues]);

  const manualGrandTotal = useMemo(
    () => [...manualProgramTotals.values()].reduce((sum, value) => sum + value, 0),
    [manualProgramTotals],
  );

  if (allocationQuery.isLoading) {
    return <Card loading size="small" title="Phân bổ man-day theo chương trình" />;
  }

  if (allocationQuery.isError) {
    return (
      <Alert
        action={<Button icon={<ReloadOutlined />} onClick={() => allocationQuery.refetch()}>Thử lại</Button>}
        message="Không tải được ma trận man-day"
        description={getErrorMessage(allocationQuery.error)}
        showIcon
        type="error"
      />
    );
  }

  if (!data) return null;

  if (!data.allocation_applicable) {
    return (
      <Alert
        message={data.is_stage1 ? "Quy tắc man-day Giai đoạn 1" : "Không áp dụng ma trận man-day"}
        description={data.stage1_note ?? "Ma trận này chỉ dùng tại từng cuộc đánh giá, không dùng ở chỉ định đoàn cấp hồ sơ."}
        showIcon
        type="info"
      />
    );
  }

  const editable = data.appointment_status === "draft";

  return (
    <Card
      className="integrated-manday-allocation-card"
      size="small"
      title="Ma trận man-day: Thành viên + Chương trình"
      extra={(
        <Tag color={data.balanced ? "success" : "warning"} icon={data.balanced ? <CheckCircleOutlined /> : undefined}>
          {data.balanced ? "Đã cân bằng" : "Chưa cân bằng"}
        </Tag>
      )}
    >
      <Alert
        message="Vai trò không tính man-day"
        description="Chuyên gia kỹ thuật, quan sát viên, chuyên gia tập sự và các vai trò hỗ trợ luôn bằng 0 MD. Mọi man-day được tính chỉ nằm ở Trưởng đoàn/Đánh giá viên + Chương trình."
        showIcon
        type="info"
      />

      <div className="integrated-manday-weights">
        <Text strong>Trọng số MD trước giảm IMS</Text>
        <Text type="secondary">Có thể để toàn bộ bằng 0 để chia đều. Trọng số chỉ xác định tỷ lệ MD giữa các chương trình; tổng ma trận luôn bằng tổng MD đã bố trí cho các thành viên.</Text>
        <Space wrap>
          {data.programs.map((program) => (
            <label className="integrated-manday-weight" key={program.program_key}>
              <span>{program.program_code}</span>
              <InputNumber
                disabled={!editable}
                min={0}
                precision={1}
                step={0.5}
                value={weights[program.program_key] ?? 0}
                onChange={(value) => setWeights((current) => ({
                  ...current,
                  [program.program_key]: Number(value ?? 0),
                }))}
              />
            </label>
          ))}
        </Space>
      </div>

      <div className="integrated-manday-table-wrap">
        <table className="integrated-manday-table">
          <thead>
            <tr>
              <th>Thành viên</th>
              <th>Vai trò</th>
              {data.programs.map((program) => <th key={program.program_key}>{program.program_code}</th>)}
              <th>Tổng GĐ2</th>
              <th>GĐ1</th>
              <th>Tổng</th>
            </tr>
          </thead>
          <tbody>
            {data.members.map((member) => {
              const rowTotal = manualMode
                ? data.programs.reduce(
                  (sum, program) => sum + Number(manualValues[cellKey(member.member_id, program.program_key)] ?? 0),
                  0,
                )
                : member.total_stage2_mandays;
              const stage1 = member.team_role === "TEAM_LEADER" ? data.stage1_mandays : 0;
              return (
                <tr key={member.member_id}>
                  <td>
                    <strong>{member.expert_name}</strong>
                    <div><Text type="secondary">MD đã bố trí: {formatMandays(member.max_stage2_mandays)} MD</Text></div>
                  </td>
                  <td><Tag>{roleLabels[member.team_role] ?? member.team_role}</Tag></td>
                  {data.programs.map((program) => {
                    const competent = member.counts_toward_mandays
                      && member.competent_program_keys.includes(program.program_key);
                    if (!competent) {
                      return <td className="integrated-manday-disabled-cell" key={program.program_key}>—</td>;
                    }
                    const key = cellKey(member.member_id, program.program_key);
                    return (
                      <td key={program.program_key}>
                        {manualMode ? (
                          <InputNumber
                            min={0}
                            max={member.max_stage2_mandays}
                            precision={1}
                            step={0.5}
                            value={manualValues[key] ?? 0}
                            onChange={(value) => setManualValues((current) => ({
                              ...current,
                              [key]: Number(value ?? 0),
                            }))}
                          />
                        ) : formatMandays(member.program_allocations[program.program_key] ?? 0)}
                      </td>
                    );
                  })}
                  <td><strong>{formatMandays(rowTotal)}</strong></td>
                  <td>{formatMandays(stage1)}</td>
                  <td><strong>{formatMandays(rowTotal + stage1)}</strong></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={2}>Tổng</th>
              {data.programs.map((program) => {
                const actual = manualMode
                  ? manualProgramTotals.get(program.program_key) ?? 0
                  : program.allocated_mandays;
                return (
                  <th key={program.program_key}>
                    {formatMandays(actual)} / {formatMandays(program.required_mandays)}
                  </th>
                );
              })}
              <th>{formatMandays(manualMode ? manualGrandTotal : data.allocated_stage2_mandays)} / {formatMandays(data.allocation_target_stage2_mandays)}</th>
              <th>{formatMandays(data.stage1_mandays)}</th>
              <th>{formatMandays((manualMode ? manualGrandTotal : data.allocated_stage2_mandays) + data.stage1_mandays)}</th>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="integrated-manday-checks">
        <Space wrap>
          <Tag color="blue">Kế hoạch tối thiểu: {formatMandays(data.stage2_mandays)} MD</Tag>
          <Tag color={data.allocation_target_stage2_mandays + 0.001 >= data.stage2_mandays ? "success" : "error"}>
            MD bố trí: {formatMandays(data.allocation_target_stage2_mandays)} MD
          </Tag>
          <Tag>Ma trận đã phân: {formatMandays(manualMode ? manualGrandTotal : data.allocated_stage2_mandays)} MD</Tag>
          <Tag color={Math.abs((manualMode ? manualGrandTotal : data.allocated_stage2_mandays) - data.allocation_target_stage2_mandays) < 0.001 ? "success" : "warning"}>
            Chênh lệch ma trận: {formatMandays((manualMode ? manualGrandTotal : data.allocated_stage2_mandays) - data.allocation_target_stage2_mandays)} MD
          </Tag>
          {data.plan_difference_mandays > 0.001 ? (
            <Tag color="gold">Vượt kế hoạch: +{formatMandays(data.plan_difference_mandays)} MD · hợp lệ</Tag>
          ) : null}
        </Space>
      </div>

      {manualMode ? (
        <Input.TextArea
          maxLength={1000}
          placeholder="Bắt buộc nhập lý do điều chỉnh thủ công"
          rows={2}
          showCount
          value={changeReason}
          onChange={(event) => setChangeReason(event.target.value)}
        />
      ) : null}

      <Space className="integrated-manday-actions" wrap>
        <Button
          disabled={!editable}
          icon={<RobotOutlined />}
          loading={autoMutation.isPending}
          onClick={() => autoMutation.mutate()}
          type="primary"
        >
          {data.latest_version ? "Phân bổ lại" : "Tự động phân bổ"}
        </Button>
        {!manualMode ? (
          <Button
            disabled={!editable || !data.latest_version}
            icon={<EditOutlined />}
            onClick={() => setManualMode(true)}
          >
            Chỉnh sửa thủ công
          </Button>
        ) : (
          <>
            <Button
              icon={<SaveOutlined />}
              loading={manualMutation.isPending}
              onClick={() => manualMutation.mutate()}
              type="primary"
            >
              Lưu điều chỉnh
            </Button>
            <Button onClick={() => setManualMode(false)}>Hủy chỉnh sửa</Button>
          </>
        )}
        <Button
          disabled={!editable || !(data.history ?? []).some((item) => item.allocation_mode === "AUTO")}
          icon={<UndoOutlined />}
          loading={restoreMutation.isPending}
          onClick={() => restoreMutation.mutate()}
        >
          Khôi phục đề xuất
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => allocationQuery.refetch()}>Làm mới</Button>
      </Space>

      {data.latest_version ? (
        <Text type="secondary">
          Phiên bản {data.latest_version.version_no ?? "—"} · {data.latest_version.allocation_mode === "AUTO" ? "Tự động" : "Điều chỉnh thủ công"}
          {data.latest_version.change_reason ? ` · ${data.latest_version.change_reason}` : ""}
        </Text>
      ) : null}
    </Card>
  );
}
