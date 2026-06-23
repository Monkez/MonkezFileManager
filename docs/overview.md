# Tổng Quan Dự Án - Monkez File Manager

Monkez File Manager là một ứng dụng quản lý tệp tin đa nền tảng (ưu tiên tối ưu cho Windows) được xây dựng trên nền tảng web hiện đại kết hợp với Electron để đem lại trải nghiệm ứng dụng desktop native mượt mà.

## Kiến Trúc Dự Án

Dự án được phát triển theo cấu trúc 3 tầng:

1. **Frontend (Client)**: 
   - Được viết bằng **React** và **Vite**.
   - Sử dụng **Vanilla CSS** với thiết kế hiện đại, hỗ trợ nhiều giao diện (Dark, Light, Midnight, Obsidian) và các hiệu ứng động, micro-animations sinh động.
   - Thư viện icon sử dụng **Lucide React**.

2. **Backend (Local API Server)**:
   - Viết bằng **Node.js** và **Express**.
   - Cung cấp các API RESTful cục bộ để quản lý hệ thống tệp tin (đọc ổ đĩa, danh sách thư mục, tạo mới, đổi tên, xóa, copy, di chuyển, giải nén ZIP, và stream dữ liệu tệp tin raw).
   - Server chạy ngầm trên cổng mặc định `3001`.

3. **Electron Wrapper (Desktop Shell)**:
   - Bao bọc toàn bộ ứng dụng web để chạy như một ứng dụng desktop độc lập.
   - Sử dụng **preload.js** để làm cầu nối giao tiếp IPC an toàn giữa môi trường sandbox của browser (React) và các API hệ thống của Electron (ví dụ: native drag-and-drop).

## Cấu Trúc Thư Mục Chính

```text
MonkezFileManager/
├── backend/               # Mã nguồn Express local server
│   ├── server.js          # Điểm khởi chạy server & định nghĩa API
│   └── package.json       # Dependencies của backend
├── frontend/              # Mã nguồn giao diện React
│   ├── src/               # Các component React & stylesheets
│   ├── index.html         # Tệp HTML chính
│   └── package.json       # Dependencies của frontend
├── docs/                  # Thư mục chứa tài liệu (tiếng Việt)
├── main.js                # Tệp chạy chính của Electron (Main Process)
├── preload.js             # Cầu nối bảo mật IPC (Preload Script)
├── package.json           # Cấu hình dự án root & lệnh script
└── rule.md                # Quy tắc làm việc của dự án
```
