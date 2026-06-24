# Danh Sách Tính Năng - Monkez File Manager

Dưới đây là mô tả chi tiết về các tính năng có trong Monkez File Manager.

## 1. Giao Diện Khung Hình Song Song (Multi-Pane Layout)
- Hỗ trợ xem đồng thời 1, 2 hoặc 3 khung hình (Panes).
- Cho phép mở nhiều tab trong mỗi khung hình để quản lý nhiều thư mục khác nhau mà không cần mở nhiều cửa sổ.
- Dễ dàng truyền tải, copy, move tệp tin qua lại giữa các Pane bằng chuột hoặc phím tắt nhanh (`F5`, `F6`).

## 2. Thay Đổi Kích Thước Chế Độ Xem (Adjustable View Modes)
- Hỗ trợ đổi chế độ xem giữa dạng bảng chi tiết (text) và dạng ô lưới (grid) với các kích thước: nhỏ (Small), vừa (Medium), lớn (Large).
- Hiển thị xem trước hình ảnh (image thumbnails) và tệp video tĩnh trực tiếp trên lưới tệp bằng cách gọi API streaming dữ liệu.

## 3. Tương Thích Kéo Thả Hệ Điều Hành (OS Drag-and-Drop)
- Hoàn toàn tương thích với hệ điều hành:
  - Cho phép người dùng kéo tệp tin từ Windows Explorer ngoài màn hình vào Pane ứng dụng để import tệp tin.
  - Cho phép kéo tệp tin từ Pane ứng dụng thả ra môi trường ngoài (thư mục máy tính, màn hình Desktop) để sao chép.

## 4. Clipboard Đồng Bộ và Chỉ Thị Màu Sắc (Color Highlighted Clipboard)
- Highlight tệp tin trong clipboard với màu sắc chuyên biệt:
  - **Màu Xanh Dương** cho các tệp đang ở trạng thái Copy.
  - **Màu Đỏ & Độ mờ 70%** cho các tệp đang ở trạng thái Cut.
- Khi người dùng bấm dán (`Paste`), hệ thống phát tín hiệu làm mới toàn bộ các Pane hiển thị để đảm bảo dữ liệu hiển thị đồng bộ tuyệt đối trên các màn hình.

## 5. Xem Trước Tệp Tin Nhanh (Preview Panel)
- Khung xem trước (Preview Panel) nằm bên phải ứng dụng hiển thị thông tin chi tiết của tệp đang chọn:
  - **Tệp văn bản & Code**: Hỗ trợ đọc nhanh nội dung (lên tới 10KB để tránh giật lag) hiển thị trong khung code.
  - **Hình ảnh**: Hiển thị ảnh xem trước trực tiếp.
  - **Video & Audio**: Nhúng trình phát phương tiện để nghe/xem trực tiếp trong ứng dụng.
  - **Tệp nhị phân & Metadata**: Hiển thị kích thước, ngày sửa đổi, và ngày khởi tạo tệp tin.

## 6. Menu Chuột Phải Tiện Ích (Context Menu Actions)
- Bấm chuột phải lên tệp hoặc vùng trống để mở Menu ngữ cảnh:
  - Sao chép đường dẫn tuyệt đối (`Copy Path`).
  - Mở thư mục chứa tệp trong Windows Explorer gốc (`Show in Explorer`).
  - Thao tác nén tệp tin thành định dạng ZIP, giải nén tệp tin ZIP trực tiếp.
  - Tính toán tổng dung lượng của thư mục con đệ quy (quá trình xử lý không đồng bộ hiển thị chi tiết số file/thư mục).
- Bấm chuột trái vào vùng trống sẽ bỏ chọn tất cả tệp/thư mục (tương tự Windows Explorer).
- Bấm chuột phải vào vùng trống sẽ bỏ chọn tất cả tệp/thư mục trước khi hiển thị menu ngữ cảnh thư mục hiện tại.
- Nút ⋮ (More) trên thanh điều hướng cho phép mở nhanh menu ngữ cảnh thư mục hiện tại mà không cần chuột phải.

## 7. Liên Kết Ứng Dụng Ngoài (Shell App Launcher)
- Nhận diện tự động và tích hợp khởi chạy ứng dụng mặc định:
  - **VS Code**: Mở file hoặc thư mục trực tiếp bằng Visual Studio Code.
  - **WinRAR**: Thực hiện nén/giải nén nâng cao qua WinRAR nếu máy tính đã cài đặt.
  - **Antigravity IDE**: Tích hợp mở nhanh dự án/file với Antigravity IDE.
  - **Terminal**: Mở nhanh Windows Terminal hoặc cmd tại đường dẫn hiện tại.

## 8. Quản Lý Drive và Bookmarks
- Tự động hiển thị các ổ đĩa cục bộ của Windows (C:, D:, E:, v.v.) kèm thanh dung lượng sử dụng.
- Cho phép người dùng đánh dấu (Bookmark) các thư mục quan trọng để truy cập nhanh từ thanh Sidebar bên trái.
