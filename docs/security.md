# Ghi Chú Bảo Mật

Monkez File Manager là ứng dụng quản lý file, vì vậy backend local có quyền đọc, ghi, xóa và mở file trên máy người dùng. Các API này phải được xem là vùng nhạy cảm.

## 1. Localhost Only

Server backend mặc định bind vào `127.0.0.1` thay vì mọi card mạng. Điều này giảm nguy cơ máy khác trong LAN gọi API quản lý file.

Các request có `Host` không phải localhost sẽ bị từ chối. CORS cũng chỉ cho phép origin localhost dùng trong dev server và server production nội bộ.

## 2. Chuẩn Hóa Path

Module `backend/security/pathGuard.js` chịu trách nhiệm:

- kiểm tra path rỗng hoặc chứa null byte;
- resolve path về dạng tuyệt đối;
- kiểm tra path tồn tại khi route yêu cầu;
- kiểm tra file/thư mục đúng loại;
- chặn tên file chứa path separator hoặc `..`;
- chặn các tên Windows reserved như `CON`, `NUL`, `COM1`, `LPT1`.

Các route thao tác file mới hoặc route được chỉnh sửa phải dùng module này thay vì tự nối chuỗi path.

## 3. Shell Command

Không ghép chuỗi lệnh shell trực tiếp với path người dùng nhập. Với lệnh hệ thống, ưu tiên:

- `spawn` hoặc `execFile` với mảng arguments;
- PowerShell `EncodedCommand` khi cần script phức tạp;
- không dùng `exec(cmdString)` cho path đến từ request nếu không có lý do rất rõ ràng.

ZIP/Unzip đã được chuyển sang helper chạy process an toàn hơn. Các route shell/open-with còn lại cần tiếp tục được thay theo cùng hướng.

Hiện tại `open`, `reveal`, `open-with` và `launch-tool` cũng đã chuyển sang cách gọi process bằng mảng arguments. Dynamic command đọc từ Registry tạm thời bị từ chối ở backend cho tới khi có parser an toàn hơn.

## 4. Xóa và Ghi Đè

Copy/move không được ghi đè im lặng. Khi trùng tên, hệ thống sẽ tự tạo tên kiểu `- Copy`, `- Copy 2` để tránh mất dữ liệu.

## 5. Power Send Trong LAN

Power Send là ngoại lệ có kiểm soát đối với nguyên tắc chỉ lắng nghe localhost:

- Express API quản trị vẫn chỉ bind vào `127.0.0.1`.
- Power Send tạo một HTTP server riêng trên `0.0.0.0` và cổng ngẫu nhiên chỉ khi người dùng bắt đầu gửi/nhận.
- HTTP server riêng không expose các route hệ thống, bookmark, shell hoặc file browser.
- Offer được bảo vệ bằng access token ngẫu nhiên; token chỉ được gửi trong phản hồi discovery tới peer hỏi đúng hash của mã.
- Manifest không chứa absolute path.
- Receiver kiểm tra relative path và chặn `..`, null byte và path thoát khỏi thư mục đích.
- Symbolic link bị từ chối khi build manifest.
- Tệp đang nhận được ghi vào file `.part`, sau đó mới rename khi tải hoàn tất.

Giới hạn hiện tại:

- HTTP streaming chưa mã hóa đầu cuối.
- UDP discovery có thể bị quan sát trong cùng mạng.
- Không nên dùng Power Send trên Wi-Fi công cộng hoặc LAN không đáng tin cậy.
- Mã gửi nên đủ khó đoán và phân biệt chữ hoa/chữ thường.

Xóa thường nên đi qua Thùng Rác khi chạy trong Electron. Xóa vĩnh viễn phải luôn có xác nhận từ UI.
