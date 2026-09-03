import { Button, Card, Empty, Input, Popover, Select, Skeleton, Space, Table } from "antd";
import type { InputProps, TableProps } from "antd";
import type { Key, ReactNode } from "react";

import type { SelectOption } from "./types";

export interface SearchToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  queryParam?: string;
  placeholder?: string;
  sort?: string;
  sortOptions?: SelectOption[];
  onSortChange?: (value: string) => void;
  filterControl?: ReactNode;
  actions?: ReactNode;
  searchProps?: Omit<InputProps, "value" | "onChange">;
}

export function SearchToolbar({ query, onQueryChange, queryParam = "q", placeholder = "Tìm kiếm", sort, sortOptions, onSortChange, filterControl, actions, searchProps }: SearchToolbarProps) {
  return (
    <div className="cmp-search-toolbar" data-query-param={queryParam}>
      <Input.Search
        allowClear
        aria-label={placeholder}
        className="cmp-search-toolbar__search"
        placeholder={placeholder}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        {...searchProps}
      />
      <Space wrap>
        {sortOptions ? <Select aria-label="Sắp xếp" options={sortOptions} value={sort} onChange={onSortChange} style={{ minWidth: 180 }} /> : null}
        {filterControl}
        {actions}
      </Space>
    </div>
  );
}

export interface FilterPopoverProps {
  children: ReactNode;
  appliedCount?: number;
  label?: string;
  onReset?: () => void;
}

export function FilterPopover({ children, appliedCount = 0, label = "Bộ lọc", onReset }: FilterPopoverProps) {
  const content = <div className="cmp-section-stack">{children}{onReset ? <Button onClick={onReset}>Đặt lại</Button> : null}</div>;
  return <Popover content={content} trigger="click" placement="bottomRight"><Button aria-label={`${label}, ${appliedCount} đang áp dụng`}>{label}{appliedCount ? ` (${appliedCount})` : ""}</Button></Popover>;
}

export interface EntityRowProps {
  title: ReactNode;
  description?: ReactNode;
  metadata?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  onSelect?: () => void;
}

export function EntityRow({ title, description, metadata, status, actions, onSelect }: EntityRowProps) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (onSelect && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(); }
  };
  return (
    <div className={`cmp-entity-row${onSelect ? " cmp-entity-row--interactive" : ""}`} role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined} onClick={onSelect} onKeyDown={onKeyDown}>
      <div>
        <div className="cmp-entity-row__title">{title}</div>
        {description ? <div className="cmp-entity-row__description">{description}</div> : null}
        {metadata ? <div className="cmp-inline-stack">{metadata}</div> : null}
      </div>
      {status || actions ? <div className="cmp-inline-stack" onClick={(event) => event.stopPropagation()}>{status}{actions}</div> : null}
    </div>
  );
}

export interface EntityListProps<T> {
  items: T[];
  itemKey: (item: T) => Key;
  renderItem: (item: T) => ReactNode;
  empty?: ReactNode;
  ariaLabel?: string;
}

export function EntityList<T>({ items, itemKey, renderItem, empty, ariaLabel = "Danh sách thực thể" }: EntityListProps<T>) {
  if (items.length === 0) return <>{empty ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}</>;
  return <div className="cmp-entity-list" role="list" aria-label={ariaLabel}>{items.map((item) => <div role="listitem" key={itemKey(item)}>{renderItem(item)}</div>)}</div>;
}

export interface ResponsiveCardField { key: string; label: ReactNode; value: ReactNode; }
export interface ResponsiveCardItem { key: Key; title: ReactNode; fields: ResponsiveCardField[]; status?: ReactNode; actions?: ReactNode; }

export function ResponsiveCardList({ items, empty }: { items: ResponsiveCardItem[]; empty?: ReactNode }) {
  if (items.length === 0) return <div className="cmp-responsive-card-list">{empty ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}</div>;
  return (
    <div className="cmp-responsive-card-list" data-responsive-fallback="card-list">
      {items.map((item) => (
        <Card key={item.key} className="cmp-responsive-card" size="small" title={item.title} extra={item.status}>
          <Space orientation="vertical" size={8} style={{ width: "100%" }}>
            {item.fields.map((field) => <div className="cmp-responsive-card__field" key={field.key}><span className="cmp-responsive-card__label">{field.label}</span><span>{field.value}</span></div>)}
            {item.actions ? <div className="cmp-inline-stack">{item.actions}</div> : null}
          </Space>
        </Card>
      ))}
    </div>
  );
}

export interface DataTableProps<T extends object> extends TableProps<T> {
  responsiveCards?: ResponsiveCardItem[];
  responsiveEmpty?: ReactNode;
  rowKey: TableProps<T>["rowKey"];
}

export function DataTable<T extends object>({ responsiveCards, responsiveEmpty, ...tableProps }: DataTableProps<T>) {
  return (
    <>
      <div className={responsiveCards ? "cmp-data-table--responsive" : undefined} data-desktop-grid="antd-table"><Table<T> size="middle" pagination={{ showSizeChanger: true, ...tableProps.pagination }} {...tableProps} /></div>
      {responsiveCards ? <ResponsiveCardList items={responsiveCards} empty={responsiveEmpty} /> : null}
    </>
  );
}

export function LoadingSkeleton({ variant = "page", rows = 4 }: { variant?: "page" | "list" | "detail"; rows?: number }) {
  return <div aria-busy="true" aria-label="Đang tải" data-skeleton-variant={variant}><Skeleton active title={variant !== "list"} paragraph={{ rows }} /></div>;
}
