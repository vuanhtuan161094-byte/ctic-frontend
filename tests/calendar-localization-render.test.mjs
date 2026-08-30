import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Calendar, ConfigProvider } from "antd";
import viVNModule from "antd/locale/vi_VN.js";
import dayjs from "dayjs";
import "dayjs/locale/vi.js";

const viVN = viVNModule.default;
dayjs.locale("vi");

test("Ant Calendar renders Vietnamese Monday-first weekday headers", () => {
  const markup = renderToStaticMarkup(
    React.createElement(
      ConfigProvider,
      { locale: viVN },
      React.createElement(Calendar, {
        locale: viVN.Calendar,
        value: dayjs("2027-05-01"),
      }),
    ),
  );
  const header = markup.slice(markup.indexOf("<thead"), markup.indexOf("</thead>") + 8);

  assert.match(header, /<th>T2<\/th><th>T3<\/th><th>T4<\/th><th>T5<\/th><th>T6<\/th><th>T7<\/th><th>CN<\/th>/);
  assert.doesNotMatch(header, /<th>(Su|Mo|Tu|We|Th|Fr|Sa)<\/th>/);
});
