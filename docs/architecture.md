# Kiến Trúc Kỹ Thuật - Monkez File Manager

Tài liệu này mô tả cấu trúc hiện tại sau đợt refactor nền tảng để dự án dễ mở rộng và dễ kiểm thử hơn.

## 1. Backend

Backend hiện được tách thành entrypoint mỏng và các module chuyên trách:

- `backend/server.js`: chỉ khởi động server.
- `backend/app.js`: tạo Express app, đăng ký middleware và các route còn lại.
- `backend/security/pathGuard.js`: chuẩn hóa và kiểm tra đường dẫn, tên file/thư mục.
- `backend/services/taskManager.js`: quản lý tác vụ nền như copy/move thư mục lớn.
- `backend/routes/tasks.routes.js`: API quản lý task.
- `backend/services/fileOperations.js`: logic tạo/xóa/đổi tên/copy/move/tính dung lượng thư mục.
- `backend/routes/fileOperations.routes.js`: route cho nhóm thao tác file.
- `backend/services/operationHistory.js`: lưu lịch sử thao tác file để phục vụ Undo/Redo trong phiên chạy hiện tại.
- `backend/routes/history.routes.js`: API `/api/history`, `/api/undo`, `/api/redo`.
- `backend/services/powerSendService.js`: discovery peer bằng UDP, tạo manifest, HTTP streaming và quản lý phiên gửi/nhận LAN.
- `backend/routes/powerSend.routes.js`: API localhost và SSE cho Power Send Manager.

Trong các bước refactor tiếp theo, các nhóm route còn trong `app.js` nên tiếp tục được tách ra:

- `routes/archive.routes.js`
- `routes/bookmarks.routes.js`
- `routes/system.routes.js`
- `routes/shell.routes.js`

Logic nghiệp vụ nên nằm trong `services/`, controller chỉ đọc request, gọi service và trả response.

## 2. Frontend

Frontend bắt đầu có lớp state dùng Zustand cho các tác vụ nền:

- `frontend/src/stores/useTaskStore.js`: nhận task qua SSE, cập nhật danh sách task, hỗ trợ pause/resume/cancel và loại task đã hoàn tất.
- `frontend/src/components/TaskPanel.jsx`: hiển thị tiến độ copy/move, tốc độ, ETA, điều khiển task và tự ẩn task thành công.
- `frontend/src/components/CommandPalette.jsx`: bảng lệnh nhanh cho các thao tác thường dùng.
- `frontend/src/components/BatchRenameModal.jsx`: giao diện đổi tên hàng loạt có preview.
- `frontend/src/stores/usePowerSendStore.js`: state và SSE cho các phiên Power Send.
- `frontend/src/components/PowerSendModal.jsx`: nhập mã gửi/nhận.
- `frontend/src/components/PowerSendPanel.jsx`: bảng quản lý tiến trình gửi/nhận.

`Pane.jsx` đã bắt đầu được component hóa:

- `FileTable.jsx`: render danh sách dạng bảng.
- `FileGrid.jsx`: render danh sách dạng lưới.

Các phần tiếp theo nên được tách khỏi `Pane.jsx`: tabs, path bar, context menu, drag/drop, shortcuts và file operations.

## 3. Luồng Task Nền

Các thao tác copy/move dài dùng API:

- `POST /api/tasks/copy`
- `POST /api/tasks/move`
- `GET /api/tasks`
- `GET /api/tasks/events`
- `POST /api/tasks/:id/pause`
- `POST /api/tasks/:id/resume`
- `POST /api/tasks/:id/cancel`
- `DELETE /api/tasks/:id` (chỉ xóa task đã kết thúc)

Backend gửi tiến độ qua Server-Sent Events. Frontend tự refresh các pane khi task kết thúc. Task hoàn tất sạch được cả frontend và backend tự dọn sau thời gian giữ ngắn; backend phát snapshot mới để mọi client đồng bộ.

## 4. Luồng Undo/Redo và Batch Rename

Các thao tác file quan trọng sẽ ghi entry vào `OperationHistory`. Mỗi entry gồm danh sách bước `undo` và `redo`. Hiện tại lịch sử được lưu trong bộ nhớ của tiến trình backend, vì vậy sẽ mất khi tắt ứng dụng.

Các API chính:

- `GET /api/history`
- `POST /api/undo`
- `POST /api/redo`
- `POST /api/batch-rename/preview`
- `POST /api/batch-rename/apply`

Batch Rename luôn preview trước khi apply và kiểm tra xung đột tên mới, bao gồm cả xung đột với file đã tồn tại và xung đột giữa các mục đang được đổi tên cùng lúc.

## 5. Luồng Power Send

1. Máy gửi tạo offer từ các path đã chuẩn hóa.
2. Backend build manifest chỉ gồm source ID, relative path, type và size; absolute path chỉ giữ nội bộ.
3. Power Send mở UDP socket trên cổng `38492` và một HTTP server trên cổng TCP ngẫu nhiên.
4. Máy nhận broadcast hash của mã trong LAN.
5. Máy gửi phản hồi unicast với offer ID, TCP port và token ngẫu nhiên.
6. Máy nhận tải manifest, tạo cây thư mục an toàn và stream từng file.
7. Hai phía cập nhật tiến trình qua SSE localhost `/api/power-send/events`.

API quản lý:

- `GET /api/power-send/transfers`
- `GET /api/power-send/events`
- `POST /api/power-send/offers`
- `POST /api/power-send/receive`
- `POST /api/power-send/:id/cancel`
- `DELETE /api/power-send/:id`

Các endpoint LAN không chia sẻ Express app chính. Chúng nằm trên HTTP server riêng và chỉ phục vụ manifest/file khi token của offer hợp lệ.
