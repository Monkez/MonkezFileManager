# Kiến Trúc Kỹ Thuật - Monkez File Manager

Tài liệu này mô tả cấu trúc hiện tại sau đợt refactor nền tảng để dự án dễ mở rộng và dễ kiểm thử hơn.

## 1. Backend

Backend hiện được tách thành entrypoint mỏng và các module chuyên trách:

- `backend/server.js`: chỉ khởi động server.
- `backend/app.js`: tạo Express app, đăng ký middleware và các route còn lại.
- `backend/security/pathGuard.js`: chuẩn hóa và kiểm tra đường dẫn, tên file/thư mục.
- `backend/services/taskManager.js`: quản lý tác vụ nền như copy/move thư mục lớn.
- `backend/routes/tasks.routes.js`: API quản lý task.

Trong các bước refactor tiếp theo, các nhóm route còn trong `app.js` nên tiếp tục được tách ra:

- `routes/files.routes.js`
- `routes/archive.routes.js`
- `routes/bookmarks.routes.js`
- `routes/system.routes.js`
- `routes/shell.routes.js`

Logic nghiệp vụ nên nằm trong `services/`, controller chỉ đọc request, gọi service và trả response.

## 2. Frontend

Frontend bắt đầu có lớp state dùng Zustand cho các tác vụ nền:

- `frontend/src/stores/useTaskStore.js`: nhận task qua SSE, cập nhật danh sách task, hỗ trợ cancel.
- `frontend/src/components/TaskPanel.jsx`: hiển thị tiến độ copy/move.

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
- `POST /api/tasks/:id/cancel`

Backend gửi tiến độ qua Server-Sent Events. Frontend tự refresh các pane khi task kết thúc.
