import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tasksSource = await readFile(
  new URL("../app/components/MyTasksScreen.tsx", import.meta.url),
  "utf8",
);
const shellSource = await readFile(
  new URL("../app/components/DashboardShell.tsx", import.meta.url),
  "utf8",
);

test("My Work consumes durable work items once and opens their exact destination", () => {
  assert.match(tasksSource, /new URLSearchParams/);
  assert.match(tasksSource, /params\.set\("search", debouncedSearch\)/);
  assert.match(tasksSource, /params\.set\("work_type", groupFilter\)/);
  assert.match(tasksSource, /params\.set\("due", timeFilter\)/);
  assert.match(tasksSource, /pagination\?\.total/);
  assert.doesNotMatch(tasksSource, /\/notifications\/me\/tasks/);
  assert.match(tasksSource, /destination_path/);
  assert.match(tasksSource, /can_execute/);
  assert.match(tasksSource, /is_overdue/);

  assert.match(shellSource, /\/me\/workspace/);
  assert.doesNotMatch(shellSource, /\/notifications\/me\/tasks/);
});
