# Nhật Ký Thay Đổi - Monkez File Manager

Tài liệu này ghi lại lịch sử thay đổi và cập nhật tính năng của Monkez File Manager.

## [1.1.0] - 24-06-2026

### Thêm Mới
- **Chế độ xem lưới phương tiện (Media Grid View)**:
  - Bổ sung nút thay đổi chế độ xem ở thanh điều hướng Pane.
  - Hỗ trợ 3 kích thước ô lưới: Ảnh nhỏ (Small Grid), Ảnh vừa (Medium Grid), Ảnh lớn (Large Grid) cùng chế độ xem Chi tiết (Details).
  - Tự động hiển thị thumbnail hình ảnh qua API cục bộ `/api/raw`.
  - Tự động hiển thị khung hình xem trước cho video thông qua định vị giây thứ 0.1 của luồng video.
- **Tương thích kéo thả hệ thống (Native Drag & Drop)**:
  - Tích hợp Preload script và cấu hình cổng IPC `ondragstart` để hỗ trợ kéo tệp tin từ ứng dụng thả ra Windows Explorer hoặc Desktop.
  - Mở rộng xử lý sự kiện `onDrop` để nhận dạng tệp tin kéo từ ngoài OS thả vào cửa sổ ứng dụng, tự động thực hiện tiến trình sao chép (copy) tệp tin vào thư mục hiện tại.
- **Highlight chỉ thị clipboard**:
  - Tự động đổi màu font chữ và icon của tệp tin trong danh sách sang **Màu Xanh Dương** khi thực hiện lệnh Copy (`Ctrl + C`).
  - Tự động đổi màu font chữ và icon sang **Màu Đỏ** kèm làm mờ (opacity 70%) khi thực hiện lệnh Cut (`Ctrl + X`).

### Sửa Lỗi và Cải Tiến
- **Sửa lỗi tiêu điểm phím tắt (Keyboard Focus)**: Tự động đưa tiêu điểm về Pane khi nhấp chọn tệp tin hoặc nhấp vào vùng trống, giúp ứng dụng nhận diện phím tắt Copy/Paste/Cut và phím điều hướng một cách tin cậy hơn.
- **Bổ sung phím tắt Ctrl + A**: Cho phép chọn nhanh toàn bộ tệp tin trong thư mục hiện tại.
- **Cơ chế Refresh đồng bộ**: Thay đổi sự kiện refresh cục bộ sang phát sóng sự kiện toàn cục `refresh-all-panes`. Khi người dùng thực hiện Paste hoặc thay đổi tệp, toàn bộ các Pane đang mở sẽ đồng loạt cập nhật dữ liệu để đồng bộ hóa giao diện.

## [1.0.0] - 07-06-2026
- Phiên bản đầu tiên khởi chạy ứng dụng Monkez File Manager.
- Hỗ trợ quản lý tệp tin đa khung hình (Panes) và đa thẻ (Tabs).
- Tích hợp thanh Sidebar quản lý ổ đĩa logical và bookmarks thư mục.
- Bổ sung các tính năng cơ bản: Tạo folder, tạo file, đổi tên, xóa, nén zip, giải nén zip, và xem trước tệp (Preview).
