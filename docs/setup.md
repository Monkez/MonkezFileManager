# Hướng Dẫn Cài Đặt Môi Trường - Monkez File Manager

Tài liệu này hướng dẫn cách cài đặt môi trường phát triển và chạy thử Monkez File Manager trên Windows.

## 1. Yêu Cầu Cài Đặt Ban Đầu

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
- **Node.js**: Phiên bản LTS khuyến nghị (v18 trở lên).
- **npm**: Trình quản lý package đi kèm với Node.js.
- **Git**: Để quản lý mã nguồn.

## 2. Cài Đặt Dependencies

Bạn có thể cài đặt toàn bộ dependencies cho cả thư mục gốc, frontend và backend một cách tự động bằng cách:

- **Cách 1 (Khuyên dùng trên Windows)**:
  Nhấp đúp chuột vào file `setup.bat` ở thư mục gốc của dự án. File này sẽ tự động tải các package cần thiết.
  
- **Cách 2 (Sử dụng dòng lệnh)**:
  Mở terminal tại thư mục gốc của dự án và chạy lệnh sau:
  ```bash
  npm run install:all
  ```

Lệnh trên sẽ thực thi cài đặt tuần tự tại:
1. Thư mục root (`/`)
2. Thư mục backend (`/backend`)
3. Thư mục frontend (`/frontend`)

## 3. Khởi Chạy Ứng Dụng Trong Môi Trường Phát Triển (Development)

Sau khi cài đặt xong, bạn có thể khởi chạy ứng dụng:

- **Cách 1 (Khuyên dùng trên Windows)**:
  Nhấp đúp chuột vào file `run.bat` ở thư mục gốc của dự án. Ứng dụng sẽ tự động chạy server API và khởi động Electron shell để tải giao diện.
  
- **Cách 2 (Sử dụng dòng lệnh)**:
  Mở terminal tại thư mục gốc của dự án và chạy:
  ```bash
  npm run dev:electron
  ```
  *(Lưu ý: Nếu bạn chỉ muốn khởi chạy trên trình duyệt Web thay vì Electron shell, hãy chạy lệnh `npm run dev`)*.

## 4. Tích hợp Menu Ngữ Cảnh Windows (Tùy chọn)

Để thêm tùy chọn **"Open with Monkez File Manager"** vào menu chuột phải mặc định của Windows Explorer:
- Nhấn đúp chuột vào tệp `install-context-menu.bat` ở thư mục gốc (có thể yêu cầu quyền Administrator).
- Để gỡ bỏ, bạn có thể nhấn đúp vào tệp `uninstall-context-menu.bat`.

## 5. Build và Đóng Gói (Packaging)

Để build ứng dụng thành bộ cài đặt (Installer) trên Windows:
- Chạy lệnh trong terminal:
  ```bash
  npm run build:dist
  ```
Bản dựng sẽ được tạo bằng `electron-builder` và lưu trong thư mục `/dist-electron/` bao gồm file cài đặt setup (.exe).

Để build bản chạy ngay không cần cài đặt (`portable exe`):
- **Cách 1**: Nhấp đúp chuột vào file `build.bat` ở thư mục gốc.
- **Cách 2**: Chạy lệnh trong terminal:
  ```bash
  npm run package:electron
  ```
Bản dựng đóng gói hoàn thiện sẽ được xuất ra thư mục `/dist-electron-release/`.

## 6. Chạy Kiểm Thử

Sau khi cài dependencies, bạn có thể chạy bộ kiểm thử bằng một trong hai cách:

- Nhấn đúp `test.bat` ở thư mục gốc dự án.
- Hoặc mở terminal tại thư mục gốc và chạy:

```bash
npm test
```

Lệnh này sẽ chạy test backend và frontend. Nếu test báo lỗi, hãy đọc log phía trên để biết file hoặc chức năng cần kiểm tra.
