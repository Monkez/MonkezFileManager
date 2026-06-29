# Kiểm Thử

Dự án đã có test runner cơ bản cho backend và frontend.

## 1. Chạy Test

Trên Windows, có thể nhấn đúp `test.bat` ở thư mục gốc.

Hoặc chạy bằng terminal:

```bash
npm test
```

Lệnh này sẽ chạy:

```bash
npm run test --prefix backend
npm run test --prefix frontend
```

## 2. Backend Tests

Backend dùng test runner có sẵn của Node.js (`node --test`).

Các test hiện có:

- `backend/tests/pathGuard.test.js`: kiểm tra chuẩn hóa path và tên file/thư mục.
- `backend/tests/taskManager.test.js`: kiểm tra copy/move task, xóa vĩnh viễn, lỗi Thùng rác, xử lý trùng tên và vòng đời task.
- `backend/tests/systemToolLauncher.test.js`: kiểm tra Device Manager dùng đường dẫn System32 tuyệt đối và lỗi spawn bất đồng bộ được trả về an toàn.
- `backend/tests/fileOperations.test.js`: kiểm tra tạo/đổi tên/tính dung lượng, copy tránh ghi đè, batch rename conflict và undo/redo history.
- `backend/tests/powerSendService.test.js`: kiểm tra mã/path an toàn, gộp nguồn cùng mã và truyền nhiều file/thư mục thật qua HTTP loopback.

## 3. Frontend Tests

Frontend có smoke test và test Zustand cho thao tác loại task đã hoàn tất khỏi Task Manager. Các bước tiếp theo nên bổ sung test cho:

- TaskPanel hiển thị tiến độ và trạng thái lỗi;
- các component đã tách từ `Pane.jsx` như `FileTable` và `FileGrid`.

## 4. Nguyên Tắc Thêm Test

Khi sửa logic file system, cần thêm test cho edge case tương ứng: path không tồn tại, tên không hợp lệ, trùng tên, copy/move thư mục, batch rename, undo/redo, cancel/pause/resume task, Power Send disconnect/path traversal và lỗi quyền truy cập.
