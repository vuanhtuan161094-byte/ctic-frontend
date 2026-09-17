# UX-V1 — Configuration Visual Direction Gate

Status: **READY FOR PRODUCT OWNER REVIEW**  
Date: **2026-09-17**  
Branch: `feature/ux-fix-batch01`  
Entering frontend canonical: `dac0bc3e6d50a36dee7fa3fa34dae6d3085c50b1` (UX-I3 PASS / LOCKED)  
Production implementation: **NOT STARTED**

## 1. Purpose

This is the visual-direction gate between UX-I3 and UX-I4.

The objective is not to redesign all CMP screens. One sufficiently complex reference screen is used to decide the visual language before reusable components are standardized.

Primary reference screen:

**Configuration — Chương trình & tiêu chuẩn**

Secondary sanity-check screen after approval:

**Certification Case Overview**

UX-I4 must not start until the Product Owner approves the primary visual direction.

## 2. Why this screen is the reference

The current Configuration surface contains enough enterprise interaction patterns to test the future CMP design language:

- page identity and hierarchy;
- configuration navigation context;
- summary/readiness state;
- master-data list selection;
- program status;
- certification-rule versioning;
- standard families and editions;
- effective/withdrawal dates;
- primary and destructive actions;
- empty/error/loading states;
- modal/form entry;
- desktop and mobile behavior.

Current business capabilities are preserved. The mockup changes presentation and information architecture only.

## 3. Existing business content that the mockup must preserve

Canonical route family:

- Configuration / Chương trình & tiêu chuẩn

Existing program examples:

- QMS — Hệ thống quản lý chất lượng
- EMS — Hệ thống quản lý môi trường
- OHSMS — Hệ thống quản lý an toàn và sức khỏe nghề nghiệp

Existing states:

- Đang sử dụng / Ngừng sử dụng
- Sẵn sàng / Cần thiết lập
- Đang áp dụng
- Chờ hiệu lực
- Ngừng áp dụng

Existing actions:

- Thêm chương trình
- Sửa chương trình
- Ngừng / đưa chương trình vào sử dụng
- Thêm tiêu chuẩn
- Thêm phiên bản tiêu chuẩn
- Sửa / ngừng / khôi phục / xóa phiên bản khi allowed
- Thiết lập / tạo phiên bản mới của quy tắc chứng nhận

Existing certification-rule information:

- version number;
- effective date;
- certification cycle duration;
- surveillance frequency;
- Stage 1 applicability;
- certificate validity duration;
- renewal window;
- reminder lead time;
- required audit types;
- required decision types.

No mockup may invent a new backend authority or lifecycle.

## 4. Proposed visual direction

### 4.1 Overall character

Target character:

- modern B2B SaaS;
- calm and precise rather than decorative;
- high information density without appearing crowded;
- strong page hierarchy;
- limited use of borders;
- status colors used semantically, not as decoration;
- neutral white/very-light surfaces with brand blue reserved for active navigation and primary actions;
- visually suitable for certification bodies other than CTIC.

Avoid:

- consumer/dashboard-gadget styling;
- large gradients;
- excessive card nesting;
- oversized hero headers;
- decorative illustrations on operational screens;
- CTIC-specific branding;
- exposing internal form codes such as P.09.

### 4.2 Desktop composition — 1440×900 reference

Use the existing application shell, then structure the content as a focused configuration workspace.

#### A. Page header

Top line:

`Cấu hình hệ thống / Chương trình & tiêu chuẩn`

Primary title:

`Chương trình & tiêu chuẩn`

Description:

`Quản lý chương trình chứng nhận, tiêu chuẩn áp dụng và các phiên bản quy tắc vận hành.`

Right-side primary action:

`+ Thêm chương trình`

Secondary actions should not compete with the primary action.

#### B. Compact configuration summary

One low-height summary strip below the header, not four oversized dashboard cards.

Suggested metrics:

- `3 chương trình`
- `3 sẵn sàng`
- `5 tiêu chuẩn đang áp dụng`
- `1 thay đổi chờ hiệu lực`

These are context indicators, not business KPIs.

#### C. Main split workspace

Desktop target: approximately `300–340px` left rail + flexible detail area.

**Left — Program navigator**

Contains:

- search field `Tìm chương trình`;
- optional compact state filter;
- QMS / EMS / OHSMS rows;
- program name;
- status/readiness indicator;
- active selection using a restrained brand-tinted surface and left accent;
- no heavy card around each row.

Example selected row:

`QMS`
`Hệ thống quản lý chất lượng`
`Sẵn sàng`

This rail replaces the current visual repetition of multiple large program cards.

**Right — Selected program workspace**

The selected program is the working context.

Top identity row:

- `QMS`
- `Hệ thống quản lý chất lượng`
- `Đang sử dụng`
- `Sẵn sàng`
- overflow menu `•••`

Then two clear sections.

### 4.3 Section 1 — Quy tắc chứng nhận

Use one compact operational panel rather than a large generic card.

Header:

`Quy tắc chứng nhận`

Current version summary:

`v1 · Đang áp dụng từ 01/01/2026`

Display key values in a clean definition grid:

- Chu kỳ: `36 tháng`
- Giám sát: `12 tháng/lần`
- Giai đoạn 1: `Áp dụng`
- Hiệu lực chứng chỉ: `36 tháng`
- Cửa sổ tái chứng nhận: `90 ngày`
- Nhắc trước: `60 ngày`

Show next scheduled version as a quiet inline notice when applicable:

`v2 sẽ áp dụng từ 01/01/2027`

Right-side action:

`Tạo phiên bản mới`

Do not expose every rule field simultaneously if it harms scanning; detailed audit/decision requirements can appear under an expandable `Xem cấu hình đầy đủ` area or the edit modal.

### 4.4 Section 2 — Tiêu chuẩn áp dụng

Header:

`Tiêu chuẩn áp dụng`

Right action:

`+ Thêm tiêu chuẩn`

Preferred desktop representation: structured list/table hybrid.

Columns / information hierarchy:

- Tiêu chuẩn
- Phiên bản
- Trạng thái
- Hiệu lực
- Thao tác

Example:

`ISO 9001 — Hệ thống quản lý chất lượng | 2015 | Đang áp dụng | 15/09/2015 — | •••`

If a standard family has several editions, editions stay visually grouped under the same standard family instead of appearing as unrelated rows.

Use semantic badges from the governed design system:

- positive: Đang áp dụng
- info/attention as appropriate: Chờ hiệu lực
- inactive: Ngừng áp dụng

Destructive actions remain inside the overflow menu and require confirmation.

## 5. Readiness and incomplete setup

A program needing setup should not turn the whole card orange.

Preferred pattern:

- status badge `Cần thiết lập` near program identity;
- concise inline blocker panel at the top of the selected-program workspace;
- blocker explains exactly what is missing;
- direct contextual action, e.g. `Thêm tiêu chuẩn` or `Thiết lập quy tắc`.

Ready programs should not show a large green success panel. A compact `Sẵn sàng` badge is enough.

## 6. Interaction model

Selection of a program should update the detail workspace without losing the surrounding Configuration context.

Primary creation flows remain modal/drawer based where appropriate:

- add/edit program;
- add/edit standard edition;
- create new certification-rule version.

Operational browsing remains on the page; forms should not dominate the default screen.

Keyboard focus, labels and WCAG AA contrast remain mandatory.

## 7. Responsive direction

### Desktop ≥1024

Split workspace: program navigator + detail.

### Tablet

Navigator may reduce width; detail remains primary.

### Mobile ≤768

Do not squeeze the two columns.

Transform the program navigator into:

- a compact program selector/search surface at the top;
- selected program details below;
- sections stack vertically;
- standard rows become responsive cards if the existing shared responsive-table pattern is appropriate;
- primary action remains easy to reach;
- no horizontal overflow.

Mobile is a functional enterprise layout, not a separate simplified product.

## 8. Visual tokens and component implications

The reference must consume the locked UX-I2/UX-I3 design language:

- governed `--cmp-*` colors;
- typography scale;
- spacing scale;
- radius/elevation;
- semantic status tones;
- existing neutral branding model.

This mockup is expected to inform UX-I4 components such as:

- canonical PageHeader;
- configuration workspace shell;
- master-data navigator/list row;
- compact summary strip;
- SectionHeader;
- status/readiness badges;
- definition/value grid;
- data-list/table frame;
- contextual blocker;
- action menu;
- form section.

UX-I4 should extract components from the approved reference rather than inventing a component catalog independently.

## 9. Visual acceptance criteria

The Product Owner review should answer:

1. Does the product look modern and commercially credible?
2. Is the information hierarchy immediately understandable?
3. Is the screen dense enough for professional users without feeling cluttered?
4. Is the selected program context obvious?
5. Are readiness and status understandable without excessive color?
6. Do primary actions stand out while destructive actions remain secondary?
7. Can the same visual language plausibly work on Case Overview?

Approval should concern visual direction, not pixel-perfect implementation details.

## 10. Scope boundary

This gate does **not** authorize:

- production implementation of the mockup;
- UX-I4 component refactor;
- CFG-2 redesign;
- backend changes;
- database/schema changes;
- route changes;
- ProComponents adoption;
- broad Configuration rewrite.

The next step after Product Owner approval is a lightweight Case Overview sanity-check, then UX-I4.

## 11. Decision state

Current state:

**READY FOR PRODUCT OWNER VISUAL REVIEW**

UX-I4 remains unstarted.
CFG-2 remains unstarted.
CFG-3 remains unstarted.
Step18B remains unstarted.
