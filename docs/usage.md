# Hướng Dẫn Sử Dụng - Monkez File Manager

Monkez File Manager cung cấp các công cụ quản lý file trực quan, thuận tiện và có hiệu năng cao thông qua cấu trúc chia khung hình (Panes).

## 1. Bố Cục Khung Hình (Pane Layout)
- Ứng dụng hỗ trợ chia từ **1 Pane, 2 Panes (Mặc định)** cho đến **3 Panes** cùng lúc.
- Sử dụng các nút bấm tương ứng trên thanh công cụ trên cùng để thay đổi số lượng khung hình hoạt động.
- Để thao tác trên một khung hình bất kỳ, hãy nhấp chuột vào khung hình đó để kích hoạt (khung hình được kích hoạt sẽ hiển thị viền xanh sáng xung quanh).

## 2. Các Chế Độ Xem (View Modes)
Nhấp chuột vào biểu tượng **List/Grid** ở thanh công cụ của từng khung hình để chuyển đổi giữa 4 chế độ xem:
1. **Chi tiết (Chỉ chữ)**: Chế độ bảng hiển thị thông tin chi tiết của tất cả các file (Tên, Kích thước, Ngày cập nhật, Định dạng).
2. **Ảnh nhỏ (Small Grid)**: Chế độ ô lưới nhỏ hiển thị ảnh thumbnail cho ảnh/video và icon cho file khác.
3. **Ảnh vừa (Medium Grid)**: Chế độ hiển thị thumbnail cỡ trung bình thích hợp để duyệt nhanh ảnh/video.
4. **Ảnh lớn (Large Grid)**: Chế độ thumbnail cỡ lớn giúp xem trước chi tiết ảnh/video trực quan.

## 3. Thao Tác Kéo Thả (Drag & Drop)
- **Nội bộ**: Kéo thả tệp tin từ khung hình này sang khung hình khác để Copy hoặc Move.
- **Hệ điều hành**: 
  - Kéo tệp tin từ ngoài (Windows Explorer, Desktop) thả vào ứng dụng để nhập khẩu (Import/Copy) tệp tin vào thư mục hiện tại.
  - Kéo tệp tin từ bên trong ứng dụng thả ra Desktop hoặc thư mục khác trên máy tính để thực hiện xuất khẩu tệp tin.

## 4. Clipboard & Highlight Màu Sắc
Khi chọn tệp tin và thực hiện thao tác:
- **Sao chép (Ctrl + C)**: Font chữ và icon của các tệp tin được chọn sẽ được highlight bằng **Màu Xanh Dương**.
- **Cắt (Ctrl + X)**: Font chữ và icon của các tệp tin được chọn sẽ được highlight bằng **Màu Đỏ** đồng thời giảm độ mờ (opacity 70%) để biểu thị trạng thái đang chờ di chuyển.
- **Dán (Ctrl + V)**: Sau khi dán tệp tin thành công, tất cả các khung hình liên quan sẽ được tự động làm mới để cập nhật nội dung đồng bộ.

## 5. Bảng Phím Tắt Tiện Ích

| Phím tắt | Thao tác | Mô tả |
| :--- | :--- | :--- |
| **Enter** | Mở thư mục / file | Kích hoạt thư mục con hoặc chạy file bằng app mặc định |
| **Backspace** | Go Up | Trở lại thư mục cha của thư mục hiện tại |
| **Ctrl + A** | Select All | Chọn tất cả tập tin và thư mục trong khung hình hiện tại |
| **Ctrl + C** | Copy | Copy các tệp được chọn vào clipboard (chữ xanh) |
| **Ctrl + X** | Cut | Cắt các tệp được chọn vào clipboard (chữ đỏ) |
| **Ctrl + V** | Paste | Dán các tệp từ clipboard vào thư mục hiện tại |
| **F2** | Đổi tên | Đổi tên tệp hoặc thư mục đang chọn |
| **Delete** | Xóa | Chuyển tệp hoặc thư mục đang chọn vào Thùng Rác |
| **Shift + Delete** | Xóa vĩnh viễn | Mở hộp thoại xác nhận xóa vĩnh viễn các tệp đã chọn |
| **Shift + Lên/Xuống** | Chọn nhiều tệp | Mở rộng vùng chọn tệp tin lên/xuống |
| **F5** | Copy to Target | Copy nhanh các tệp chọn sang khung hình lân cận |
| **F6** | Move to Target | Di chuyển nhanh các tệp chọn sang khung hình lân cận |
| **F7** | Tạo thư mục | Tạo một thư mục mới tại đường dẫn hiện tại |
