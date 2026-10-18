# Nguồn và giấy phép tài sản giao diện CMP

| Tài sản | Nguồn | Giấy phép | Cách dùng |
|---|---|---|---|
| Be Vietnam Pro 5.3.0 | npm package `@fontsource/be-vietnam-pro`; upstream Be Vietnam Pro project | SIL Open Font License 1.1; bản quyền đầy đủ tại [`public/licenses/OFL-Be-Vietnam-Pro.txt`](../../public/licenses/OFL-Be-Vietnam-Pro.txt) | Tự lưu trữ Latin và Vietnamese WOFF2, trọng lượng 400/500/600/700. Không gọi CDN. |
| Minh họa trống theo nghiệp vụ | Vẽ mới bằng SVG trong `app/components/design-system/EmptyWorkspaceIllustration.tsx` | Tác phẩm gốc của CMP; không nhúng ảnh bên thứ ba | Dùng token màu giao diện; mang tính trang trí với `aria-hidden`; các trạng thái gồm công việc, lịch, hồ sơ, khách hàng và tổ chức. |
| Biểu tượng thao tác | `@ant-design/icons` đã có trong dependency của ứng dụng | MIT theo gói Ant Design Icons | Dùng nhất quán trong nút và điều hướng; không thêm bộ icon thứ hai. |

Showcase typography tiếng Việt và các minh họa được duy trì trong nhóm Storybook `Foundations/Design language` (stories `VietnameseProductCopy` và `WorkflowEmptyIllustrations`). Bản build và browser capture phải kiểm tra chữ tiếng Việt sau khi font tải.
