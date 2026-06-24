# Nhật Ký Thay Đổi - Monkez File Manager

Tài liệu này ghi lại lịch sử thay đổi và cập nhật tính năng của Monkez File Manager.

## [1.2.0] - 24-06-2026

### Thêm Mới
- **Bookmarks Dropdown ở thanh công cụ chính (Top Toolbar)**: Cho phép xem nhanh và chọn trực tiếp danh sách bookmark đã lưu để điều hướng Pane đang hoạt động mà không cần mở thanh Sidebar. Hỗ trợ xóa bookmark nhanh trực tiếp từ menu dropdown.
- **Khôi phục thư mục phiên làm việc trước (Restore Last Folder)**: Bổ sung nút khôi phục lịch sử (icon đồng hồ) ở thanh điều hướng mỗi Pane. Khi ứng dụng khởi động lại hoặc máy tính reboot, click nút này sẽ mở lại thư mục hoạt động cuối cùng của Pane đó ở phiên làm việc trước. Nút tự động ẩn/disable khi Pane đã ở đúng thư mục đó.

### Cải Tiến
- **Nút ổ cứng nhanh chi tiết ở đầu Pane**: Nâng cấp các nút ổ đĩa cục bộ ở đầu mỗi Pane hiển thị đầy đủ icon ổ đĩa, tên nhãn ổ đĩa + chữ cái phân vùng (ví dụ: `Local Disk (C:)`), cùng thông tin dung lượng thực tế của ổ đĩa (`[Dung lượng trống] trống / [Tổng dung lượng]`).

## [1.1.1] - 24-06-2026

### Sửa Lỗi
- **Sửa lỗi "Open Terminal here" không hoạt động**: Lệnh mở terminal bị sai cú pháp do escape ký tự ngoặc kép không đúng trong câu lệnh `cmd.exe`, đồng thời Windows Terminal được gọi bằng tên cứng `wt` thay vì dùng đường dẫn đầy đủ đã phát hiện. Đã sửa cả hai trường hợp cmd fallback và Windows Terminal.

### Cải Tiến
- **Bỏ chọn khi click vùng trống**: Bấm chuột trái vào vùng trống trong danh sách tệp sẽ tự động bỏ chọn tất cả tệp/thư mục đang được chọn, giống với hành vi mặc định của Windows Explorer.
- **Menu ngữ cảnh vùng trống**: Bấm chuột phải vào vùng trống cũng sẽ bỏ chọn tất cả trước khi hiển thị menu ngữ cảnh thư mục hiện tại (New Folder, Paste, Refresh, v.v.).
- **Nút mở nhanh menu thư mục**: Nút ⋮ (More) trên thanh điều hướng bỏ chọn tất cả tệp khi mở menu ngữ cảnh thư mục, đảm bảo hành vi nhất quán.
- **Hỗ trợ Grid View**: Hành vi bỏ chọn và menu ngữ cảnh vùng trống hoạt động đồng nhất trên cả chế độ xem danh sách chi tiết (Detail) và lưới ảnh (Grid).

## [1.1.0] - 24-06-2026

### Thêm Mới
- **Chế độ xem lưới phương tiện (Media Grid View)**:
  - Bổ sung nút thay đổi chế độ xem ở thanh điều hướng Pane.
  - Hỗ trợ 3 kích thước ô lưới: Ảnh nhỏ (Small Grid), Ảnh vừa (Medium Grid), Ảnh lớn (Large Grid) cùng chế độ xem Chi tiết (Details).
  - Tự động hiển thị thumbnail hình ảnh qua API cục bộ `/api/raw`.
  - Tự động hiển thị khung hình xem trước cho video thông qua định vị giây thứ 0.1 của luồng video.
- **Tương thích kéo thả hệ thống (Native Drag & Drop)**:
  - Tích hợp Preload script và cấu hình cổng IPC `ondragstart` để hỗ trợ kéo tệp tin từ ứng dụng thả ra Windows Explorer hoặc Desktop.
  - Mở rộng xử lý sự kiện `onDrop` để nhận dạng tệp tin kéo từ ngoài OS thả vào cửa sổ ứng dụng, tự động thực hiện tiến trình sao chép (copy) tệp tin vào thư mục hiện tại.
- **Highlight chỉ thị clipboard**:
  - Tự động đổi màu font chữ và icon của tệp tin trong danh sách sang **Màu Xanh Dương** khi thực hiện lệnh Copy (`Ctrl + C`).
  - Tự động đổi màu font chữ và icon sang **Màu Đỏ** kèm làm mờ (opacity 70%) khi thực hiện lệnh Cut (`Ctrl + X`).

### Sửa Lỗi và Cải Tiến
- **Cải tiến kéo thả và chỉ thị kéo thả (Drag & Drop Icons)**:
  - Thiết kế lại các biểu tượng kéo thả tệp và thư mục ở kích thước 64x64 pixel chất lượng cao, nét hơn trên màn hình DPI cao.
  - Sửa lỗi khi kéo tệp xuống thanh taskbar của Windows bị hiển thị icon gốc của phần mềm thay vì biểu tượng tệp/folder bằng cách truyền đường dẫn tuyệt đối trực tiếp thay vì `NativeImage`.
  - Thiết kế giao diện kéo thả nội bộ (HTML5 Drag Ghost) với nền tối Slate-900 bo góc, viền xanh dương Sky-400 nổi bật, hiển thị rõ ràng tên tệp kéo trên mọi loại nền sáng/tối.
- **Icon tệp ảnh ở dạng danh sách chi tiết (Detail List View)**:
  - Tự động hiển thị hình ảnh thu nhỏ thực tế (thumbnail) của tệp ảnh ngay tại cột biểu tượng ở dạng xem chi tiết thay cho icon hình ảnh màu hồng mặc định.
- **Sửa lỗi tiêu điểm phím tắt (Keyboard Focus)**: Tự động đưa tiêu điểm về Pane khi nhấp chọn tệp tin hoặc nhấp vào vùng trống, giúp ứng dụng nhận diện phím tắt Copy/Paste/Cut và phím điều hướng một cách tin cậy hơn.
- **Bổ sung phím tắt Ctrl + A**: Cho phép chọn nhanh toàn bộ tệp tin trong thư mục hiện tại.
- **Cơ chế Refresh đồng bộ**: Thay đổi sự kiện refresh cục bộ sang phát sóng sự kiện toàn cục `refresh-all-panes`. Khi người dùng thực hiện Paste hoặc thay đổi tệp, toàn bộ các Pane đang mở sẽ đồng loạt cập nhật dữ liệu để đồng bộ hóa giao diện.

## [1.0.0] - 07-06-2026
- Phiên bản đầu tiên khởi chạy ứng dụng Monkez File Manager.
- Hỗ trợ quản lý tệp tin đa khung hình (Panes) và đa thẻ (Tabs).
- Tích hợp thanh Sidebar quản lý ổ đĩa logical và bookmarks thư mục.
- Bổ sung các tính năng cơ bản: Tạo folder, tạo file, đổi tên, xóa, nén zip, giải nén zip, và xem trước tệp (Preview).
