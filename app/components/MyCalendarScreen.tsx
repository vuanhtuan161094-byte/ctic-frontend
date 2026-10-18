"use client";

import { CalendarOutlined, ClockCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import type { CalendarProps } from "antd";
import { Badge, Button, Calendar, Card, Empty, Grid, Pagination, Segmented, Space, Tag, Typography } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import type { PersonalCalendarItem } from "../types/personal-workspace";

const { Text, Title } = Typography;

interface MyCalendarScreenProps {
  items: PersonalCalendarItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onOpenPath: (path: string | null, context?: Record<string, unknown> | null) => void;
}

const typeMeta: Record<PersonalCalendarItem["type"], { label: string; color: string }> = {
  AUDIT: { label: "Đánh giá", color: "green" },
  WORK_DUE: { label: "Hạn công việc", color: "blue" },
  REVIEW_DUE: { label: "Hạn thẩm xét", color: "purple" },
  DECISION_DUE: { label: "Hạn quyết định", color: "orange" },
  CERTIFICATE_ACTION_DUE: { label: "Hạn chứng chỉ", color: "cyan" },
};

const actionLabels: Record<PersonalCalendarItem["type"], string> = {
  AUDIT: "Xem lịch đánh giá",
  WORK_DUE: "Xem công việc",
  REVIEW_DUE: "Xem thẩm xét",
  DECISION_DUE: "Xem quyết định",
  CERTIFICATE_ACTION_DUE: "Xem chứng chỉ",
};

export function MyCalendarScreen({ items, refreshing, onRefresh, onOpenPath }: MyCalendarScreenProps) {
  const screens = Grid.useBreakpoint();
  const [view, setView] = useState<"month" | "agenda">("month");
  const [hasChosenView, setHasChosenView] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [agendaPage, setAgendaPage] = useState(1);
  const activeView = screens.xl === false && !hasChosenView ? "agenda" : view;

  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, PersonalCalendarItem[]>();
    items.forEach((item) => {
      const dateKey = dayjs(item.start).format("YYYY-MM-DD");
      grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), item]);
    });
    return grouped;
  }, [items]);

  const selectedItems = useMemo(
    () => itemsByDate.get(selectedDate.format("YYYY-MM-DD")) ?? [],
    [itemsByDate, selectedDate],
  );
  const agendaItems = useMemo(
    () => [...items].sort((left, right) => dayjs(left.start).valueOf() - dayjs(right.start).valueOf()),
    [items],
  );
  const agendaPageSize = 12;
  const agendaPageCount = Math.max(1, Math.ceil(agendaItems.length / agendaPageSize));
  const currentAgendaPage = Math.min(agendaPage, agendaPageCount);
  const visibleAgendaItems = agendaItems.slice((currentAgendaPage - 1) * agendaPageSize, currentAgendaPage * agendaPageSize);

  const cellRender: CalendarProps<Dayjs>["cellRender"] = (date, info) => {
    if (info.type !== "date") return info.originNode;
    const dateItems = itemsByDate.get(date.format("YYYY-MM-DD")) ?? [];
    return (
      <div className="my-calendar-cell-items">
        {dateItems.slice(0, 2).map((item) => (
          <button aria-label={`${typeMeta[item.type].label}: ${item.title}`} key={item.id} onClick={() => onOpenPath(item.destination_path, item.context)} type="button">
            <Badge color={typeMeta[item.type].color} />
            <span>{typeMeta[item.type].label}: {item.title}</span>
          </button>
        ))}
        {dateItems.length > 2 ? <small>+{dateItems.length - 2} lịch khác</small> : null}
      </div>
    );
  };

  const renderAgendaItem = (item: PersonalCalendarItem) => (
    <li className="my-calendar-agenda-row" key={item.id}>
      <div className="my-calendar-agenda-date">
        <strong>{dayjs(item.start).format("DD")}</strong>
        <span>{dayjs(item.start).format("MM/YYYY")}</span>
      </div>
      <div className="my-calendar-agenda-copy">
        <div className="my-calendar-agenda-title">
          <Tag color={typeMeta[item.type].color}>{typeMeta[item.type].label}</Tag>
          <Text strong>{item.title}</Text>
        </div>
        <div className="my-calendar-agenda-description">
          <Space size={[8, 4]} wrap>
            <span>{item.project_code ?? "Chưa tạo hồ sơ"}</span>
            <span>{item.organization_name ?? "—"}</span>
            {item.role_in_event ? <span>Vai trò: {item.role_in_event.replaceAll("_", " ")}</span> : null}
            <span><ClockCircleOutlined /> {dayjs(item.start).format("DD/MM/YYYY")}</span>
          </Space>
        </div>
      </div>
      <Button onClick={() => onOpenPath(item.destination_path, item.context)} size="small" type="primary">{actionLabels[item.type]}</Button>
    </li>
  );

  return (
    <div className="my-calendar-screen">
      <div className="screen-heading-row">
        <div>
          <Title level={1}>Lịch</Title>
          <Text type="secondary">Lịch đánh giá được phân công và các hạn công việc liên quan.</Text>
        </div>
        <Space>
          <Segmented
            onChange={(value) => {
              setView(value as "month" | "agenda");
              setHasChosenView(true);
            }}
            options={[{ label: "Tháng", value: "month" }, { label: "Danh sách", value: "agenda" }]}
            value={activeView}
          />
          <Button icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh}>Làm mới</Button>
        </Space>
      </div>

      {activeView === "month" ? (
        <section className="my-calendar-layout">
          <Card className="my-calendar-month-card">
            <Calendar cellRender={cellRender} onSelect={setSelectedDate} value={selectedDate} />
          </Card>
          <Card title={<Space><CalendarOutlined />Ngày {selectedDate.format("DD/MM/YYYY")}</Space>}>
            {selectedItems.length
              ? <ul aria-label="Lịch trong ngày đã chọn" className="my-calendar-agenda-list">{selectedItems.map(renderAgendaItem)}</ul>
              : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có lịch trong ngày đã chọn." />}
          </Card>
        </section>
      ) : (
        <Card title="Danh sách lịch">
          {agendaItems.length
            ? <ul aria-label="Danh sách lịch" className="my-calendar-agenda-list">{visibleAgendaItems.map(renderAgendaItem)}</ul>
            : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có lịch đánh giá hoặc hạn công việc." />}
          {agendaItems.length > agendaPageSize ? (
            <Pagination
              current={currentAgendaPage}
              onChange={setAgendaPage}
              pageSize={agendaPageSize}
              showSizeChanger={false}
              size="small"
              total={agendaItems.length}
            />
          ) : null}
        </Card>
      )}
    </div>
  );
}
