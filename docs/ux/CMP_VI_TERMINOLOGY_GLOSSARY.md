# Thuật ngữ tiếng Việt trong CMP

Quy ước này giữ nhãn theo từng bước của quy trình chứng nhận. Mã trạng thái và khóa API vẫn giữ nguyên; chỉ nội dung trình bày cho người dùng được dịch theo ngữ cảnh.

| Khu vực | Nhãn dùng trong giao diện | Ý nghĩa nghiệp vụ / nguồn | Khóa backend | Kiểm tra |
|---|---|---|---|---|
| Trang tổng quan | **Tổng quan** | Màn hình đầu của nhân viên; bỏ tiêu đề trùng ý | Không đổi | `e2e/specs/personal-dashboard-layout.spec.mjs` |
| Công việc | **Việc cần xử lý**, **Việc cần lưu ý** | Việc theo hạn và cảnh báo do workspace trả về | `priority_work_items`, `exceptions` | Cùng spec Dashboard và My Work |
| Hành động công việc | **Xem đơn**, **Xem hồ sơ chứng nhận**, **Xem lịch đánh giá**, **Xem chi tiết** | Nút phụ thuộc loại việc, đích điều hướng và quyền thực thi | `work_type`, `destination_path`, `can_execute` | My Work/Dashboard browser fixtures |
| Khách hàng | **Khách hàng**, **Xem khách hàng**, **Hồ sơ chứng nhận** | Tổ chức đăng ký dịch vụ; hồ sơ liên quan là dự án chứng nhận | `customers`, `certification_projects` | Customer list toolbar/layout browser spec |
| Tổ chức | **Tổ chức & nhận diện** | Thông tin pháp lý và nhận diện của tổ chức chứng nhận | `organization-profile`, `configuration-readiness` | Cấu hình tổ chức browser fixture |
| Đơn đăng ký | **Đơn đăng ký chứng nhận** | Yêu cầu của khách hàng trước khi tiếp nhận và thẩm định điều kiện | `certification_applications` | Application workflow specs |
| Hồ sơ | **Hồ sơ chứng nhận** | Hồ sơ/dự án được tạo theo quy trình sau khi tiếp nhận đơn | `certification_projects` | Certification case browser specs |
| Kế hoạch và lịch | **Kế hoạch đánh giá**, **Đợt đánh giá**, **Lịch & nguồn lực** | Kế hoạch là nội dung chuẩn bị; đợt đánh giá là lần thực hiện có ngày, đoàn và phạm vi | `audit_plans`, `audit_appointments` | `e2e/specs/schedule-calendar-layout.spec.mjs` |
| Nhân sự đánh giá | **Đoàn đánh giá**, **Quyết định chỉ định đoàn** | Đoàn là nhóm được chỉ định; quyết định là bằng chứng phê duyệt có thẩm quyền | `audit_appointments`, `appointment_number` | Lịch và Audit Workspace fixtures |
| Phát hiện | **Điểm không phù hợp (NC)**, **Hành động khắc phục (CAP)** | NC là kết quả phát hiện; CAP là xử lý/khắc phục và bằng chứng đi kèm | `audit_findings`, `corrective_actions` | CAP browser/API tests |
| Thẩm xét | **Thẩm xét kỹ thuật**, **Người thẩm xét** | Đánh giá độc lập hồ sơ đánh giá và bằng chứng trước quyết định | `technical_reviews`, `technical_reviewer` | Technical review workflow specs |
| Quyết định | **Quyết định chứng nhận**, **Người ra quyết định** | Kết luận có thẩm quyền sau khi kiểm tra điều kiện và tính độc lập | `certification_decisions`, `decision_maker` | Decision workflow specs |
| Chứng chỉ | **Chứng chỉ**, **Chứng chỉ còn hiệu lực** | Chứng cứ chứng nhận được phát hành theo quyết định | `certificates`, `status` | Certificate workspace specs |
| Phân loại | **IAF**, **ISIC**, **NACE** | Giữ tên viết tắt chuẩn quốc tế; giải thích khi người dùng cần phân biệt | `iaf_code`, `isic_code`, `nace_code` | Taxonomy configuration specs |
| Chế độ đọc | **Chi tiết công việc** + nhãn **Chỉ xem** | Người dùng được xem lịch sử nhưng không có quyền thực hiện hành động | `can_execute`, permission response | My Work role fixtures |

## Cách viết

- Không hiển thị enum như `ADMIN`, `APPROVED`, `IN_PROGRESS` như nhãn dành cho khách hàng. Dùng bộ nhãn trạng thái theo miền nghiệp vụ.
- Chỉ hiện “Chờ thẩm xét” hoặc “Chờ quyết định” khi trạng thái backend xác nhận đúng bước đó.
- Nút gọi tên đối tượng và hành động cụ thể. Ẩn nút nếu không có đích điều hướng; nêu điều kiện còn thiếu khi backend trả blocker.
- Giữ các thuật ngữ pháp quy/chuẩn như IAF, ISIC, NACE, NC/CAP; không dịch sai bản chất của chúng.
- Không đổi khóa API, trạng thái, phân quyền, audit trail hay SoD khi sửa nội dung giao diện.
