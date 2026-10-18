# CMP — CODEX EXECUTION PACKET V3: VISUAL QUALITY + REAL ONBOARDING
Ngày: 18/10/2026. Nhánh: feature/ux-fix-batch01 ở hai repo ctic-frontend / ctic-backend. Phạm vi được người dùng cho phép: cải tiến UI/UX, font, asset, ngôn ngữ và nhập liệu đúng một quy trình thực tế. Không merge main. Tự làm/test/sửa/push; người dùng chỉ nghiệm thu cuối.
Trạng thái: KẾ HOẠCH ĐƯỢC GIAO; không coi các nội dung bên dưới đã code hoặc PASS.

## 0. CẬP NHẬT AUTHORITY — THAY THẾ QUY TẮC DEMO TRƯỚC

Lệnh mới nhất của chủ sở hữu: Giao diện vẫn chưa đạt; bổ sung asset đẹp, rà font và từ ngữ đang quá giống AI. Về dữ liệu: KHÔNG lập hồ sơ chứng nhận giả bằng cách seed/ghi trạng thái trực tiếp. Làm tuần tự như tổ chức chứng nhận vận hành thật: thiết lập thông tin tổ chức, tài khoản/role, khách hàng, rồi mới đơn đăng ký/hồ sơ theo từng điều kiện. Dữ liệu kiểm thử được giữ trong thời gian trải nghiệm và chỉ dọn SAU khi chủ sở hữu yêu cầu.

Packet cũ docs/ux/CMP_CODEX_UIUX_CALENDAR_DEMO_3YEAR_EXECUTION_PACKET_2026-10-18.md giữ để truy vết nhưng những phần liên quan bulk mock dossier, “3 năm lịch sử” và nghiệm thu chỉ bằng browser fixture KHÔNG còn là mục tiêu triển khai SQL.

Theo báo cáo Codex của người dùng, frontend HEAD 410ea2b3730d1c43edd14e396785042b2cbabced, backend HEAD 961db06a5aa7829fa5c27e89f5c4f3bb53d98b00, lint/build/typecheck 482/482, browser 35 PASS/7 SKIP và seed safety 5/5. Đây là KẾT QUẢ CODEx BÁO, không phải test chạy lại trong packet. Browser dataset 20 khách/40 hồ sơ chỉ là fixture, KHÔNG có SQL record. Sau đó frontend có commit source nhỏ b60b65266379c35d662667cf2791757d61655d12 về nhãn và fallback font; source chưa browser-verified. BẮT BUỘC fetch HEAD live hai repo khi thực thi.

## 1. INVARIANTS & PHẠM VI AN TOÀN

- Giữ React 19, Ant Design 6, CSS tokens --cmp-*, white-label branding, backend RBAC, SoD, chuẩn ISO, quy tắc thẩm xét/quyết định/cấp chứng chỉ, man-day và các trạng thái nghiệp vụ. KHÔNG làm design system thứ hai.
- Không sửa schema/migration 34 hoặc authority nghiệp vụ chỉ để tối ưu UI. Không tự chỉnh trực tiếp status trong SQL để giả thành công.
- Không force-push, reset --hard, git clean, stash ép, merge main; không xóa untracked, WIP, bản sao lưu, upload, credentials. Lấy AGENTS.md và handoff thực tế trước khi code.
- Không dùng dữ liệu cá nhân khách hàng thật để tạo test. Tax ID để trống, email dùng example.invalid, mật khẩu ngẫu nhiên được lưu trong file local bảo vệ quyền, tuyệt đối không commit.
- Một lần cài đặt CMP tương ứng một tổ chức chứng nhận. Không hardcode CTIC, logo, tên pháp nhân hay URL logo ở source giao diện chung.
- Browser fixture vẫn được giữ cho regressions, phải ghi rõ FIXTURE. Không được trình bày dữ liệu fixture như SQL data có thật.
- Cấm tự tạo 40 hồ sơ, audit, CAP, quyết định/chứng chỉ đã hoàn tất bằng Prisma direct-write, bằng việc backdate signature hay sửa trường status. Hồ sơ chỉ xuất hiện sau hành động hợp lệ qua API/service.
- Chưa có SQL sandbox xác minh -> dừng mọi ghi data, hoàn thiện runner + test dry-run và báo BLOCKED; không gọi SQL PASS.

## 2. ĐỌC SOURCE VÀ ĐÁNH GIÁ UI THẬT

Đọc backend: docs/handoffs/CMP_NEXT_CHAT_HANDOFF_2026-10-18.md, AI_context.md, prisma/schema.prisma, prisma/seed.js, scripts/demo/README.md, scripts/demo/cmp-demo-seed.cjs, các service/controller organization config, users/roles, customers/access, applications/project/decision.

Đọc frontend: docs/ux/UX-I2_DESIGN_LANGUAGE.md, UX-I3_STORYBOOK_FOUNDATION.md, UX-V1_CONFIGURATION_VISUAL_DIRECTION.md, app/components/design-system/tokens.css, theme.ts, runtime-overrides.css, app/globals.css, DashboardShell.tsx, PersonalDashboardScreen.tsx, MyTasksScreen.tsx, MyCalendarScreen.tsx, ScheduleResourcesScreen.tsx, CustomersScreen.tsx, LoginScreen.tsx, ConfigurationRouteScreen.tsx, CustomerPortalDashboardScreen.tsx và các màn case/CAP/review/decision/certificate.

Chụp baseline thật 1366x768, 1440x900, 390x844, cùng một data state; thử empty/sparse/dense/error, role Admin, Coordinator, Customer. Kiểm tra truncation, modal footer, horizontal overflow, disabled action không có lý do, duplicate label, đọc font tiếng Việt.

## 3. VISUAL DIRECTION — PHẦN MỀM QUẢN LÝ CHỨNG NHẬN CHUYÊN NGHIỆP

Mục tiêu: B2B SaaS gọn, chính xác, ít trang trí; trang nào cũng trả lời được: đối tượng nào, bước nào, ai phụ trách, thời hạn, hồ sơ/bằng chứng nằm đâu, thao tác tiếp theo được phép. Ưu tiên dễ dùng thực tế ở 1366x768 hơn các card đồ họa.

### Typography
- Font hiện tại trước đây khai báo Inter nhưng repo không đóng gói webfont; trên Windows fallback không ổn định. Commit b60b652 đã dùng Segoe UI Variable/Segoe UI/Noto Sans OS fallback. Đây chỉ là baseline chưa được nghiệm thu thẩm mỹ.
- So sánh một font có hỗ trợ dấu Việt đầy đủ như Be Vietnam Pro (kiểm tra license SIL OFL và đúng WOFF2 subset), với font hệ điều hành. Chọn một font primary có thể self-host trong dependency có kiểm chứng; tránh Google Fonts CDN bên ngoài khi phần mềm chạy offline/intranet. Không chia sẻ font binary trong báo cáo/chat; quản lý dependency/license đúng luật.
- AntD theme và tokens.css phải khớp, font 14px body, 13px phụ có đủ contrast, title 22–26px, section 15–16px; không để chữ quan trọng 9–11px, không ép uppercase kéo dãn vô ích. Tạo specimen tiếng Việt: Đánh giá, chứng nhận, thẩm xét, hủy, ngừng, QLCL, QLMT, tiêu chuẩn, tên công ty rất dài, dates, ISO/IAF.
- Numeral tabular cho số liệu, mã, ngày; đối chiếu rendering 100%, 125%, 200% zoom. Giữ semantic status styles.

### Visual assets
- Inventory public/ hiện có chỉ generic favicon/file/globe/window.svg, chưa phải bộ tài sản nghiệp vụ. Rà toàn bộ icon/font/logo/empty illustrations.
- Thiết kế hoặc sử dụng hợp pháp một bộ SVG thống nhất có style enterprise, KHÔNG stock photo hoặc gradient/3D avatar ngẫu nhiên. Tối thiểu bốn asset được tích hợp: onboarding tổ chức, danh sách khách hàng trống, lịch tháng trống, tài liệu/hoạt động trống. Cân nhắc account/permission states nữa nếu hữu ích.
- Tôn trọng thương hiệu white-label: asset không chứa CTIC cố định; ưu tiên theme tokens hoặc currentColor. Asset trang trí cần aria-hidden, asset mang nội dung cần mô tả alt. Ghi rõ nguồn và license; không dùng artwork chưa xác nhận quyền.
- Icon thao tác nên reuse @ant-design/icons hiện có nhất quán hoặc thay toàn bộ bằng một bộ open-source có license, không trộn hàng loạt thư viện. Thiết lập showcase/Storybook cases để QA.
- Không nhét illustration lớn vào bảng trống: asset phải giúp định hướng và có CTA được phép, chiều cao phù hợp màn hình.

### Layout
- Một page title rõ, không lặp EYEBROW/tựa; mô tả chỉ khi thực sự giúp quyết định. KPI dạng compact data strip, mỗi nhãn/số rõ; danh sách có actor/status/due/actions.
- Sidebar menu gọn, hierarchical, nhãn không cắt mất ý nghĩa; tooltip tên đầy đủ và điều khiển thu gọn, giữ route và permissions. Không cần blue-black block khổng lồ.
- Forms/Modals: groups rõ ràng, field bắt buộc rõ, validation tại chỗ, nút lưu/hủy thấy ngay; không tạo card lồng card và bảng trống khổng lồ.
- Calendar P0 trước đã fix; phải giữ đúng một ngày mỗi ô, event qua cuối tháng hiện đến ngày cuối, month agenda mobile đúng, accessible; khi không có sự kiện thu gọn nội dung; không bị regression trong V3.
- Hãy thiết kế 3 màn đầu tiên làm visual reference: Dashboard, Khách hàng và Tổ chức & nhận diện. Duyệt bằng browser evidence tự động, rồi mới nhân rộng sang My Work, Calendar, Portal, Application, Dossier, CAP, Review, Certificate.

## 4. TỪ NGỮ TỰ NHIÊN, ĐÚNG NGHIỆP VỤ

Viết như nhân viên điều phối/chuyên gia của tổ chức chứng nhận, không viết kiểu chatbot hay marketing. Không có “tối ưu vận hành”, “trải nghiệm liền mạch”, “không gian thông minh” nếu không phải thông tin nghiệp vụ.

Gợi ý nội dung giao diện:
- “Tổng quan vận hành” lặp hai lần -> “Tổng quan”; dòng phụ hiển thị vai trò/ngày.
- “Ngoại lệ cần chú ý” -> “Việc cần lưu ý”; “Công việc ưu tiên” -> “Việc cần xử lý”.
- “Hàng đợi thẩm xét” -> “Chờ thẩm xét”; “Hàng đợi quyết định” -> “Chờ quyết định” nếu đúng trạng thái do backend trả.
- “Chi tiết công việc — chỉ xem” -> “Chi tiết công việc” + nhãn “Chỉ xem” + lý do khi thao tác không được phép.
- Không dùng nút “Mở” ở mọi màn: theo đối tượng là “Xem đơn”, “Mở hồ sơ”, “Xem lịch đánh giá”, “Xem bằng chứng”, “Lập kế hoạch”. Đừng hiển thị action nếu route không hợp lệ.
- Empty state cần rõ: “Chưa có đợt đánh giá trong tháng 10/2026”; khi lọc thì “Không có kết quả theo bộ lọc” và nút “Xóa bộ lọc” nếu được phép.
- Chặn thao tác phải nói prerequisite cụ thể: “Chưa đủ hồ sơ để thẩm xét” hoặc “Đang chờ quyết định chứng nhận”; KHÔNG suy đoán.
- Phân biệt “Đơn đăng ký”, “Hồ sơ chứng nhận”, “Kế hoạch đánh giá”, “Đợt đánh giá”, “Thẩm xét kỹ thuật”, “Quyết định chứng nhận”, “Chứng chỉ” và “Hành động khắc phục”. Giữ thuật ngữ NC/CAP/IAF/ISIC/NACE đúng bản chất. Không lộ machine status enums như ADMIN/APPROVED vào nhãn dân dụng.
- Lập docs/ux/CMP_VI_TERMINOLOGY_GLOSSARY.md: module, nhãn cũ/mới, nguồn nghiệp vụ, backend key không đổi, test screenshot. Scan chữ hiển thị trong app/components, sửa theo ngữ cảnh; không find-replace bừa.

## 5. DỮ LIỆU — LÀM TỪ ĐẦU NHƯ MỘT DỰ ÁN THẬT

### Gate 00: xác định DB an toàn
- Xác minh SQL Server, DB_NAME thực tế qua kết nối, môi trường non-prod, schema hiện hành, tài khoản có quyền phù hợp; chụp snapshot/backup TRƯỚC lần ghi.
- Ưu tiên DB riêng CTIC_CMP_DEMO_2026, có UI kết nối riêng để người dùng nhìn thấy dữ liệu thực; không thay DB vận hành CTIC_Certification mặc định. Nếu người dùng sau này cho phép thao tác trên DEV đang dùng, vẫn cần xác minh đây KHÔNG phải production + snapshot + namespace + cleanup.
- Lập run ID như CMP-UX-20261018-A và external local manifest: SQL identity, git SHAs, URL API, actor, IDs created, status, dependencies, original org values, snapshot ID. Không đưa credentials/token/password vào manifest commit.
- Backend scripts/demo/cmp-demo-seed.cjs hiện có dry-run và thủ tục upsert 20 customer trực tiếp; KHÔNG chạy --apply để thay các bước onboarding/Customer Create API. Giữ safety tests nhưng chuyển cách nhập demo sang UI/API nghiệp vụ.

### Gate 01: thông tin tổ chức chứng nhận
- Admin vào Cấu hình > Tổ chức & nhận diện. Điền profile của một tổ chức thử nghiệm có nhãn nhận biết ví dụ “CMP LAB — Tổ chức chứng nhận mẫu”; không tự sử dụng tên/logo thật của CTIC nếu không được cung cấp.
- Dùng đúng field backend hỗ trợ: thông tin pháp lý, display name, short name, portal title, địa chỉ/liên hệ, timezone và năng lực/chương trình nếu UI và backend có chức năng. Không điền metadata thành engine giả.
- Verify create/update qua API, reload sau khi save, readback từ SQL; admin được phép, user khác bị chặn theo role. Ghi lại giá trị ban đầu để có thể khôi phục riêng. Không thay cấu hình organization trong DB người dùng khi chưa chứng minh là sandbox.

### Gate 02: tài khoản và quyền
- Dùng User/Role CRUD đang có: tạo mẫu nội bộ riêng từng vai trò admin, sales, staff, coordinator, lead auditor, auditor, technical expert, technical reviewer, decision maker. Không cho tất cả admin.
- Tạo credentials ngẫu nhiên/hashing theo service và tệp cục bộ có permission hạn chế, không commit hoặc đăng vào log. Domain email example.invalid, tắt gửi mail thật.
- Test 2–3 persona login, effective permission, role isolation; người nộp/chuyên gia/thẩm xét/ra quyết định không tự duyệt trái SoD.
- Expert profile/competency chỉ tạo khi evidence/test prerequisites do hệ thống hiện tại cho phép; không fabricate “approved” competencies.

### Gate 03: khách hàng
- Nhập MỤC TIÊU 20 tổ chức thử nghiệm bằng đúng Customers UI hoặc POST /customers có phân quyền, lần lượt 1 -> 5 -> 20 khách. KHÔNG direct insert Prisma và không dùng 20 identical companies. Mỗi khách khác ngành nghề/độ dài tên, 1+ địa điểm khi schema có, liên hệ, email example.invalid, tax_code null; tên/mã có prefix nhận biết của lần chạy, không đụng khách thật đang có.
- Lưu customer IDs + API response và thời gian tạo vào manifest; mỗi record đọc lại từ GET /customers và detail UI. Test unique code, validation Vietnamese, search, sort, pagination và filter.
- Khách hàng portal: tạo user/access qua đúng API riêng khi khách đã tồn tại; mỗi customer A thấy riêng dữ liệu A. Nếu chưa có endpoint hợp lệ, báo BLOCKED; KHÔNG ghi join table trực tiếp.
- Sau mỗi nhóm 5, test nhanh page list/detail/permissions; không bắt user xem hay nhập cùng.

### Gate 04: CHỈ một đơn đăng ký thực sự qua workflow
- Với một khách hàng vừa tạo có portal account: đăng nhập role customer, tạo và nộp đơn theo form thật, điền đủ trường hiện có; xác minh required fields và legal declaration.
- Sau đó actor coordinator/reviewer dùng màn hình thực để tiếp nhận/xem xét; nếu thiếu scheme/capability/evidence, ghi blocker, xử lý qua workflow thật hoặc dừng chuỗi ở trạng thái hợp lệ. Không tự tăng tiến trạng thái bằng sửa SQL.
- Hợp đồng/project/audit/NC/CAP/thẩm xét/quyết định/chứng chỉ chỉ mở sau prerequisite hợp lệ. Không yêu cầu 40 hồ sơ, không bắt hệ thống có issued certificate để QA nếu chưa thể đạt gate.
- Chạy các nhánh lỗi/thiếu quyền/đơn trả về trên API hoặc browser fixture cô lập. Dossier status và lịch sử chỉ là kết quả của hành động người dùng đã diễn ra.

### 3 năm dữ liệu
- Yêu cầu “có thời gian 3 năm update” dùng để kiểm tra UI/history và các kỳ nghiệp vụ; giữ fixture mô phỏng năm 2024–2026 đã có cho các bài visual regression, hiển thị rõ fixture-only.
- Không lấy record vừa tạo hôm nay rồi giả backdate audit, certification decisions, certificate issue date hay chữ ký thành lịch sử đã xảy ra. Nếu backend không có safe virtual test clock, dữ liệu thật trong sandbox chỉ theo ngày thực hiện, và test 3-year vẫn là fixture.

## 6. DỌN SAU — CHUẨN BỊ NHƯNG CHƯA THỰC HIỆN

- Tạo lệnh REPORT/DRY-RUN list run ID, DB identity, IDs do runner tạo, số dòng và tất cả FK dependencies, original organization config. Mặc định KHÔNG delete.
- Nếu database riêng hoàn toàn disposable: khôi phục verified snapshot hoặc bỏ database sandbox SAU khi owner yêu cầu, không phá các DB khác.
- Nếu dùng DEV chia sẻ: chỉ được xóa data test có manifest và quan hệ ownership rõ, sau khi backup/owner xác nhận; không đụng audit trail hoặc dữ liệu khác. Nếu cannot clean safely thì không xóa, báo blocker.
- Không auto cleanup khi launcher khởi động, khi seeding thất bại hoặc khi người dùng đóng browser.
- Tài khoản và record đang test phải được nhận biết ở UI nhưng không render "DEMO" như một nghiệp vụ thật.

## 7. CÁCH TRIỂN KHAI CHO CODEX

1. Đọc source, checkout HEAD an toàn và phân tích thực tế. Đọc GitHub frontend-design / ui-ux-pro-max như reference có giấy phép; không chạy binary/installer lạ. Ghi baseline screenshots.
2. Làm pilot typography + 4 asset SVG + glossary + 3 màn Dashboard/Khách hàng/Tổ chức. Browser screenshot, keyboard/contrast, font tiếng Việt và 1366×768. Nếu chưa đạt thì tự sửa.
3. Mở rộng nhất quán My Work, Calendar, App Shell, portal, case, CAP, review, decision/certificates; giữ nguyên backend logic.
4. Backend sandbox workflow runner + safety gates + manifest/cleanup dry-run; sau khi có sandbox thật mới tạo tổ chức -> accounts -> customers -> first application.
5. QA targeted thay vì chạy FULL liên tục: build/typecheck/lint, unit test liên quan, Playwright 1366×768 + 1440×900 + 390×844 trên empty/fixture và SQL-backed, RBAC/SoD negative assertions; log runtime và screenshot trước/sau.
6. Commit/push feature branch, không merge main. Ghi trạng thái PASS/PENDING minh bạch; không gửi 20 vòng test cho người dùng.

## 8. DEFINITION OF DONE

- [ ] Typography thống nhất toàn bộ AntD/CSS và hỗ trợ dấu Việt; specimen screenshot + font license.
- [ ] Tối thiểu bốn asset SVG có ý nghĩa, được tích hợp và kiểm thử contrast/accessibility/brand override; không còn placeholder generic không phù hợp.
- [ ] Glosssary tiếng Việt và màn hình loại bỏ wording AI, bớt “Mở” chung chung và trùng heading; không sửa backend statuses.
- [ ] Dashboard, App Shell, khách hàng, tài khoản, tổ chức, đơn/hồ sơ, lịch, CAP, review, portal: cùng visual language, đẹp và dễ quét ở 1366×768.
- [ ] Calendar P0 không tái phát: mỗi ô một nhãn ngày, multi-day cross month, mobile agenda, 0/N event, đúng routes/permissions.
- [ ] SQL sandbox identity + snapshot được xác minh TRƯỚC lần ghi; nếu thiếu thì DATA BLOCKED chứ không ghi DB mặc định.
- [ ] Thông tin tổ chức đã qua UI/API và đọc lại; role/accounts login/permissions; mục tiêu 20 khách khác nhau qua Create Customer API.
- [ ] Portal customer isolation và một đơn đăng ký qua workflow, record IDs/actor/created_at traceable, không fake approval/certificate.
- [ ] Cleanup dry-run có thể kiểm toán, không thực thi cho đến khi owner yêu cầu.
- [ ] Screenshot phân biệt UI real-SQL và browser-fixture; QA thực chạy với logs/HEAD, không giả PASS.
- [ ] Người dùng chỉ cần mở một lần bản cuối bằng CMP_ONE_CLICK.cmd và đánh giá.

## 9. PROMPT GỬI CODEX

CMP — CẬP NHẬT ĐỊNH HƯỚNG: Đọc docs/ux/CMP_CODEX_VISUAL_AND_REAL_WORKFLOW_RESET_2026-10-18.md của frontend trên feature/ux-fix-batch01. Tự triển khai UI/UX V3 thật sự chuyên nghiệp, asset SVG đẹp có license, font tiếng Việt kiểm chứng ở browser, rà toàn bộ từ ngữ quá AI bằng glossary nghiệp vụ. Không tạo 40 hồ sơ giả hay backdate trạng thái; chỉ nhập dữ liệu qua nghiệp vụ theo thứ tự cấu hình tổ chức chứng nhận -> roles/tài khoản -> 20 khách hàng -> portal -> một đơn đăng ký -> workflow tiếp theo khi đủ điều kiện. SQL chỉ trong sandbox verified + snapshot, lưu manifest IDs để dọn SAU khi tôi yêu cầu; không xóa ngay, không động dữ liệu vận hành, không merge main. Tự code, focused test, browser ảnh thực, tự sửa/commit/push, tôi chỉ cần xem kết quả cuối, không test từng bước. Báo rõ các phần bị BLOCKED bởi môi trường, không gọi fixture là SQL data.
