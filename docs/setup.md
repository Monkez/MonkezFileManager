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

## 4. Build và Đóng Gói (Packaging)

Để build ứng dụng thành tệp thực thi di động (`portable exe`) trên Windows:

- **Cách 1**: Nhấp đúp chuột vào file `build.bat` ở thư mục gốc.
- **Cách 2**: Chạy lệnh trong terminal:
  ```bash
  npm run package:electron
  ```
Bản dựng đóng gói hoàn thiện sẽ được xuất ra thư mục `/dist-electron-release/`.
