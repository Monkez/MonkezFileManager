# Chế Độ Windows Shell Thử Nghiệm

Từ phiên bản 1.7.0, Monkez File Manager có chế độ thử nghiệm để dùng giao diện của Monkez nhưng giao các thao tác file phổ biến cho Windows Shell xử lý.

## Bật Hoặc Tắt

1. Mở **Settings**.
2. Tìm phần **Cấu Hình Duyệt File**.
3. Bật **Dùng Windows Shell cho Copy/Cut/Paste và menu hệ thống**.

Chế độ được bật mặc định trong phiên bản thử nghiệm. Có thể tắt bất cứ lúc nào để quay về Task Manager và clipboard nội bộ trước đây.

## Các Thao Tác Đã Hỗ Trợ

- `Ctrl+C` ghi file vào clipboard chuẩn của Windows với trạng thái Copy.
- `Ctrl+X` ghi file vào clipboard chuẩn của Windows với trạng thái Cut.
- `Ctrl+V` gọi tác vụ Paste của Windows Shell tại thư mục đang mở.
- Có thể Copy/Cut trong Monkez rồi Paste trong Explorer và ngược lại.
- Menu chuột phải không hiển thị danh sách verb Windows Shell tổng quát. Chế độ này vẫn xử lý Copy/Cut/Paste và các tích hợp Shell được thiết kế riêng.
- **Create shortcut here** tạo shortcut `.lnk` trong thư mục hiện tại bằng Windows COM.
- **Thuộc tính** gọi lệnh chuẩn từ menu ngữ cảnh gốc của Explorer thông qua helper Win32 đóng gói cùng ứng dụng.

## Khác Biệt So Với Task Manager Của Monkez

Khi Windows Shell mode đang bật:

- Copy/Cut/Paste không tạo task trong bảng Tasks của Monkez.
- Quy tắc trùng tên, hộp thoại xác nhận và tiến trình phụ thuộc vào Windows.
- Undo/Redo nội bộ của Monkez không ghi nhận thao tác Paste do Windows Shell thực hiện.
- F5/F6, kéo thả giữa các pane, Batch Rename và Power Send vẫn dùng engine riêng của Monkez.

## Giới Hạn Của Bản Thử Nghiệm

- Danh sách hiện tại dùng các Shell verb công bố qua `Shell.Application`; chưa nhúng menu `IContextMenu` native đầy đủ vào cửa sổ Electron.
- Một số extension chỉ xuất hiện trong menu hiện đại của Windows 11 hoặc cần `IContextMenu2/IContextMenu3` có thể chưa xuất hiện.
- Danh sách verb hiện áp dụng cho item được nhấp chuột phải; chưa lấy menu Shell nền của vùng trống.
- Paste là thao tác bất đồng bộ của Windows. Pane được làm mới bằng file watcher và thêm một lần refresh trễ.
- Chế độ này chỉ hoạt động trên Windows.

Nếu một shell extension bên thứ ba gây lỗi, hãy tắt Windows Shell mode trong Settings để quay về luồng cũ.
