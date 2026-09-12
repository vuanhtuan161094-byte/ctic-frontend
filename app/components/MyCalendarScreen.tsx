"use client";

import { CalendarOutlined, ClockCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import type { CalendarProps } from "antd";
import { Badge, Button, Calendar, Card, Empty, List, Segmented, Space, Tag, Typography } from "antd";
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

export function MyCalendarScreen({ items, refreshing, onRefresh, onOpenPath }: MyCalendarScreenProps) {
  const [view, setView] = useState<"month" | "agenda">("month");
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const selectedItems = useMemo(
    () => items.filter((item) => dayjs(item.start).isSame(selectedDate, "day")),
    [items, selectedDate],
  );
  const agendaItems = useMemo(
    () => [...items].sort((left, right) => dayjs(left.start).valueOf() - dayjs(right.start).valueOf()),
    [items],
  );

  const cellRender: CalendarProps<Dayjs>["cellRender"] = (date, info) => {
    if (info.type !== "date") return info.originNode;
    const dateItems = items.filter((item) => dayjs(item.start).isSame(date, "day"));
    return (
      <div className="my-calendar-cell-items">
        {dateItems.slice(0, 3).map((item) => (
          <button key={item.id} onClick={() => onOpenPath(item.destination_path, item.context)} type="button">
            <Badge color={typeMeta[item.type].color} />
            <span>{typeMeta[item.type].label}: {item.title}</span>
          </button>
        ))}
        {dateItems.length > 3 ? <small>+{dateItems.length - 3} lịch khác</small> : null}
      </div>
    );
  };

  const renderAgendaItem = (item: PersonalCalendarItem) => (
    <List.Item actions={[<Button key="open" onClick={() => onOpenPath(item.destination_path, item.context)} size="small" type="primary">Mở</Button>]}>
      <div className="my-calendar-agenda-date">
        <strong>{dayjs(item.start).format("DD")}</strong>
        <span>{dayjs(item.start).format("MM/YYYY")}</span>
      </div>
      <List.Item.Meta
        description={(
          <Space size={[8, 4]} wrap>
            <span>{item.project_code ?? "Chưa tạo hồ sơ"}</span>
            <span>{item.organization_name ?? "—"}</span>
            {item.role_in_event ? <span>Vai trò: {item.role_in_event.replaceAll("_", " ")}</span> : null}
            <span><ClockCircleOutlined /> {dayjs(item.start).format("DD/MM/YYYY")}</span>
          </Space>
        )}
        title={<Space wrap><Tag color={typeMeta[item.type].color}>{typeMeta[item.type].label}</Tag><Text strong>{item.title}</Text></Space>}
      />
    </List.Item>
  );

  return (
    <div className="my-calendar-screen">
      <div className="screen-heading-row">
        <div>
          <Text className="screen-eyebrow">LỊCH NGHIỆP VỤ</Text>
          <Title level={1}>Lịch</Title>
          <Text type="secondary">Lịch đánh giá được phân công và các hạn công việc liên quan.</Text>
        </div>
        <Space>
          <Segmented
            onChange={(value) => setView(value as "month" | "agenda")}
            options={[{ label: "Tháng", value: "month" }, { label: "Danh sách", value: "agenda" }]}
            value={view}
          />
          <Button icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh}>Làm mới</Button>
        </Space>
      </div>

      {view === "month" ? (
        <section className="my-calendar-layout">
          <Card className="my-calendar-month-card">
            <Calendar cellRender={cellRender} onSelect={setSelectedDate} value={selectedDate} />
          </Card>
          <Card title={<Space><CalendarOutlined />Ngày {selectedDate.format("DD/MM/YYYY")}</Space>}>
            <List
              dataSource={selectedItems}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có lịch trong ngày đã chọn." /> }}
              renderItem={renderAgendaItem}
            />
          </Card>
        </section>
      ) : (
        <Card title="Danh sách lịch">
          <List
            dataSource={agendaItems}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có lịch đánh giá hoặc hạn công việc." /> }}
            pagination={agendaItems.length > 12 ? { pageSize: 12 } : false}
            renderItem={renderAgendaItem}
          />
        </Card>
      )}
    </div>
  );
}
