"use client";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FileAddOutlined,
  ReloadOutlined,
  SendOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";

const { Text } = Typography;

interface MandayCalculation {
  id: string;
  calculation_code?: string | null;
  version_no?: number | null;
  status?: string | null;
  final_mandays?: number | string | null;
  stage1_mandays?: number | string | null;
  stage2_mandays?: number | string | null;
  effective_personnel?: number | null;
  approved_at?: string | null;
  created_at?: string | null;
}

interface AuditProgramEvent {
  id: string;
  sequence_no: number;
  event_type: string;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  planned_mandays?: number | string | null;
  actual_mandays?: number | string | null;
  status?: string | null;
  form_data?: {
    planning_precision?: string;
    planned_month?: string;
    source?: string;
    [key: string]: unknown;
  } | null;
}

interface QmrApprover {
  id: string;
  full_name: string | null;
  username: string;
}

interface QmrGs1Exception {
  id?: string;
  status: "none" | "pending" | "approved" | "rejected";
  approved_at?: string | null;
  approver_id?: string;
  evidence?: {
    proposed_start_date?: string;
    approved_date: string;
    requested_by: string;
    reason: string;
    reviewer_comment?: string | null;
    reviewed_at?: string | null;
  } | null;
}

interface AuditProgram {
  id: string;
  program_code: string;
  program_year: number;
  version_no: number;
  status: string;
  effective_personnel?: number | null;
  created_at?: string | null;
  events: AuditProgramEvent[];
}

interface AuditPlanReference {
  id: string;
  audit_event_id?: string | null;
  plan_code?: string | null;
  status?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  location?: string | null;
  audit_scope?: string | null;
  audit_criteria?: string | null;
  audit_objectives?: string | null;
}

interface ProjectTeamAppointment {
  id: string;
  appointment_number?: string | null;
  status?: string | null;
  members?: Array<{
    id: string;
    team_role?: string | null;
  }>;
}

interface ApplicationScheduleSource {
  requested_audit_date?: string | null;
  requested_stage1_date?: string | null;
  requested_stage2_date?: string | null;
  certification_type?: string | null;
}

interface DraftProgramEvent {
  event_type: string;
  label: string;
  planned_month: Dayjs;
  planned_mandays: number;
}

interface AuditProgramPanelProps {
  projectId: string;
  projectCreatedAt?: string | null;
  application?: ApplicationScheduleSource | null;
  auditPlans?: AuditPlanReference[];
  roles: string[];
  onChanged?: () => void | Promise<void>;
  onOpenTeamAssignment?: (projectId: string) => void;
  onOpenAuditPlan?: (planId: string) => void;
  onOpenPlanWorkspace?: (planId: string) => void;
}

const eventDefinitions = [
  { event_type: "stage1", label: "Đánh giá giai đoạn 1" },
  { event_type: "stage2", label: "Đánh giá giai đoạn 2" },
  { event_type: "surveillance1", label: "Giám sát lần 1" },
  { event_type: "surveillance2", label: "Giám sát lần 2" },
  { event_type: "recertification", label: "Tái chứng nhận" },
] as const;

const manageRoles = new Set(["admin", "coordinator"]);

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function countsTowardMandays(teamRole?: string | null) {
  return ["team_leader", "auditor"].includes(normalize(teamRole));
}

function numberValue(value?: number | string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundToHalf(value: number) {
  return Math.round((value + Number.EPSILON) * 2) / 2;
}

function isHalfDay(value: number) {
  return Math.abs(value * 2 - Math.round(value * 2)) < 0.001;
}

function normalizeInitialSplit(calculation: MandayCalculation) {
  const initial = Math.max(0, numberValue(calculation.final_mandays));
  if (initial <= 0) {
    return { initial, stage1: 0, stage2: 0 };
  }

  const rawStage1 = numberValue(calculation.stage1_mandays);
  const rawStage2 = numberValue(calculation.stage2_mandays);
  const rawSum = rawStage1 + rawStage2;
  const rawIsValid = rawStage1 >= 0.5
    && rawStage2 >= 1
    && isHalfDay(rawStage1)
    && isHalfDay(rawStage2)
    && Math.abs(rawSum - initial) < 0.01;

  if (rawIsValid) {
    return {
      initial,
      stage1: rawStage1,
      stage2: rawStage2,
    };
  }

  if (initial < 1.5) {
    return { initial, stage1: 0, stage2: 0 };
  }

  let stage1 = Math.max(0.5, roundToHalf(initial * 0.2));
  if (initial - stage1 < 1) {
    stage1 = initial - 1;
  }
  const stage2 = roundToHalf(initial - stage1);

  return {
    initial,
    stage1,
    stage2,
  };
}

function isMonthBefore(left: Dayjs, right: Dayjs) {
  return left.startOf("month").isBefore(right.startOf("month"), "month");
}

function sortDraftEvents(events: DraftProgramEvent[]) {
  return [...events].sort((left, right) => (
    eventDefinitions.findIndex((item) => item.event_type === left.event_type)
    - eventDefinitions.findIndex((item) => item.event_type === right.event_type)
  ));
}

function eventPlannedMonth(event: AuditProgramEvent) {
  const storedMonth = event.form_data?.planned_month;
  const parsedStoredMonth = storedMonth ? dayjs(`${storedMonth}-01`) : null;
  if (parsedStoredMonth?.isValid()) return parsedStoredMonth.startOf("month");

  const parsedDate = dayjs(event.planned_start_date);
  return parsedDate.isValid() ? parsedDate.startOf("month") : null;
}

function formatPlannedMonth(event: AuditProgramEvent) {
  const month = eventPlannedMonth(event);
  return month?.isValid() ? month.format("MM/YYYY") : "Chưa thiết lập";
}

function httpStatus(error: unknown) {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

function eventLabel(value: string) {
  return eventDefinitions.find((item) => item.event_type === normalize(value))?.label
    ?? value.replaceAll("_", " ");
}

function statusTag(status?: string | null) {
  const normalized = normalize(status);
  if (["issued", "approved", "completed"].includes(normalized)) {
    return <Tag color="green">{normalized === "completed" ? "Hoàn thành" : "Đã ban hành"}</Tag>;
  }
  if (["cancelled", "withdrawn"].includes(normalized)) {
    return <Tag color="red">Đã hủy</Tag>;
  }
  return <Tag color="blue">Dự thảo</Tag>;
}

function chooseLatestCalculation(calculations: MandayCalculation[]) {
  return [...calculations].sort((left, right) => {
    const leftApproved = normalize(left.status) === "approved" ? 1 : 0;
    const rightApproved = normalize(right.status) === "approved" ? 1 : 0;
    if (leftApproved !== rightApproved) return rightApproved - leftApproved;
    const versionDifference = Number(right.version_no ?? 0) - Number(left.version_no ?? 0);
    if (versionDifference) return versionDifference;
    return dayjs(right.created_at).valueOf() - dayjs(left.created_at).valueOf();
  })[0] ?? null;
}

function buildCycleEvents(
  calculation: MandayCalculation,
  application?: ApplicationScheduleSource | null,
  projectCreatedAt?: string | null,
): DraftProgramEvent[] {
  const split = normalizeInitialSplit(calculation);
  const initialMandays = split.initial;
  const stage1Mandays = split.stage1;
  const stage2Mandays = split.stage2;
  const surveillanceMandays = Math.max(1, roundToHalf(initialMandays / 3));
  const recertificationMandays = Math.max(1, roundToHalf((initialMandays * 2) / 3));

  const fallbackMonth = dayjs(projectCreatedAt).isValid()
    ? dayjs(projectCreatedAt).add(1, "month").startOf("month")
    : dayjs().add(1, "month").startOf("month");
  const requestedStage1 = application?.requested_stage1_date
    ?? application?.requested_audit_date;
  const requestedStage1Month = dayjs(requestedStage1);
  const stage1Month = requestedStage1Month.isValid()
    ? requestedStage1Month.startOf("month")
    : fallbackMonth;
  const requestedStage2Month = dayjs(application?.requested_stage2_date);
  const stage2MonthCandidate = requestedStage2Month.isValid()
    ? requestedStage2Month.startOf("month")
    : stage1Month.add(1, "month");
  const stage2Month = isMonthBefore(stage2MonthCandidate, stage1Month)
    ? stage1Month
    : stage2MonthCandidate;

  return [
    {
      event_type: "stage1",
      label: "Đánh giá giai đoạn 1",
      planned_month: stage1Month,
      planned_mandays: stage1Mandays,
    },
    {
      event_type: "stage2",
      label: "Đánh giá giai đoạn 2",
      planned_month: stage2Month,
      planned_mandays: stage2Mandays,
    },
    {
      event_type: "surveillance1",
      label: "Giám sát lần 1",
      planned_month: stage2Month.add(12, "month"),
      planned_mandays: surveillanceMandays,
    },
    {
      event_type: "surveillance2",
      label: "Giám sát lần 2",
      planned_month: stage2Month.add(24, "month"),
      planned_mandays: surveillanceMandays,
    },
    {
      event_type: "recertification",
      label: "Tái chứng nhận",
      planned_month: stage2Month.add(36, "month"),
      planned_mandays: recertificationMandays,
    },
  ];
}

export default function AuditProgramPanel({
  projectId,
  projectCreatedAt,
  application,
  auditPlans = [],
  roles,
  onChanged,
  onOpenTeamAssignment,
  onOpenAuditPlan,
  onOpenPlanWorkspace,
}: AuditProgramPanelProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftEvents, setDraftEvents] = useState<DraftProgramEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [creatingPlanEventId, setCreatingPlanEventId] = useState<string | null>(null);
  const [planEditorEvent, setPlanEditorEvent] = useState<AuditProgramEvent | null>(null);
  const [planStartDate, setPlanStartDate] = useState<Dayjs | null>(null);
  const [planEndDate, setPlanEndDate] = useState<Dayjs | null>(null);
  const [qmrEvent, setQmrEvent] = useState<AuditProgramEvent | null>(null);
  const [qmrProposedDate, setQmrProposedDate] = useState<Dayjs | null>(null);
  const [qmrReason, setQmrReason] = useState("");
  const [qmrApproverId, setQmrApproverId] = useState<string | undefined>();
  const [qmrReviewComment, setQmrReviewComment] = useState("");
  const [qmrBusy, setQmrBusy] = useState(false);
  const canManage = roles.some((role) => manageRoles.has(normalize(role)));

  const programsQuery = useQuery({
    queryKey: ["audit-programs", "project", projectId],
    queryFn: async () => {
      const response = await api.get<AuditProgram[]>(`/audit-programs/project/${projectId}`);
      return response.data;
    },
  });

  const mandayQuery = useQuery({
    queryKey: ["manday-calculations", "project", projectId],
    queryFn: async () => {
      const response = await api.get<MandayCalculation[]>(`/manday-calculations/project/${projectId}`);
      return response.data;
    },
  });

  const teamAppointmentQuery = useQuery({
    queryKey: ["audit-team-appointment", "project", projectId],
    queryFn: async () => {
      try {
        const response = await api.get<ProjectTeamAppointment>(
          `/audit-team-appointments/project/${projectId}`,
        );
        return response.data;
      } catch (error: unknown) {
        if (Number(httpStatus(error)) === 404) return null;
        throw error;
      }
    },
    retry: false,
  });

  const syncMandayMutation = useMutation({
    mutationFn: async () => (
      await api.post<{ created: boolean; message: string }>(
        `/manday-calculations/project/${projectId}/sync-from-review`,
      )
    ).data,
    onMutate: () => {
      message.loading({
        content: "Đang đồng bộ bản tính man-day từ phiếu xem xét đơn...",
        duration: 0,
        key: "sync-project-manday",
      });
    },
    onSuccess: async (result) => {
      await mandayQuery.refetch();
      await onChanged?.();
      message.success({
        content: result.message || "Đã đồng bộ bản tính man-day.",
        duration: 5,
        key: "sync-project-manday",
      });
    },
    onError: (error) => {
      message.error({
        content: getErrorMessage(error),
        duration: 8,
        key: "sync-project-manday",
      });
    },
  });

  const projectAppointment = teamAppointmentQuery.data ?? null;
  const projectAppointmentIssued = normalize(projectAppointment?.status) === "issued";
  const countableProjectMemberCount = Math.max(
    1,
    projectAppointment?.members?.filter((member) => countsTowardMandays(member.team_role)).length ?? 0,
  );

  const activeProgram = programsQuery.data?.[0] ?? null;
  const qmrExceptionQuery = useQuery({
    queryKey: ["audit-programs", "gs1-exception", activeProgram?.id, qmrEvent?.id],
    enabled: Boolean(qmrEvent && activeProgram),
    queryFn: async () => (
      await api.get<QmrGs1Exception>(
        `/audit-programs/${activeProgram!.id}/events/${qmrEvent!.id}/gs1-exception`,
      )
    ).data,
    retry: 1,
  });
  const qmrApproversQuery = useQuery({
    queryKey: ["audit-programs", "gs1-qmr-approvers"],
    enabled: Boolean(qmrEvent && canManage),
    queryFn: async () => (await api.get<QmrApprover[]>("/audit-programs/gs1-exception/approvers")).data,
    staleTime: 60_000,
  });
  const currentQmrStatus = qmrExceptionQuery.data;
  const qmrAdmin = roles.some((role) => normalize(role) === "admin");
  const openQmrDialog = (event: AuditProgramEvent) => {
    setQmrEvent(event);
    const original = dayjs(event.planned_start_date);
    setQmrProposedDate(original.isValid() ? original : null);
    setQmrReason("");
    setQmrApproverId(undefined);
    setQmrReviewComment("");
  };
  const submitQmrRequest = async () => {
    if (!activeProgram || !qmrEvent || !qmrProposedDate || !qmrProposedDate.isValid()) {
      message.warning("Chọn ngày bắt đầu giám sát cần xin ngoại lệ.");
      return;
    }
    if (qmrReason.trim().length < 20 || !qmrApproverId) {
      message.warning("Chọn QMR được chỉ định và mô tả lý do tối thiểu 20 ký tự.");
      return;
    }
    setQmrBusy(true);
    try {
      await api.post(
        `/audit-programs/${activeProgram.id}/events/${qmrEvent.id}/gs1-exception/request`,
        { proposed_start_date: qmrProposedDate.format("YYYY-MM-DD"), reason: qmrReason.trim(), qmr_approver_id: qmrApproverId },
      );
      await qmrExceptionQuery.refetch();
      message.success("Đã gửi đề nghị để QMR xem xét. Lịch chưa được phê duyệt.");
    } catch (error) { message.error(getErrorMessage(error)); }
    finally { setQmrBusy(false); }
  };
  const decideQmrRequest = async (decision: "approved" | "rejected") => {
    if (!activeProgram || !qmrEvent) return;
    if (qmrReviewComment.trim().length < 20) {
      message.warning("QMR phải ghi căn cứ quyết định tối thiểu 20 ký tự.");
      return;
    }
    setQmrBusy(true);
    try {
      await api.post(
        `/audit-programs/${activeProgram.id}/events/${qmrEvent.id}/gs1-exception/decide`,
        { decision, comment: qmrReviewComment.trim() },
      );
      await qmrExceptionQuery.refetch();
      message.success(decision === "approved" ? "QMR đã duyệt đúng ngày đề nghị." : "QMR đã từ chối ngoại lệ.");
    } catch (error) { message.error(getErrorMessage(error)); }
    finally { setQmrBusy(false); }
  };
  const applyApprovedQmrDate = async () => {
    const date = currentQmrStatus?.evidence?.approved_date;
    if (!activeProgram || !qmrEvent || !date || currentQmrStatus?.status !== "approved") return;
    setQmrBusy(true);
    try {
      const previousEnd = dayjs(qmrEvent.planned_end_date);
      await api.patch(`/audit-programs/${activeProgram.id}/events/${qmrEvent.id}`, {
        planned_start_date: date,
        planned_end_date: previousEnd.isValid() && !previousEnd.isBefore(dayjs(date))
          ? previousEnd.format("YYYY-MM-DD") : date,
        form_data: {
          planned_month: dayjs(date).format("YYYY-MM"),
          planning_precision: "DATE",
          source: "approved_qmr_gs1_exception",
        },
      });
      await programsQuery.refetch();
      await onChanged?.();
      message.success("Đã áp dụng đúng ngày GS1 được QMR duyệt cho chương trình. Kiểm tra lịch kế hoạch F.05 riêng.");
    } catch (error) { message.error(getErrorMessage(error)); }
    finally { setQmrBusy(false); }
  };

  const latestCalculation = useMemo(
    () => chooseLatestCalculation(mandayQuery.data ?? []),
    [mandayQuery.data],
  );

  const cycleSummary = useMemo(() => {
    if (!latestCalculation) return null;
    const events = buildCycleEvents(latestCalculation, application, projectCreatedAt);
    return {
      initial: numberValue(latestCalculation.final_mandays),
      surveillance: events.find((item) => item.event_type === "surveillance1")?.planned_mandays ?? 0,
      recertification: events.find((item) => item.event_type === "recertification")?.planned_mandays ?? 0,
    };
  }, [application, latestCalculation, projectCreatedAt]);

  const planByEventId = useMemo(
    () => new Map(
      auditPlans
        .filter((plan) => Boolean(plan.audit_event_id))
        .map((plan) => [plan.audit_event_id as string, plan]),
    ),
    [auditPlans],
  );

  const programIssues = useMemo(() => {
    if (!activeProgram || !latestCalculation) return [];

    const issues: string[] = [];
    const stage1 = activeProgram.events.find((event) => normalize(event.event_type) === "stage1");
    const stage2 = activeProgram.events.find((event) => normalize(event.event_type) === "stage2");
    const initial = numberValue(latestCalculation.final_mandays);

    if (stage1 && stage2) {
      const splitTotal = numberValue(stage1.planned_mandays) + numberValue(stage2.planned_mandays);
      if (Math.abs(splitTotal - initial) >= 0.01) {
        issues.push(`Tổng Stage 1 + Stage 2 hiện là ${splitTotal.toFixed(1)} MD, không khớp ${initial.toFixed(1)} MD lần đầu.`);
      }

      const stage1Month = eventPlannedMonth(stage1);
      const stage2Month = eventPlannedMonth(stage2);
      if (stage1Month && stage2Month && isMonthBefore(stage2Month, stage1Month)) {
        issues.push("Tháng dự kiến Stage 2 không được trước tháng dự kiến Stage 1.");
      }
    }

    return issues;
  }, [activeProgram, latestCalculation]);

  const openEditor = () => {
    if (!projectAppointmentIssued) {
      message.warning("Cần ban hành chỉ định đoàn đánh giá theo mã hồ sơ trước khi lập chương trình.");
      onOpenTeamAssignment?.(projectId);
      return;
    }

    if (!latestCalculation) {
      message.error("Hồ sơ chưa có bản tính man-day để tạo chương trình đánh giá.");
      return;
    }

    const defaults = buildCycleEvents(latestCalculation, application, projectCreatedAt);
    const existingByType = new Map<string, AuditProgramEvent>(
      (activeProgram?.events ?? []).map((event) => [normalize(event.event_type), event]),
    );

    const mergedEvents = defaults.map((defaultEvent) => {
      const existing = existingByType.get(defaultEvent.event_type);
      if (!existing) return defaultEvent;

      const existingMonth = eventPlannedMonth(existing);
      const preserveExistingMandays = !["stage1", "stage2"].includes(defaultEvent.event_type)
        && numberValue(existing.planned_mandays) > 0;

      return {
        ...defaultEvent,
        planned_month: existingMonth ?? defaultEvent.planned_month,
        planned_mandays: preserveExistingMandays
          ? numberValue(existing.planned_mandays)
          : defaultEvent.planned_mandays,
      };
    });

    setDraftEvents(sortDraftEvents(mergedEvents));
    if (programIssues.length > 0) {
      message.info("Hệ thống đã nạp lại man-day được duyệt; tháng dự kiến vẫn có thể điều chỉnh.");
    }
    setEditorOpen(true);
  };

  const updateDraftEvent = (
    eventType: string,
    patch: Partial<DraftProgramEvent>,
  ) => {
    setDraftEvents((current) => current.map((item) => (
      item.event_type === eventType ? { ...item, ...patch } : item
    )));
  };

  const validateDraft = () => {
    const orderedEvents = sortDraftEvents(draftEvents);
    for (const event of orderedEvents) {
      if (!event.planned_month?.isValid()) {
        throw new Error(`${event.label}: chưa chọn tháng dự kiến.`);
      }
      const minimum = event.event_type === "stage1" ? 0.5 : 1;
      if (!Number.isFinite(event.planned_mandays) || event.planned_mandays < minimum) {
        throw new Error(`${event.label}: ngày công không được thấp hơn ${minimum} MD.`);
      }
      if (!isHalfDay(event.planned_mandays)) {
        throw new Error(`${event.label}: ngày công phải theo bước 0,5 MD.`);
      }
    }

    for (let index = 1; index < orderedEvents.length; index += 1) {
      const previous = orderedEvents[index - 1];
      const current = orderedEvents[index];
      if (isMonthBefore(current.planned_month, previous.planned_month)) {
        throw new Error(`${current.label}: tháng dự kiến không được trước ${previous.label}.`);
      }
    }

    const stage1 = orderedEvents.find((event) => event.event_type === "stage1");
    const stage2 = orderedEvents.find((event) => event.event_type === "stage2");
    const initial = numberValue(latestCalculation?.final_mandays);
    if (stage1 && stage2 && Math.abs(stage1.planned_mandays + stage2.planned_mandays - initial) >= 0.01) {
      throw new Error(`Tổng man-day Stage 1 và Stage 2 phải bằng ${initial.toFixed(1)} MD.`);
    }
  };

  const eventPayload = (
    event: DraftProgramEvent,
    index: number,
    currentStatus = "planned",
  ) => ({
    sequence_no: index + 1,
    event_type: event.event_type,
    planned_start_date: event.planned_month.startOf("month").format("YYYY-MM-DD"),
    planned_end_date: event.planned_month.endOf("month").format("YYYY-MM-DD"),
    planned_mandays: event.planned_mandays,
    status: currentStatus,
    form_data: {
      planning_precision: "MONTH",
      planned_month: event.planned_month.format("YYYY-MM"),
      source: "generated_from_manday_calculation",
      manday_calculation_id: latestCalculation?.id ?? null,
      manday_calculation_code: latestCalculation?.calculation_code ?? null,
    },
  });

  const saveProgram = async () => {
    if (!latestCalculation) return;
    setSaving(true);

    try {
      validateDraft();
      const orderedEvents = sortDraftEvents(draftEvents);

      if (!activeProgram) {
        await api.post("/audit-programs", {
          project_id: projectId,
          program_year: orderedEvents[0].planned_month.year(),
          status: "draft",
          events: orderedEvents.map((event, index) => eventPayload(event, index)),
          form_data: {
            generation_method: "three_year_cycle_monthly_forecast",
            planning_precision: "MONTH",
            manday_calculation_id: latestCalculation.id,
            ratios: {
              surveillance: "1/3 initial certification mandays",
              recertification: "2/3 initial certification mandays",
            },
          },
        });
        message.success("Đã tạo chương trình chu kỳ theo tháng dự kiến.");
      } else {
        const existingByType = new Map<string, AuditProgramEvent>(
          activeProgram.events.map((event) => [normalize(event.event_type), event]),
        );

        for (let index = 0; index < orderedEvents.length; index += 1) {
          const event = orderedEvents[index];
          const existing = existingByType.get(event.event_type);
          const payload = eventPayload(
            event,
            index,
            existing?.status ?? "planned",
          );
          // A QMR-approved GS1 day is authoritative. Regenerating a monthly
          // forecast must not silently reset it to the first of the month.
          const currentDate = existing?.planned_start_date
            ? dayjs(existing.planned_start_date) : null;
          const preserveGs1Date = event.event_type === "surveillance1"
            && Boolean(existing?.planned_start_date)
            && currentDate?.isValid()
            && currentDate.format("YYYY-MM") === event.planned_month.format("YYYY-MM");
          const scheduledPayload = preserveGs1Date ? {
            ...payload,
            planned_start_date: existing!.planned_start_date,
            planned_end_date: existing!.planned_end_date ?? payload.planned_end_date,
            form_data: {
              ...payload.form_data,
              planning_precision: existing?.form_data?.planning_precision ?? "DATE",
              source: existing?.form_data?.source ?? "approved_qmr_gs1_exception",
            },
          } : payload;
          if (existing) {
            await api.patch(`/audit-programs/${activeProgram.id}/events/${existing.id}`, scheduledPayload);
          } else {
            await api.post(`/audit-programs/${activeProgram.id}/events`, payload);
          }
        }
        message.success("Đã cập nhật tháng dự kiến và man-day của chương trình.");
      }

      setEditorOpen(false);
      await Promise.all([
        programsQuery.refetch(),
        onChanged?.(),
      ]);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const previousEventType: Record<string, string | undefined> = {
    stage1: undefined,
    stage2: "stage1",
    surveillance1: "stage2",
    surveillance2: "surveillance1",
    recertification: "surveillance2",
  };

  const previousPlanForEvent = (eventType: string) => {
    const previousType = previousEventType[normalize(eventType)];
    if (!previousType || !activeProgram) return null;
    const previousEvent = activeProgram.events.find(
      (item) => normalize(item.event_type) === previousType,
    );
    return previousEvent ? planByEventId.get(previousEvent.id) ?? null : null;
  };

  const openPlanEditor = (event: AuditProgramEvent) => {
    if (normalize(activeProgram?.status) !== "issued") {
      message.warning("Cần ban hành chương trình trước khi tạo kế hoạch đánh giá.");
      return;
    }
    if (planByEventId.has(event.id)) {
      message.info("Kỳ đánh giá này đã có kế hoạch.");
      return;
    }

    const eventType = normalize(event.event_type);
    const plannedMonth = eventPlannedMonth(event) ?? dayjs().add(1, "month").startOf("month");
    const requestedDate = eventType === "stage1"
      ? application?.requested_stage1_date ?? application?.requested_audit_date
      : eventType === "stage2"
        ? application?.requested_stage2_date
        : null;
    let suggestedDate = dayjs(requestedDate);
    if (!suggestedDate.isValid()) {
      suggestedDate = plannedMonth.startOf("month");
    }

    const previousPlan = previousPlanForEvent(eventType);
    const previousPlanDate = dayjs(previousPlan?.planned_start_date);
    if (previousPlanDate.isValid()) {
      suggestedDate = eventType === "stage2"
        ? previousPlanDate.add(1, "month")
        : previousPlanDate.add(1, "year");
    }

    const suggestedMemberCount = ["stage1", "stage2"].includes(eventType)
      ? countableProjectMemberCount
      : 1;
    const suggestedCalendarDays = Math.max(
      1,
      Math.ceil(numberValue(event.planned_mandays) / suggestedMemberCount),
    );
    const suggestedStart = suggestedDate.startOf("day");

    setPlanEditorEvent(event);
    setPlanStartDate(suggestedStart);
    setPlanEndDate(suggestedStart.add(suggestedCalendarDays - 1, "day"));
  };

  const createPlanFromEvent = async () => {
    const event = planEditorEvent;
    if (!event) return;
    const isStage1 = normalize(event.event_type) === "stage1";
    const effectiveEndDate = planEndDate;
    if (!planStartDate?.isValid() || !effectiveEndDate?.isValid()) {
      message.error(isStage1 ? "Chọn khung thời gian dự kiến thực hiện Giai đoạn 1." : "Chọn đầy đủ ngày bắt đầu và ngày kết thúc kế hoạch.");
      return;
    }
    if (effectiveEndDate.isBefore(planStartDate, "day")) {
      message.error("Ngày kết thúc không được trước ngày bắt đầu.");
      return;
    }

    const previousPlan = previousPlanForEvent(event.event_type);

    setCreatingPlanEventId(event.id);
    try {
      const planResponse = await api.post<AuditPlanReference>("/audit-plans", {
        project_id: projectId,
        audit_event_id: event.id,
        audit_type: event.event_type,
        planned_start_date: planStartDate.format("YYYY-MM-DD"),
        planned_end_date: effectiveEndDate.format("YYYY-MM-DD"),
        location: isStage1 ? "Từ xa" : previousPlan?.location || undefined,
        audit_scope: previousPlan?.audit_scope || undefined,
        audit_criteria: previousPlan?.audit_criteria || undefined,
        status: "draft",
        form_data: {
          source: "created_from_audit_program",
          audit_program_event_id: event.id,
          program_planned_month: eventPlannedMonth(event)?.format("YYYY-MM") ?? null,
          exact_dates_selected_manually: true,
          stage1_remote_workload: isStage1,
          stage1_remote_date_window_flexible: isStage1,
          planned_mandays: numberValue(event.planned_mandays),
          copied_from_previous_plan_id: previousPlan?.id ?? null,
          copied_from_previous_plan_code: previousPlan?.plan_code ?? null,
          carried_forward_scope_location_criteria: Boolean(previousPlan),
        },
      });
      const createdPlan = planResponse.data;
      message.success(isStage1
        ? `Đã tạo khung Giai đoạn 1 từ xa. Tiếp tục chọn thành viên từ F.04 và phân đủ ${numberValue(event.planned_mandays).toFixed(1)} MD.`
        : `Đã tạo đợt ${eventLabel(event.event_type)}. Tiếp tục điều phối ngay trên đúng đợt này.`);
      setPlanEditorEvent(null);
      setPlanStartDate(null);
      setPlanEndDate(null);
      await onChanged?.();
      onOpenAuditPlan?.(createdPlan.id);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setCreatingPlanEventId(null);
    }
  };

  const issueProgram = async () => {
    if (!activeProgram) return;
    if (!projectAppointmentIssued) {
      message.warning("Cần ban hành chỉ định đoàn theo mã hồ sơ trước khi ban hành chương trình.");
      onOpenTeamAssignment?.(projectId);
      return;
    }
    setIssuing(true);
    try {
      await api.patch(`/audit-programs/${activeProgram.id}`, { status: "issued" });
      message.success("Đã ban hành chương trình đánh giá.");
      await Promise.all([
        programsQuery.refetch(),
        onChanged?.(),
      ]);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIssuing(false);
    }
  };

  const columns: TableColumnsType<AuditProgramEvent> = [
    {
      title: "Kỳ đánh giá",
      dataIndex: "event_type",
      key: "event_type",
      render: (value: string) => <strong>{eventLabel(value)}</strong>,
    },
    {
      title: "Tháng dự kiến",
      key: "planned_month",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <strong>{formatPlannedMonth(record)}</strong>
          <Text type="secondary">Chưa khóa ngày cụ thể</Text>
        </Space>
      ),
    },
    {
      title: "Ngày công",
      dataIndex: "planned_mandays",
      key: "planned_mandays",
      width: 120,
      render: (value) => <strong>{numberValue(value).toFixed(1)} MD</strong>,
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 170,
      render: (_, record) => {
        const plan = planByEventId.get(record.id);
        if (!plan) {
          return normalize(activeProgram?.status) === "issued"
            ? <Tag color="default">Chưa lập kế hoạch</Tag>
            : <Tag color="orange">Chờ ban hành</Tag>;
        }

        const planStatus = normalize(plan.status);
        if (planStatus === "completed") {
          return <Tag color="green" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>;
        }
        if (["issued", "approved", "planned"].includes(planStatus)) {
          return <Tag color="blue" icon={<CalendarOutlined />}>Đã lên lịch</Tag>;
        }
        return <Tag color="gold">Kế hoạch dự thảo</Tag>;
      },
    },
    {
      title: "",
      key: "action",
      width: 220,
      align: "right",
      render: (_, record) => {
        const plan = planByEventId.get(record.id);
        const eventType = normalize(record.event_type);
        if (plan) {
          if (!canManage) {
            return (
              <Button size="small" type="link" onClick={() => onOpenPlanWorkspace?.(plan.id)}>
                Mở hồ sơ đợt
              </Button>
            );
          }
          if (eventType === "stage1") {
            return (
              <Space size={4}>
                <Text type="secondary">{plan.plan_code}</Text>
                <Button size="small" type="link" onClick={() => onOpenAuditPlan?.(plan.id)}>
                  Điều phối GĐ1
                </Button>
              </Space>
            );
          }
          return (
            <Space size={4}>
              <Text type="secondary">{plan.plan_code}</Text>
              <Button size="small" type="link" onClick={() => onOpenAuditPlan?.(plan.id)}>
                {eventType === "stage2" ? "Điều phối" : "Chỉ định đoàn"}
              </Button>
            </Space>
          );
        }
        if (!canManage || normalize(activeProgram?.status) !== "issued") return null;
        return (
          <Button
            icon={<FileAddOutlined />}
            loading={creatingPlanEventId === record.id}
            onClick={() => openPlanEditor(record)}
            size="small"
            type="link"
          >
            Điều phối đợt
          </Button>
        );
      },
    },
  ];

  if (programsQuery.isLoading || mandayQuery.isLoading || teamAppointmentQuery.isLoading) {
    return <Card loading title="Chương trình đánh giá" />;
  }

  return (
    <>
      <Card
        extra={canManage ? (
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              loading={
                programsQuery.isFetching
                || mandayQuery.isFetching
                || teamAppointmentQuery.isFetching
              }
              onClick={() => void Promise.all([
                programsQuery.refetch(),
                mandayQuery.refetch(),
                teamAppointmentQuery.refetch(),
              ])}
            >
              Làm mới
            </Button>
            <Button
              disabled={!projectAppointmentIssued}
              icon={activeProgram ? <EditOutlined /> : <FileAddOutlined />}
              onClick={openEditor}
              title={!projectAppointmentIssued
                ? "Cần ban hành chỉ định đoàn theo hồ sơ trước"
                : undefined}
              type={activeProgram ? "default" : "primary"}
            >
              {activeProgram ? "Sửa chương trình" : "Tạo chương trình 3 năm"}
            </Button>
            {activeProgram && normalize(activeProgram.status) !== "issued" ? (
              <Popconfirm
                description="Sau khi ban hành, chương trình được dùng làm cơ sở lập các kế hoạch đánh giá."
                okText="Ban hành"
                onConfirm={() => void issueProgram()}
                title="Ban hành chương trình đánh giá?"
              >
                <Button
                  disabled={!projectAppointmentIssued}
                  icon={<SendOutlined />}
                  loading={issuing}
                  type="primary"
                >
                  Ban hành
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        ) : null}
        title="Chương trình đánh giá chu kỳ chứng nhận"
      >
        {programsQuery.isError ? (
          <Alert
            description={getErrorMessage(programsQuery.error)}
            message="Không tải được chương trình đánh giá"
            showIcon
            type="error"
          />
        ) : null}

        {teamAppointmentQuery.isError ? (
          <Alert
            action={<Button onClick={() => void teamAppointmentQuery.refetch()}>Thử lại</Button>}
            description={getErrorMessage(teamAppointmentQuery.error)}
            message="Không kiểm tra được chỉ định đoàn của hồ sơ"
            showIcon
            style={{ marginBottom: 16 }}
            type="error"
          />
        ) : !projectAppointmentIssued ? (
          <Alert
            action={canManage && onOpenTeamAssignment ? (
              <Button
                icon={<TeamOutlined />}
                onClick={() => onOpenTeamAssignment(projectId)}
                type="primary"
              >
                Chỉ định đoàn theo hồ sơ
              </Button>
            ) : null}
            description={projectAppointment
              ? `Chỉ định ${projectAppointment.appointment_number ?? ""} đang ở trạng thái dự thảo. Cần hoàn thiện và ban hành trước khi tạo chương trình đánh giá.`
              : "Chưa có chỉ định đoàn đánh giá cho hồ sơ này. Hệ thống quản lý đoàn theo mã hồ sơ chứng nhận, không phụ thuộc mã kế hoạch đánh giá."}
            message="Chưa đạt điều kiện lập chương trình đánh giá"
            showIcon
            style={{ marginBottom: 16 }}
            type="warning"
          />
        ) : (
          <Alert
            description={`${projectAppointment?.appointment_number ?? "Chỉ định đoàn"} · ${projectAppointment?.members?.length ?? 0} thành viên`}
            message="Đoàn đánh giá của hồ sơ đã được ban hành"
            showIcon
            style={{ marginBottom: 16 }}
            type="success"
          />
        )}

        {!latestCalculation ? (
          <Alert
            action={canManage ? (
              <Button
                loading={syncMandayMutation.isPending}
                onClick={() => syncMandayMutation.mutate()}
                type="primary"
              >
                Đồng bộ từ xem xét đơn
              </Button>
            ) : null}
            description={canManage
              ? "Bản xem xét đăng ký đã có kết quả man-day nhưng dự án chưa có bản tính riêng. Bấm Đồng bộ để tạo bản tính được kiểm soát và tiếp tục lập chương trình."
              : "Dự án chưa có bản tính man-day. Đề nghị Điều phối viên đồng bộ kết quả từ bản xem xét đăng ký."}
            message="Chưa có bản tính man-day"
            showIcon
            type="warning"
          />
        ) : null}

        <Card size="small" style={{ marginBottom: 16 }} title="Luồng công việc của hồ sơ">
          <Steps
            current={normalize(activeProgram?.status) === "issued" ? 2 : projectAppointmentIssued ? 1 : 0}
            items={[
              { title: "Chỉ định đoàn", description: "Điều phối viên ban hành F.04 cấp hồ sơ" },
              { title: "Chương trình", description: "Ban hành chương trình chu kỳ" },
              { title: "Điều phối từng đợt", description: "GĐ1/GĐ2 điều phối từ F.04 lần đầu; GS/TCC chỉ định đoàn riêng theo từng đợt" },
              { title: "Hồ sơ đánh giá", description: "Trưởng đoàn lập kế hoạch, thực hiện và báo cáo" },
            ]}
            responsive
            size="small"
          />
        </Card>

        {latestCalculation && cycleSummary ? (
          <Descriptions bordered column={{ xs: 1, sm: 2, lg: 4 }} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Bản tính sử dụng">
              {latestCalculation.calculation_code ?? `Phiên bản ${latestCalculation.version_no ?? 1}`}
              {normalize(latestCalculation.status) === "approved" ? <Tag color="green" style={{ marginLeft: 8 }}>Đã duyệt</Tag> : <Tag color="orange" style={{ marginLeft: 8 }}>Mới nhất</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Chứng nhận lần đầu">{cycleSummary.initial.toFixed(1)} MD</Descriptions.Item>
            <Descriptions.Item label="Mỗi kỳ giám sát">{cycleSummary.surveillance.toFixed(1)} MD (1/3)</Descriptions.Item>
            <Descriptions.Item label="Tái chứng nhận">{cycleSummary.recertification.toFixed(1)} MD (2/3)</Descriptions.Item>
          </Descriptions>
        ) : null}

        {programIssues.length > 0 ? (
          <Alert
            action={canManage ? <Button onClick={openEditor} size="small">Sửa và đồng bộ</Button> : null}
            description={programIssues.map((issue) => <div key={issue}>{issue}</div>)}
            message="Chương trình cần đồng bộ"
            showIcon
            style={{ marginBottom: 16 }}
            type="warning"
          />
        ) : null}

        {activeProgram ? (
          <>
            <Space align="center" style={{ marginBottom: 12 }} wrap>
              <Text strong>{activeProgram.program_code}</Text>
              <Tag>Năm {activeProgram.program_year}</Tag>
              <Tag>Phiên bản {activeProgram.version_no}</Tag>
              {statusTag(activeProgram.status)}
            </Space>
            <Table
              columns={columns}
              dataSource={[...activeProgram.events].sort((left, right) => left.sequence_no - right.sequence_no)}
              pagination={false}
              rowKey="id"
              size="middle"
            />
            {canManage && activeProgram.events.some((event) => normalize(event.event_type) === "surveillance1") ? (
              <Alert
                showIcon
                type="info"
                style={{ marginTop: 12 }}
                title="Kiểm soát lịch giám sát lần 1"
                description="Giám sát lần 1 không được bắt đầu quá 12 tháng kể từ quyết định cấp hoặc tái chứng nhận. Trường hợp vượt hạn phải có đề nghị và phê duyệt QMR độc lập, đúng ngày."
                action={
                  <Button size="small" onClick={() => {
                    const gs1 = activeProgram.events.find((event) => normalize(event.event_type) === "surveillance1");
                    if (gs1) openQmrDialog(gs1);
                  }}>Ngoại lệ QMR</Button>
                }
              />
            ) : null}
          </>
        ) : (
          <Empty
            description="Chưa có chương trình đánh giá cho hồ sơ này"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {canManage && latestCalculation && projectAppointmentIssued ? (
              <Button icon={<FileAddOutlined />} onClick={openEditor} type="primary">
                Tạo chương trình 3 năm
              </Button>
            ) : null}
          </Empty>
        )}
      </Card>

      <Modal
        footer={null}
        destroyOnHidden
        open={Boolean(qmrEvent)}
        onCancel={() => setQmrEvent(null)}
        width={700}
        title="Ngoại lệ hạn giám sát lần 1 — QMR"
      >
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Alert
            showIcon type="warning"
            title="Không tự động phê duyệt hoặc sửa lịch quá hạn"
            description="Chỉ QMR được chỉ định và có quyền ADMIN đang hoạt động mới được phê duyệt. Người đề nghị không được tự duyệt. Việc duyệt không tự sửa F.03/F.05 hoặc cấp chứng chỉ."
          />
          {qmrExceptionQuery.isError ? (
            <Alert showIcon type="error" title="Không tải được lịch sử ngoại lệ" description={getErrorMessage(qmrExceptionQuery.error)}
              action={<Button size="small" onClick={() => void qmrExceptionQuery.refetch()}>Thử lại</Button>} />
          ) : null}
          {qmrExceptionQuery.isLoading ? <Card loading /> : null}
          {currentQmrStatus?.status && currentQmrStatus.status !== "none" ? (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Trạng thái">
                {currentQmrStatus.status === "approved" ? <Tag color="green">Đã được QMR phê duyệt</Tag>
                  : currentQmrStatus.status === "pending" ? <Tag color="gold">Chờ QMR</Tag>
                    : <Tag color="red">QMR không chấp thuận</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày đề nghị">{currentQmrStatus.evidence?.approved_date ? dayjs(currentQmrStatus.evidence.approved_date).format("DD/MM/YYYY") : "—"}</Descriptions.Item>
              <Descriptions.Item label="Lý do">{currentQmrStatus.evidence?.reason ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Ý kiến QMR">{currentQmrStatus.evidence?.reviewer_comment ?? "Chưa quyết định"}</Descriptions.Item>
            </Descriptions>
          ) : null}

          {currentQmrStatus?.status !== "pending" ? (
            <Card size="small" title="Lập đề nghị ngoại lệ">
              <Space orientation="vertical" style={{ width: "100%" }} size="middle">
                <div>
                  <Text strong>Ngày bắt đầu GS1 dự kiến cần phê duyệt</Text>
                  <DatePicker aria-label="Ngày bắt đầu GS1 xin ngoại lệ"
                    style={{ width: "100%", marginTop: 6 }} format="DD/MM/YYYY"
                    value={qmrProposedDate} onChange={setQmrProposedDate}
                    allowClear={false} />
                </div>
                <div>
                  <Text strong>Nguyên nhân và biện pháp kiểm soát</Text>
                  <Input.TextArea aria-label="Lý do ngoại lệ GS1" rows={3} maxLength={2000}
                    value={qmrReason} onChange={(event) => setQmrReason(event.target.value)}
                    placeholder="Nêu nguyên nhân khách quan, tác động đến hiệu lực chứng nhận và biện pháp giảm thiểu..." />
                </div>
                <div>
                  <Text strong>QMR độc lập được chỉ định</Text>
                  <Select aria-label="Người phê duyệt QMR" style={{ width: "100%", marginTop: 6 }}
                    loading={qmrApproversQuery.isFetching}
                    placeholder="Chọn QMR đang hoạt động"
                    value={qmrApproverId} onChange={setQmrApproverId}
                    options={(qmrApproversQuery.data ?? []).map((user) => ({
                      value: user.id, label: user.full_name ? `${user.full_name} · ${user.username}` : user.username,
                    }))}
                  />
                  {qmrApproversQuery.data?.length === 0 ? (
                    <Text type="danger">Chưa cấu hình QMR hợp lệ trên backend (P09_QMR_APPROVER_IDS). Không thể phê duyệt.</Text>
                  ) : null}
                </div>
                <Button type="primary" onClick={() => void submitQmrRequest()}
                  loading={qmrBusy} disabled={!qmrApproversQuery.data?.length || !qmrProposedDate || qmrReason.trim().length < 20 || !qmrApproverId}>
                  Gửi QMR xem xét
                </Button>
              </Space>
            </Card>
          ) : null}

          {currentQmrStatus?.status === "pending" && qmrAdmin ? (
            <Card size="small" title="Quyết định độc lập của QMR">
              <Space orientation="vertical" style={{ width: "100%" }}>
                <Text>Chỉ tài khoản QMR được chỉ định trong đề nghị mới có quyền quyết định.</Text>
                <Input.TextArea aria-label="Ý kiến quyết định QMR" maxLength={2000} rows={3} value={qmrReviewComment}
                  onChange={(event) => setQmrReviewComment(event.target.value)}
                  placeholder="Căn cứ xem xét, bằng chứng và ý kiến phê duyệt / từ chối..." />
                <Space wrap>
                  <Button type="primary" loading={qmrBusy} disabled={qmrReviewComment.trim().length < 20}
                    onClick={() => void decideQmrRequest("approved")}>Chấp thuận ngày ngoại lệ</Button>
                  <Button danger loading={qmrBusy} disabled={qmrReviewComment.trim().length < 20}
                    onClick={() => void decideQmrRequest("rejected")}>Không chấp thuận</Button>
                </Space>
              </Space>
            </Card>
          ) : null}

          {currentQmrStatus?.status === "approved" ? (
            <Alert type="success" showIcon
              title="Lịch đã được QMR phê duyệt nhưng chưa tự động áp dụng"
              description="Bấm áp dụng để cập nhật đúng ngày đã duyệt trong chương trình; kế hoạch F.05 vẫn phải được đối chiếu độc lập."
              action={<Button loading={qmrBusy} onClick={() => void applyApprovedQmrDate()}>Áp dụng ngày đã duyệt</Button>}
            />
          ) : null}
        </Space>
      </Modal>

      <Modal
        cancelText="Hủy"
        destroyOnHidden
        maskClosable={false}
        okButtonProps={{ loading: saving }}
        okText={activeProgram ? "Lưu thay đổi" : "Tạo chương trình"}
        onCancel={() => setEditorOpen(false)}
        onOk={() => void saveProgram()}
        open={editorOpen}
        title={activeProgram ? "Cập nhật chương trình đánh giá" : "Tạo chương trình đánh giá 3 năm"}
        width={980}
      >
        <Alert
          description="Chương trình chu kỳ chỉ quản lý tháng dự kiến và man-day dự kiến. Ngày đánh giá cụ thể được chọn sau khi tạo kế hoạch cho từng kỳ. Giám sát và tái chứng nhận là số dự kiến; trước mỗi kỳ phải rà soát lại dữ liệu hiện hành."
          message="Kế hoạch cấp chương trình không khóa ngày cụ thể"
          showIcon
          style={{ marginBottom: 16 }}
          type="info"
        />
        <Table<DraftProgramEvent>
          columns={[
            {
              title: "Kỳ đánh giá",
              dataIndex: "label",
              key: "label",
              width: 220,
              render: (value: string) => <strong>{value}</strong>,
            },
            {
              title: "Tháng dự kiến",
              key: "month",
              render: (_, record) => (
                <DatePicker
                  allowClear={false}
                  format="MM/YYYY"
                  onChange={(value) => updateDraftEvent(record.event_type, {
                    planned_month: (value ?? record.planned_month).startOf("month"),
                  })}
                  picker="month"
                  style={{ width: "100%" }}
                  value={record.planned_month}
                />
              ),
            },
            {
              title: "Man-day dự kiến",
              key: "mandays",
              width: 180,
              render: (_, record) => (
                <InputNumber
                  addonAfter="MD"
                  min={record.event_type === "stage1" ? 0.5 : 1}
                  onChange={(value) => updateDraftEvent(record.event_type, {
                    planned_mandays: Number(value ?? record.planned_mandays),
                  })}
                  precision={1}
                  step={0.5}
                  style={{ width: "100%" }}
                  value={record.planned_mandays}
                />
              ),
            },
          ]}
          dataSource={sortDraftEvents(draftEvents)}
          pagination={false}
          rowKey="event_type"
          size="small"
        />
      </Modal>

      <Modal
        cancelText="Hủy"
        destroyOnHidden
        maskClosable={false}
        okButtonProps={{ loading: Boolean(planEditorEvent && creatingPlanEventId === planEditorEvent.id) }}
        okText={normalize(planEditorEvent?.event_type) === "stage1" ? "Tạo & điều phối GĐ1" : "Tạo & điều phối đợt"}
        onCancel={() => {
          setPlanEditorEvent(null);
          setPlanStartDate(null);
          setPlanEndDate(null);
        }}
        onOk={() => void createPlanFromEvent()}
        open={Boolean(planEditorEvent)}
        title={planEditorEvent
          ? normalize(planEditorEvent.event_type) === "stage1"
            ? "Khởi tạo Giai đoạn 1 từ xa"
            : `Điều phối đợt — ${eventLabel(planEditorEvent.event_type)}`
          : "Điều phối đợt"}
        width={640}
      >
        {planEditorEvent ? (
          <>
            <Alert
              description={normalize(planEditorEvent.event_type) === "stage1"
                ? `Giai đoạn 1 thực hiện từ xa. Hãy chọn khung thời gian dự kiến để phân workload cho các thành viên trong F.04. Lịch này là cảnh báo mềm khi xếp onsite: hệ thống ưu tiên tránh trùng nhưng không khóa cứng.`
                : `Chương trình chỉ dự kiến tháng ${formatPlannedMonth(planEditorEvent)}. Điều phối viên chọn ngày thực tế và nguồn lực; Trưởng đoàn sẽ phân công nội dung đánh giá trong kế hoạch chi tiết.`}
              message={normalize(planEditorEvent.event_type) === "stage1"
                ? "GĐ1 từ xa: quản lý đầy đủ thành viên + MD, không khóa cứng lịch onsite"
                : "Điều phối viên xác định ngày và nguồn lực; Trưởng đoàn xác định nội dung"}
              showIcon
              style={{ marginBottom: 16 }}
              type="info"
            />
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Man-day yêu cầu">
                {numberValue(planEditorEvent.planned_mandays).toFixed(1)} MD
              </Descriptions.Item>
              <Descriptions.Item label="Nguồn gợi ý">
                {["surveillance1", "surveillance2", "recertification"].includes(normalize(planEditorEvent.event_type))
                  ? "Ưu tiên ngày tương ứng từ kế hoạch của kỳ trước; nếu chưa có thì dùng tháng dự kiến."
                  : "Ngày khách hàng đề nghị; nếu chưa có thì dùng tháng dự kiến."}
              </Descriptions.Item>
              <Descriptions.Item label="Cách gợi ý độ dài">
                {normalize(planEditorEvent.event_type) === "stage1"
                  ? `Gợi ý theo ${countableProjectMemberCount} người tính MD trong F.04. Điều phối viên chọn những thành viên thực sự tham gia GĐ1; Trưởng đoàn vẫn phải đúng người đã ban hành.`
                  : normalize(planEditorEvent.event_type) === "stage2"
                    ? `Gợi ý theo ${countableProjectMemberCount} người tính MD trong đoàn lần đầu; thành phần/vai trò vẫn kế thừa F.04 cấp hồ sơ.`
                    : "Giám sát/tái chứng nhận có chỉ định đoàn riêng cho từng đợt; không giả định dùng lại đoàn lần đầu."}
              </Descriptions.Item>
            </Descriptions>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Text strong>{normalize(planEditorEvent.event_type) === "stage1" ? "Khung dự kiến — ngày bắt đầu" : "Ngày bắt đầu"}</Text>
                <DatePicker
                  allowClear={false}
                  format="DD/MM/YYYY"
                  onChange={(value) => {
                    const next = value ?? planStartDate;
                    if (!next) return;
                    const currentDuration = planStartDate && planEndDate
                      ? Math.max(0, planEndDate.diff(planStartDate, "day"))
                      : 0;
                    setPlanStartDate(next);
                    setPlanEndDate(next.add(currentDuration, "day"));
                  }}
                  style={{ display: "block", marginTop: 6, width: "100%" }}
                  value={planStartDate}
                />
              </div>
              <div>
                <Text strong>{normalize(planEditorEvent.event_type) === "stage1" ? "Khung dự kiến — ngày kết thúc" : "Ngày kết thúc"}</Text>
                <DatePicker
                  allowClear={false}
                  format="DD/MM/YYYY"
                  minDate={planStartDate ?? undefined}
                  onChange={(value) => setPlanEndDate(value ?? planEndDate)}
                  style={{ display: "block", marginTop: 6, width: "100%" }}
                  value={planEndDate}
                />
              </div>
              {planStartDate && planEndDate ? (() => {
                const calendarDays = planEndDate.diff(planStartDate, "day") + 1;
                const assumedMemberCount = ["stage1", "stage2"].includes(normalize(planEditorEvent.event_type))
                  ? countableProjectMemberCount
                  : 1;
                const capacity = calendarDays * assumedMemberCount;
                const required = numberValue(planEditorEvent.planned_mandays);
                return (
                  <Alert
                    description={normalize(planEditorEvent.event_type) === "stage1"
                      ? `Khung remote có ${calendarDays} ngày và đang gợi ý theo ${assumedMemberCount} người trong F.04. Tổng MD phải đủ ${required.toFixed(1)} MD; ngày GĐ1 chỉ tạo cảnh báo mềm khi trùng onsite.`
                      : `Khung đã chọn có ${calendarDays} ngày. Theo giả định ${assumedMemberCount} người tính MD, khả năng bố trí là ${capacity.toFixed(1)} MD; kỳ đánh giá yêu cầu ${required.toFixed(1)} MD. Khi phân công thực tế, hệ thống sẽ kiểm tra lại theo từng người.`}
                    message={capacity + 0.001 < required
                      ? "Khung ngày gợi ý hiện chưa đủ khả năng bố trí"
                      : "Khung ngày có thể tiếp tục lập kế hoạch"}
                    showIcon
                    type={capacity + 0.001 < required ? "warning" : "success"}
                  />
                );
              })() : null}
              {planEditorEvent && planStartDate && eventPlannedMonth(planEditorEvent)
                && planStartDate.format("YYYY-MM") !== eventPlannedMonth(planEditorEvent)?.format("YYYY-MM") ? (
                  <Alert
                    message={`Ngày đã chọn nằm ngoài tháng dự kiến ${formatPlannedMonth(planEditorEvent)}. Hệ thống vẫn cho phép lưu vì chương trình chỉ là dự kiến.`}
                    showIcon
                    type="warning"
                  />
                ) : null}
            </Space>
          </>
        ) : null}
      </Modal>
    </>
  );
}
