# CMP — CODEX EXECUTION PACKET: UI/UX V2 + CALENDAR P0 + 20 KHÁCH HÀNG / 3 NĂM
**Ngày:** 2026-10-18 | **Loại:** Kế hoạch triển khai có thể thi hành, không phải báo cáo tổng quan.
**Chủ sở hữu sản phẩm:** Người dùng CMP. **Người thực thi:** Codex trên môi trường có Git, Node.js, Playwright, SQL Server test được cô lập và trình duyệt thực.
**Yêu cầu người dùng:** Tự đọc, tự triển khai, tự kiểm thử, tự sửa, tự commit/push; người dùng chỉ nghiệm thu bằng giao diện ở BƯỚC CUỐI CÙNG. Không yêu cầu họ thử tay từng tính năng.
**Phạm vi:** frontend vuanhtuan161094-byte/ctic-frontend + backend vuanhtuan161094-byte/ctic-backend, branch feature/ux-fix-batch01. Không merge main. Lấy HEAD live trước khi làm, không cố định SHA cũ.
**Trạng thái khi phát hành packet:** KẾ HOẠCH SẴN SÀNG; các hạng mục trong packet CHƯA ĐƯỢC XEM LÀ ĐÃ CODE/PASS. Dashboard CSS pilot frontend commit 66102ab tồn tại, chưa có browser acceptance; không nhầm với hoàn thành UX V2.

## 0. ĐIỀU KIỆN VÀ NGUYÊN TẮC BẤT DI BẤT DỊCH

1. ĐỌC docs/handoffs/CMP_NEXT_CHAT_HANDOFF_2026-10-18.md, AI_context.md trong backend, frontend docs/ux/UX-I2_DESIGN_LANGUAGE.md, UX-I3_STORYBOOK_FOUNDATION.md, UX-V1_CONFIGURATION_VISUAL_DIRECTION.md, phần mới nhất của hai nhánh và AGENTS.md nếu có.
2. Quyết định mới ngày 18/10 của PO mở quyền đánh giá và cải tiến UX ở mức toàn hệ thống; nó thay thế giới hạn “chỉ sửa rất nhỏ” ở checkpoint UX-V1 cho gói này, NHƯNG không xóa các nguyên tắc nghiệp vụ đã khóa. Chỉ giữ React 19 + Ant Design 6 + thiết kế tokens --cmp-*, white-label theo cấu hình. Không dựng design system thứ hai, không tự thêm thư viện khổng lồ hay đổi kiến trúc.
3. Không thay đổi business authority: SoD, RBAC, hợp đồng, man-day, phê duyệt, application review, competency approval, NC/CAP, technical review, decision, certificate issue/QR và workflow transitions vẫn thuộc backend. UI không được giả trạng thái hay bỏ qua prerequisite.
4. BẢO TOÀN mọi dữ liệu thật và làm dở: không reset/clean/stash cưỡng bức, không migration tùy tiện, không xóa untracked, upload, dist/log có thể cần tra cứu, backup, .env, database, credentials. Không force-push. Sync chỉ fast-forward khi worktree cho phép.
5. User không chạy test lắt nhắt. Codex tự làm focused tests rồi một lượt browser acceptance gộp khi đã sửa xong; nếu thiếu Windows/browser/SQL runner, báo PENDING đúng phần đó và không tự nhận PASS.
6. BỘ DỮ LIỆU GIẢ LẬP phải có nhãn DEMO/SANDBOX. CẤM seeding tự động vào database đang vận hành thật hoặc qua nút CMP_ONE_CLICK.cmd bình thường. Tài khoản DEMO có mật khẩu an toàn, không commit mật khẩu/PII thật, không gửi email thật.
7. Không tự merge main; không auto-trigger FULL UAT/CI. Thực thi theo trình tự P0 -> UX -> DEMO DATA -> integrated acceptance rồi mới bàn giao chủ sở hữu. Nếu cần kiểm thử liên quan đến vận hành, làm trên cơ sở dữ liệu riêng.
8. Mỗi hạng mục phải có: source diff, test có ý nghĩa, ảnh before/after khi liên quan visual, ghi chú “verified by runtime” hoặc “pending”; không tính số dòng code/tài liệu là tiến độ.

## 1. HIỆN TRẠNG CÓ BẰNG CHỨNG (ẢNH NGƯỜI DÙNG + SOURCE)

### 1.1 Bằng chứng giao diện người dùng ngày 18/10/2026
- Tổng quan vận hành: 5 KPI card lớn, độ ưu tiên phân tán; bảng nội dung nhiều khoảng trắng khi ít dữ liệu.
- Công việc: modal lịch sử dùng bảng thông tin dài, trạng thái thao tác bị chặn chưa đủ thân thiện; bảng còn không gian lãng phí.
- Lịch cá nhân: tháng rộng, ô ngày lớn nhưng dữ liệu thưa.
- Khách hàng: form “Thêm khách hàng” nhóm trường tạm ổn nhưng phẳng về hierarchy; danh sách nghèo thông tin khi chỉ có một tổ chức.
- Lịch & nguồn lực: một ô có hai số ngày! Ví dụ đầu tháng 10 có ngày ở đầu ô và số ngày khác/lặp dưới trong cùng ô; lưới chiếm gần trọn viewport dù hiển thị 0 đợt đánh giá. Legend/filters/toolbar chưa tổ chức tốt. Sidebar bị cắt tên mục.
- Ảnh này là BẰNG CHỨNG LỖI, không phải thiết kế được PO chấp nhận. Không kết luận "UI đã PASS" chỉ vì unit tests hiện hành chạy được.

### 1.2 Root cause P0 được chứng minh bằng code
- File frontend app/components/ScheduleResourcesScreen.tsx, hàm renderAuditCalendar gần phần Calendar cellRender.
- Callback cellRender cho info.type = date đang TRẢ VỀ resource-calendar-cell và RENDER info.originNode thêm một lần bên trong cell.
- Ant Design Calendar đã render phần số ngày ở wrapper ngoài; info.originNode thêm vào custom content làm xuất hiện số ngày thứ hai.
- CSS app/globals.css vùng .resource-month-calendar, .ant-picker-calendar-date-content, .resource-calendar-cell: đang dùng nội dung auto height/min-height; layout thực tế vẫn tạo ô ngày và hàng rất cao khi không có sự kiện.
- Test hiện tại e2e/specs/schedule-calendar-layout.spec.mjs chỉ kiểm tra emptyDateContentHeight < 60 và event +N; không assert toàn bộ DOM rằng mỗi ô chỉ có ĐÚNG MỘT số ngày.
- Tách hai lỗi độc lập: duplicate DOM date phải FIX TSX; mật độ/chiều cao phải FIX layout+CSS và browser-verify. Không vá duplicate bằng display:none tùy tiện.

### 1.3 Các file authority cần rà
- Frontend: app/components/ScheduleResourcesScreen.tsx (~3.7k lines), MyCalendarScreen.tsx, PersonalDashboardScreen.tsx, DashboardShell.tsx, CustomersScreen.tsx, MyTasksScreen.tsx, CustomerPortalDashboardScreen.tsx, CustomerPortalAccountModal.tsx; app/globals.css; design-system/tokens.css, theme.ts, runtime-overrides.css.
- Frontend quality: e2e/specs/schedule-calendar-layout.spec.mjs; e2e/README.md; e2e/playwright.config.mjs; tests/calendar-localization-render.test.mjs; tests/canonical-plan-workspace-calendar.test.mjs; tests/personal-workspace-calendar.test.mjs và các layout specs module tương ứng.
- Backend: prisma/schema.prisma, prisma/seed.js (hiện chỉ seed permissions/roles), src/customers/customers.service.ts, src/customer-portal/, src/audit-plans/, src/audit-programs/, src/experts/, src/dashboard/, các module review/decision/certificates và runtime RBAC.
- Kiểm tra cả frontend HEAD live, backend HEAD live, Git status/cấu hình máy riêng trước khi thay đổi.

## 2. P0 — SỬA TRIỆT ĐỂ LỊCH & NGUỒN LỰC (LÀM ĐẦU TIÊN)

### P0.1 Chuẩn hóa duy nhất một ngày trong một ô
1. Không render info.originNode trong phần custom event của cellRender cho info.type === "date"; để Calendar xử lý date header mặc định. Nhánh month/year khác phải giữ đúng render gốc khi cần.
2. Đảm bảo chuỗi ngày trong ô không lặp do wrapper/ant-picker-calendar-date-value, cả ngày đầu/cuối tháng, ngày thuộc tháng bên cạnh, năm nhuận, locale vi (T2..CN).
3. Nếu AntD version hiện tại yêu cầu API khác, dùng documented render contract; không phụ thuộc selector CSS để giấu số thứ hai. Kiểm tra month mode và year mode tách biệt.
4. Giữ event item click onOpenProject(plan.project_id, dossierKeyForAuditPlan(plan)); không đổi định danh hồ sơ/chu kỳ, không ảnh hưởng khả năng mở hồ sơ.

### P0.2 Làm lịch nhỏ, rõ, thực dụng
1. Trang mặc định hiển thị toolbar gọn trên một hàng desktop: tháng hiện tại, tháng trước/sau, Hôm nay, chuyển Tháng/Năm, bộ lọc (khách hàng, loại audit, trạng thái, kỳ). Không để chú thích chiếm chiều ngang áp đảo; đưa legend xuống dòng ngắn riêng hay popover chú giải.
2. Lưới 7 cột T2..CN. Khi 0 event, ngày thường có chiều cao mục tiêu khoảng 48–64px tùy viewport; tháng 5/6 tuần vẫn có thể nhìn thấy phần lớn trong 1366x768 ở 100% zoom. Tránh ép toàn bộ 7 cột tràn 900px ở mobile; mobile ưu tiên danh sách theo tuần/ngày, có nút đổi sang tháng nếu thật sự phù hợp.
3. Một ngày nhiều audit: hiển thị 1 sự kiện có ngữ cảnh + nút “+N đợt khác”, mở popover/list không clipping; hover/focus rõ ràng; bấm sự kiện mở đúng hồ sơ, không chỉ highlight ô.
4. Trạng thái phải phân biệt có nhãn và màu: draft/planned/in_progress/completed/cancelled theo actual source semantics. Đừng sửa business status data để vừa UI.
5. Tháng không có đợt đánh giá: lời giải thích “Chưa có đợt đánh giá trong tháng ...” + đề xuất lọc/chuyển tháng; không chiếm 700px chỉ để thể hiện trắng. Không lấy dữ liệu giả/hardcode để che empty state.
6. Responsive: 1440x900, 1366x768, 1024x768, 768x1024, 390x844; không có horizontal page overflow; keyboard accessible, focus-visible; 200% zoom và reduced-motion không mất thao tác.
7. Giữ giao diện báo tải dữ liệu/lỗi/empty được phân biệt. Nếu một API lỗi không render thành “0 đợt” như có thật.
8. Sidebar: tối ưu density, tránh text bị cắt mơ hồ; cung cấp tooltip tên đầy đủ, collapse/expand phù hợp, không thay quyền/menu route. Tách phần nền cấp 2 khỏi vùng tối đặc quá nặng nếu cần.

### P0.3 Test tái phát KHÔNG ĐƯỢC BỎ
1. Sửa e2e/specs/schedule-calendar-layout.spec.mjs. Trên fixture dữ liệu rỗng và có nhiều event, inspect từng calendar date cell: chính xác một date label nhìn thấy/accessible; custom .resource-calendar-cell KHÔNG chứa bản sao .ant-picker-calendar-date-value hay originNode.
2. Bắt trực tiếp tháng 10/2026 tại viewport 1366x768: screenshot, kiểm tra date 01, 18, 31 trong ô tương ứng, không lặp; kiểm tra đúng thứ đầu tuần và adjacent-month opacity.
3. Test 2024-02 (leap), 2025-02 (non-leap), 2026-10 (5 tuần), tháng 6 tuần; chuyển tháng/năm, Hôm nay, trạng thái lựa chọn giữ đúng.
4. Test 0, 1, 6, >10 đợt cùng ngày; test spanning start/end across months; one business event with duplicate versions phải dedupe như code hiện hành; draft/completed không biến mất sai.
5. Kiểm tra chi phí DOM/cell: không filter toàn bộ plans 42 lần không cần thiết nếu data tăng; pre-index by YYYY-MM-DD bằng useMemo cho calendarMonth rồi render lookup O(1) mỗi date.
6. Test 1366x768 không phải scroll quá một viewport chỉ vì lưới 0 events (ngưỡng thị giác đánh giá theo screenshot); test 390x844 không có horizontal page scrolling; panel popover không ra ngoài viewport.
7. Chặn console/pageerror, HTTP 5xx, overflow, axe serious/critical cho các màn đã tác động. Chụp before/after có tên, viewport, commit SHA. KHÔNG tuyên bố browser PASS khi chỉ có source regex test.

### P0.4 Gate
- Gate P0 PASS khi date duplication = 0 bằng DOM + screenshot, density có bằng chứng, sự kiện điều hướng đúng, filters/range đúng, mobile và desktop không vỡ.
- Nếu P0 FAIL, sửa trước khi chuyển sang UX diện rộng.

## 3. UX V2 — HƯỚNG THIẾT KẾ VÀ MODULE THỰC THI

### 3.1 Mục tiêu trải nghiệm
CMP là B2B SaaS cho tổ chức chứng nhận: tập trung “đối tượng nào, ở trạng thái nào, ai cần làm gì, hạn khi nào, bước tiếp theo là gì”.
Tính chuyên nghiệp = dễ tìm, dễ so sánh, rõ trách nhiệm và trạng thái, hành động được dẫn đường. Không dùng dashboard kiểu decoration, cards lồng cards, gradient lớn, icon vô nghĩa, màu xanh phủ kín hoặc placeholder tràn trang.
- Hệ thống màu: neutral canvas sáng, surface trắng, primary theo brand runtime, sắc thái semantic chỉ dùng cho status/attention. Không hardcode CTIC ở component.
- Typography: 13–14px body thông tin phụ, 14–16px nội dung ưu tiên, tiêu đề 22–26px; dùng tokens và contrast AA; không “chữ nhạt” khó đọc.
- Spacing: grid 4/8px theo tokens; giảm khoảng trắng bị động trong bảng/lịch/empty page; bề mặt rõ ràng nhưng không quá nhiều viền.
- Information architecture: một heading chính, hàng filter/action gọn, một hành động primary, status và thời hạn không giấu, quick navigation đến hồ sơ nguồn.
- Mobile: thiết kế chức năng thay vì cố nén bảng desktop; vẫn đầy đủ hành động được cấp quyền. Desktop 1366x768 là nghiệm thu chính.

### 3.2 Tham khảo GitHub skills (đọc trước, chọn lọc)
- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill — pattern UI/UX research, typography/spacing/visual hierarchy; kiểm tra LICENSE, version và các yêu cầu công cụ khi mở repo.
- https://github.com/anthropics/skills/tree/main/skills/frontend-design — định hướng chất lượng frontend. Chỉ tham khảo được phép, không copy mã trái phép hay chạy installer/binary không xác minh.
- Kiểm tra thực tế component API Ant Design 6, React 19, Playwright hiện đã có; reuse hệ thống trong app/components/design-system. Không bổ sung UI framework cạnh tranh Ant Design.
- Khuyến nghị lập visual rubric riêng từ 4 ảnh baseline người dùng và tài liệu sản phẩm, không chạy “skill” một cách máy móc.

### 3.3 Thứ tự module
**UX-A App Shell/Sidebar**
- Thu hẹp/chuyển đổi sidebar hợp lý ở desktop, menu hierarchical dễ nhận biết, mỗi item có tên đầy đủ qua tooltip/truncation an toàn; hiển thị active location rõ nhưng không chói. Top header/search/profile không chiếm height thừa.
- Khách hàng/portal và nội bộ tách label theo role, giữ quyền white-label.

**UX-B Dashboard**
- Dashboard tổng quan đóng vai trò control tower: công việc ưu tiên (người chịu trách nhiệm/hạn/trạng thái), audit sắp tới, cảnh báo quá hạn, hồ sơ cần review, hành động nhanh theo quyền.
- Khi ít dữ liệu, compact empty state; khi nhiều dữ liệu, ưu tiên bảng/liệt kê đúng; KPI không được 5 khung khổng lồ. Sửa pilot CSS commit 66102ab nếu cần; không coi pilot là PASS nếu thiếu ảnh runtime.
- Số liệu lấy từ /me/workspace; không rebuild RBAC/work scope ở frontend.

**UX-C Công việc / Lịch cá nhân**
- Công việc: bộ lọc trạng thái/hạn/ưu tiên/vai trò nhất quán, row density vừa đủ, click dẫn đúng, trạng thái read-only và reason hợp lý, modal detail không chiếm 80% không gian bằng các row label trống.
- Lịch cá nhân: cần nhất quán với Schedule Resources về grid, locale, ngày và empty state; vẫn phân biệt lịch phân công cá nhân với lịch toàn tổ chức.

**UX-D Khách hàng / ứng dụng / hồ sơ**
- Khách hàng: bảng có mã, pháp nhân, chương trình/tiêu chuẩn, trạng thái, gần cập nhật, người liên hệ; form chia 2–3 nhóm rõ với validation inline, footer luôn nhìn thấy.
- Hồ sơ/đơn đăng ký: timeline status theo vòng đời chứng nhận, next action hợp quyền, blockers/required evidence hiển thị chính xác, không thêm nút ghi đè statuses.
- Đánh giá, NC/CAP, technical review/decision/certificate: tối ưu screen density và progression dựa vào bước nghiệp vụ, không vượt qua SoD.
- Portal khách hàng: nhất quán design language nhưng không hiển thị thông tin nội bộ, price/internal control hoặc trạng thái không được phép.

### 3.4 Visual system gate
- So sánh ảnh thực trước/sau với cùng dữ liệu fixture, cùng viewport, zoom 100% tại 1366x768 và 1440x900; bổ sung 390x844 cho responsive.
- Tối thiểu 8 luồng màn hình: Dashboard, My Work, My Calendar, Schedule Resources, Customers list/form, Application detail, Certification dossier, Technical Review/CAP.
- Bảo đảm không clip button chính, không modal dài vô hạn, không text cắt mất ý nghĩa, không chế UI giả nếu backend trả 403/empty.
- Không thay style tất cả module chỉ vì thuận tiện; ưu tiên các màn có ảnh evidence, nâng cấp shared component khi thật sự giảm trùng lặp.

## 4. DEMO DATA V2 — 20 KHÁCH HÀNG, 3 NĂM (CẦN LÀM RIÊNG, AN TOÀN)

### 4.1 Mục tiêu và phạm vi thời gian
- Timeline lịch sử mô phỏng: 2024-01-01 đến 2026-10-18. Không tạo sự kiện sau thời điểm hiện tại như đã diễn ra; các lịch sắp tới trong cuối 2026 có nhãn planned.
- 20 khách hàng hư cấu, nhiều ngành (ép nhựa, cơ khí, điện tử, dệt may, thực phẩm, logistics, xây dựng, môi trường, dịch vụ, giáo dục...); quy mô 30–2000 người, một/nhiều site; ISO 9001, 14001, 45001 và IMS nếu cấu hình hiện có thực sự hỗ trợ.
- 2–4 dòng dữ liệu nghiệp vụ khác nhau mỗi khách hàng để test list, related records, filter, search, permission; TỐI THIỂU 20 tổ chức, mục tiêu 30–50 đơn/dự án các trạng thái hợp lệ (không ép đủ nếu workflow không hỗ trợ).
- Lịch sử 3 năm có giai đoạn initial Stage1/Stage2, GS1, GS2, tùy tổ chức recertification. Tránh áp một chu kỳ chung lên tất cả khách hàng; lấy scheme config/approval authority hiện hành.
- Xây dựng ma trận trạng thái: 20% hồ sơ khởi tạo, 20% chờ kiểm tra/hợp đồng, 20% đang audit, 15% NC/CAP, 15% review/decision, 10% có chứng chỉ hợp lệ **chỉ khi có workflow thực tạo được**. Đây là mục tiêu phân bố, không là lệnh ghi status cưỡng bức.

### 4.2 Tài khoản, vai trò, phân quyền
- Tài khoản nội bộ DEMO: Admin, Sales, Staff, Coordinator, Lead Auditor, Auditor, Technical Expert, Technical Reviewer, Decision Maker; có thể thêm Expert/Training nếu schema cho phép.
- Mỗi khách hàng có 1 tài khoản portal hư cấu trong domain example.invalid, chỉ có CUSTOMER role và customer_user_access của tổ chức đó. Tạo riêng các persona thử denied/foreign-owner access.
- Credentials: tài khoản demo có mật khẩu sinh ngẫu nhiên từng lần kích hoạt sandbox, băm bcrypt đúng version; nếu cần tái chạy giữ hash/định danh thay vì phát sinh mật khẩu mới; ghi xuất thông tin đăng nhập demo vào file cục bộ có quyền truy cập hạn chế, bị gitignore, TUYỆT ĐỐI không commit secret hay sử dụng mật khẩu mặc định chung.
- Không lạm dụng admin để thay hành động role chuyên trách; technical reviewer khác decision maker, không tự phê duyệt hồ sơ chính mình; không gán role/customer access chéo.
- Phân quyền test: admin, sales, coordinator, lead, auditor, technical reviewer, decision maker, customer A và customer B (test isolation).

### 4.3 Schema authority và ràng buộc
Schema backend hiện có các model customers, users, roles, user_roles, customer_user_access, contacts, certification_applications, certification_projects, contracts, audit_programs, audit_program_events, audit_plans, experts, audit_findings, corrective_actions, technical_reviews, certification_decisions, certificates, work_items và các bảng phụ. Không thêm model mới khi chưa thực sự cần.
- prisma/seed.js hiện chỉ đồng bộ permission/role; KHÔNG trộn bulk demo data vào seed mặc định đang dùng vận hành.
- Bắt buộc duy trì unique customer_code, application_code, project_code, plan_code, program_code, username, email; FK customer_id/application_id/project_id, project/plan/event relationship; status/approval/sequence relation.
- Không backdate audit_logs / fake actor signatures / change certificate issue_date như một hành động chính thức. Đối với dữ liệu lịch sử muốn hiển thị, tạo record bằng API/service hợp lệ hoặc demo fixture được đánh dấu mô phỏng và tách DB. Tên pháp nhân và tax ID không được giả giống mã số thuế thực; tax_code optional có thể null.
- Dùng customer codes DEMO-CMP-001...020 (kiểm tra độ dài DB NVarChar(20)); tên “Công ty Mẫu CMP 01 ...”, email @example.invalid, số điện thoại giả hoặc rỗng, không đụng dữ liệu thật.

### 4.4 Kiến trúc seed tool bắt buộc
1. Script riêng dưới backend/scripts/demo/ ví dụ cmp-demo-seed.cjs + README trong cùng thư mục. Bật chỉ bằng lệnh thủ công có cờ --apply --env-file...; mặc định --dry-run. KHÔNG chạy từ CMP_ONE_CLICK.cmd và không gắn vào npm lifecycle tự động.
2. Guard DB: yêu cầu cả CMP_DEMO_SEED=YES và env chỉ rõ database sandbox (vd CTIC_CMP_DEMO_2026), denylist CTIC_Certification, tên chứa production/prod, tên trống; kiểm tra DB name/host từ kết nối thật, không tin chỉ tên env. Hiển thị ước tính số records trước thao tác.
3. Không tự tạo hay migrate database thật. Tách database mới sau khi người thực thi xác nhận bằng công cụ đọc metadata rằng sandbox sẵn; backup/snapshot bắt buộc nếu DB sandbox đã có dữ liệu; không chạy DDL/migration không được phê duyệt.
4. Upsert deterministic theo prefix và unique key; không sửa records ngoài namespace DEMO; dry-run print counts, apply có summary, rerun 2 lần cho counts/relations y hệt (idempotent); không delete/rewrite live data để “làm đẹp”.
5. Seed theo dependency order: roles/permissions canonical -> DEMO users -> customers -> portal mapping -> contacts -> applications -> valid reviews/contracts/projects -> program/events/plans -> assignment/expert (chỉ nếu prerequisites) -> findings/CAP -> technical review/decision/certificates (chỉ nếu service workflow hợp lệ). Bất kỳ nhánh không thể đạt hợp lệ thì ghi BLOCKED BY BUSINESS PREREQUISITE, không force-create.
6. Id/time: deterministic calendar offsets theo năm, kiểm tra timezone Việt Nam, không hardcode created_at cho audit authority; giả lập historical timestamps chỉ khi được business schema cho phép và gắn demo.
7. Khả năng rollback: danh sách record thuộc demo prefix + dependency graph, lệnh --report và hướng dẫn khôi phục sandbox snapshot; không cung cấp lệnh xóa bừa dữ liệu ngoài namespace.
8. Export manifest vào test artifacts cục bộ: counts 20 customer, roles, access mappings, app/project counts theo năm, plans/event overlap, NC/CAP, reviews, certs valid/pending, skipped prerequisites. Artifact không chứa passwords, DATABASE_URL, tokens, PII thực.
9. Chỉ khi dùng SQL sandbox thành công mới chụp ảnh UI với seeded data; Playwright fixture-only được dùng song song để test nhanh nhiều trạng thái.
10. Nếu không có runner truy cập SQL sandbox, Codex vẫn xây dựng/test script tĩnh trong branch, không claim đã seed vào máy user hoặc records có thật.

### 4.5 Coverage matrix cần thực thi qua màn hình, không test từng tí bằng tay
- Customer A và B: tạo/xem/sửa, portal login, thử đọc data chéo => 403/deny.
- Application: chưa hoàn thiện -> nộp -> review/return/accept theo vai trò, có blocker đúng.
- Commercial: quotation/contract đúng lifecycle đang hỗ trợ, project liên kết.
- Project: cycle initial/GS1/GS2, F04/F05, reviewer/decision phân tách.
- Audit: schedule/tháng nhiều event, event nhiều ngày, resource availability, team conflict and overload flags; không đè planner.
- CAP: NC mở/đóng; evidence/response/review theo quyền.
- Technical review/decision: không phát hành nếu không đủ prerequisite; người phê duyệt phải độc lập.
- Certificates: chỉ được cấp có quyết định thật; thử list, detail, phiên bản/sắp hết hạn; không phát hành certificate fake.
- Dashboard, My Work, notification, archive/report UI: count thực và drill-through route.
- Empty/error/access-denied/loading paths vẫn có test fixture riêng; nhiều dữ liệu mẫu không được che bug empty states.

## 5. TỔ CHỨC THỰC HIỆN CHO CODEX (KHÔNG HỎI USER GIỮA CHỪNG)

### Vòng A: inventory + baseline (tự làm)
- Fetch HEAD hai repo, kiểm tra branch, origin, worktree/tracked WIP. Không ghi đè khác người làm.
- Chạy local typecheck/targeted browser tối thiểu để biết baseline hiện tại, chưa làm full suite.
- Đọc source, ghi root cause P0; tạo baseline screenshots và matrix. Nếu runner không có, dùng isolated fixture snapshots nhưng ghi là PENDING runtime.
- Không hỏi chủ sản phẩm cho từng panel đã có mô tả.

### Vòng B: Calendar P0 code + focused verification (tự làm)
- Trên frontend feature branch (hoặc branch con từ HEAD live để tránh collision) sửa đúng cellRender, layout, CSS, responsive; thêm regression cho duplicate day date, event range, 0/1/N data, keyboard, mobile.
- Chụp screenshot desktop 1366x768 + mobile 390x844 trước/sau; xác nhận source invariants và browser. Commit checkpoint P0 rõ ràng; không merge.

### Vòng C: UX module batches (tự làm)
- Batch 1 App Shell + Dashboard; Batch 2 My Work/My Calendar/Schedule Resources; Batch 3 Customers/Forms/Application/Project; Batch 4 Portal/reviewer/decision/CAP/certificate polish.
- Mỗi batch chỉ sửa những phần dựa trên dữ liệu/bằng chứng; dùng existing AntD token/props. Không đổi workflow và role semantics.
- Dọn visual debt theo visual rubric: density, text clipping, hierarchy, keyboard, empty/error/loading, meaningful status. Commit riêng theo batch.
- Sau mỗi batch dùng targeted component tests, static typecheck, lint touched, Playwright 1366x768 & 390x844, screens before/after; không dùng giant CSS overrides tràn lan.

### Vòng D: dữ liệu 3 năm và automation (tự làm)
- Backend seed runner riêng guarded sandbox + snapshot/manifest; không chạm dev DB CTIC_Certification mặc định. Dữ liệu 20 khách hàng, DEMO accounts và quan hệ phục vụ view; idempotency test.
- Tạo controlled fixture suite (20 customers/30–50 dossiers) nếu local SQL không sẵn. Dùng fixtures và sandbox thật phân biệt rõ trong báo cáo.
- Chạy browser smoke từ các persona tối thiểu và các workflow có đủ prerequisites; nếu dữ liệu sẵn mà list bị thiếu, sửa projection/query chứ không sửa giả state.
- Không tạo dữ liệu real audit history/certificate signature trái workflow.

### Vòng E: integrated QA và bàn giao cuối (tự làm)
- Chạy gọn đúng những gates ảnh hưởng: frontend build/typecheck/lint; browser smoke tập trung 8 luồng; backend focused tests seed/RBAC/transaction, idempotency. Chỉ chạy full test khi có thay đổi lõi đáng kể.
- Trên Windows runner nếu có: cập nhật launcher an toàn, một lần double-click -> backend health 2xx -> frontend root 2xx -> mở 4 màn UI; chạy lại lần hai không kill process người dùng. Không gọi PASS nếu chỉ chạy Linux/mock.
- Đối chiếu QA checklist số liệu thực, screenshots, log. Không yêu cầu user nhấp thử chức năng.
- Commit/push trên feature branch, PR/draft khi phù hợp; không merge main. README/handoff phải có SHA, phạm vi diff, bằng chứng, pending, rollback; credentials sandbox ở local secure store.
- Chỉ khi toàn bộ các gate môi trường khả dụng PASS, trình user “BẢN CUỐI SẴN SÀNG XEM”. Nếu thiếu runner, nêu chính xác điểm pending và cách thu evidence một lượt, không hứa tất cả đã xong.

## 6. DEFINITION OF DONE — CHECKLIST BẮT BUỘC

### Calendar P0
- [ ] Một và chỉ một số ngày trên mỗi ô month calendar (DOM assertion + ảnh thật).
- [ ] Ô ngày trống thu gọn, không có lưới lịch trống cao bất hợp lý.
- [ ] 0/1/N overlapping audit + multi-day/month span + version dedupe đúng.
- [ ] Month/year navigation, Hôm nay, year leap, locale vi T2-CN, filters kết hợp chính xác.
- [ ] Popover +N, event click mở đúng project/cycle.
- [ ] Desktop 1366x768, 1440x900, tablet và mobile 390x844 không lỗi overflow hoặc cắt nút.

### UX toàn hệ thống
- [ ] Sidebar search/nav không clip tên nghiệp vụ vô nghĩa; được quyền truy cập theo role.
- [ ] Dashboard gọn nhưng nhiều dữ liệu vẫn dễ quét; dùng server projection.
- [ ] Công việc, lịch cá nhân, khách hàng, đơn/hồ sơ, CAP, review/decision/certificates nhất quán.
- [ ] Form rõ required/optional, validation, focus/keyboard, scrolling/fixed actions; empty/error/loading phân biệt.
- [ ] Không đổi workflow, backend authority, RBAC/SoD, certificate rules, white label.
- [ ] Browser screenshots có evidence trước/sau trên dữ liệu ít + dữ liệu mẫu.

### Data & QA
- [ ] Dữ liệu ở sandbox đã xác nhận bằng kiểm tra thực (nếu có runner), không nằm trong production.
- [ ] 20 khách hàng DEMO unique + demo accounts and customer isolation + 3 năm lịch sử hợp lệ.
- [ ] Quan hệ FK/unique, date/order/status consistent; chưa đầy đủ prerequisites thì không fake completed/certificate.
- [ ] Re-run seed 2 lần không nhân đôi, không sửa records ngoài DEMO.
- [ ] Automatic persona workflow smoke và negative RBAC/SoD. Không có password/secret ở GitHub.
- [ ] Report screenshot/log, module QA statuses, source SHA ở cả hai repos.
- [ ] Chủ sở hữu chỉ cần nghiệm thu cuối qua local CMP_ONE_CLICK.cmd khi bản Windows PASS.

## 7. BẢNG BÀN GIAO CUỐI CÙNG (GỬI CHỦ SỞ HỮU MỘT LẦN)

Phải ngắn gọn, theo mẫu:
- Frontend branch / HEAD: ...
- Backend branch / HEAD: ...
- Calendar P0: PASS/PENDING (DOM + Playwright image references)
- UX screens: X/Y PASS; ảnh đại diện desktop+mobile
- Dataset: 20/20 customers; accounts; applications/projects/events/certificates counts, years 2024/2025/2026, DATA SOURCE = real sandbox / fixture-only
- Browser: PASS/PENDING, Windows launcher: PASS/PENDING, no data loss assertion source
- Exceptions/prerequisites NOT COMPLETED: ...
- Người dùng chỉ cần thực hiện đúng một thao tác: double-click CMP_ONE_CLICK.cmd ở path máy Windows hiện hành; sau đó xem http://127.0.0.1:5173/.
- Không gọi QA “PASS toàn hệ thống” nếu chưa có browser runtime evidence. Không merge main.

## 8. PROMPT KHỞI CHẠY CODEX (SAO CHÉP NGUYÊN VĂN NẾU CẦN)

CMP — TÔI CẤP PHÉP TRIỂN KHAI UI/UX V2 + FIX P0 CALENDAR + DEMO DATA 3 NĂM. Đọc trước file docs/ux/CMP_CODEX_UIUX_CALENDAR_DEMO_3YEAR_EXECUTION_PACKET_2026-10-18.md từ nhánh feature/ux-fix-batch01 của repo vuanhtuan161094-byte/ctic-frontend và backend/docs/handoffs/CMP_NEXT_CHAT_HANDOFF_2026-10-18.md. Tự thực hiện toàn bộ các vòng A-E trong packet, không yêu cầu tôi test từng bước. Bắt đầu sửa lịch nhân đôi số ngày do info.originNode trong ScheduleResourcesScreen.tsx và ô quá cao; phải có Playwright browser chứng minh không lặp. Sau đó tối ưu desktop 1366x768 và mobile toàn CMP, dùng AntD6/design tokens hiện tại, không thay business logic. Tạo bộ DEMO 20 khách hàng/2024–2026 + accounts/roles/dossiers/lịch/NC-CAP/decision theo workflow có thật trên database SANDBOX cô lập, script dry-run/idempotent, không ghi production/CTIC_Certification hay giả certificate/audit. Chạy focused QA tự động, ảnh before-after, tự sửa phát hiện, commit/push feature branch, không merge main, không full CI vô ích. Chỉ bàn giao cho tôi kết quả cuối có HEAD, ảnh runtime, số liệu demo, PASS/PENDING trung thực và file CMD để mở CMP. Tôi không cần phê duyệt giữa các bước.
