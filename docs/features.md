# Danh Sách Tính Năng - Monkez File Manager

Dưới đây là mô tả chi tiết về các tính năng có trong Monkez File Manager.

## 1. Giao Diện Khung Hình Song Song (Multi-Pane Layout)
- Hỗ trợ xem đồng thời 1, 2 hoặc 3 khung hình (Panes).
- Cho phép mở nhiều tab trong mỗi khung hình để quản lý nhiều thư mục khác nhau mà không cần mở nhiều cửa sổ.
- Dễ dàng truyền tải, copy, move tệp tin qua lại giữa các Pane bằng chuột hoặc phím tắt nhanh (`F5`, `F6`).

## 2. Thay Đổi Kích Thước Chế Độ Xem (Adjustable View Modes)
- Hỗ trợ đổi chế độ xem giữa dạng bảng chi tiết (text) và dạng ô lưới (grid) với các kích thước: nhỏ (Small), vừa (Medium), lớn (Large).
- Hiển thị xem trước hình ảnh (image thumbnails) và tệp video tĩnh trực tiếp trên lưới tệp bằng cách gọi API streaming dữ liệu.

## 3. Tương Thích Kéo Thả Hệ Điều Hành (OS Drag-and-Drop)
- Hoàn toàn tương thích với hệ điều hành:
  - Cho phép người dùng kéo tệp tin từ Windows Explorer ngoài màn hình vào Pane ứng dụng để import tệp tin.
  - Cho phép kéo tệp tin từ Pane ứng dụng thả ra môi trường ngoài (thư mục máy tính, màn hình Desktop) để sao chép.

## 4. Clipboard Đồng Bộ và Chỉ Thị Màu Sắc (Color Highlighted Clipboard)
- Highlight tệp tin trong clipboard với màu sắc chuyên biệt:
  - **Màu Xanh Dương** cho các tệp đang ở trạng thái Copy.
  - **Màu Đỏ & Độ mờ 70%** cho các tệp đang ở trạng thái Cut.
- Khi người dùng bấm dán (`Paste`), hệ thống phát tín hiệu làm mới toàn bộ các Pane hiển thị để đảm bảo dữ liệu hiển thị đồng bộ tuyệt đối trên các màn hình.

## 5. Xem Trước Tệp Tin Nhanh (Preview Panel)
- Khung xem trước (Preview Panel) nằm bên phải ứng dụng hiển thị thông tin chi tiết của tệp đang chọn:
  - **Tệp văn bản & Code**: Hỗ trợ đọc nhanh nội dung (lên tới 10KB để tránh giật lag) hiển thị trong khung code.
  - **Hình ảnh**: Hiển thị ảnh xem trước trực tiếp.
  - **Video & Audio**: Nhúng trình phát phương tiện để nghe/xem trực tiếp trong ứng dụng.
  - **Tệp nhị phân & Metadata**: Hiển thị kích thước, ngày sửa đổi, và ngày khởi tạo tệp tin.

## 6. Menu Chuột Phải Tiện Ích (Context Menu Actions)
- Mỗi lệnh trong menu chuột phải đều được tích hợp **Icon minh họa** để dễ dàng nhận diện.
- Bấm chuột phải lên tệp hoặc vùng trống để mở Menu ngữ cảnh:
  - **Menu Ngữ Cảnh Động Windows (Dynamic Context Menu)**: Ứng dụng tự động đọc Registry của Windows và hiển thị các lệnh chuột phải bên thứ 3 (như Git Bash, VS Code, ứng dụng diệt virus...) với icon nguyên bản (được trích xuất trực tiếp từ file `.exe` bằng Electron).
  - Sao chép đường dẫn tuyệt đối (`Copy Path`).
  - Mở thư mục chứa tệp trong Windows Explorer gốc (`Show in Explorer`).
  - **Xóa (Delete)**: Chuyển tệp tin vào Thùng rác (Recycle Bin) an toàn.
  - **Xóa Vĩnh Viễn (Permanent Delete)**: Xóa hoàn toàn tệp tin khỏi ổ cứng (`Shift+Delete`).
  - Thao tác nén tệp tin thành định dạng ZIP, giải nén tệp tin ZIP trực tiếp.
  - Tính toán tổng dung lượng của thư mục con đệ quy (quá trình xử lý không đồng bộ hiển thị chi tiết số file/thư mục).
- Bấm chuột trái vào vùng trống sẽ bỏ chọn tất cả tệp/thư mục (tương tự Windows Explorer). Hỗ trợ **Sweep Selection** (kéo giữ chuột) để chọn nhanh nhiều tệp tin liên tiếp.
- Bấm chuột phải vào vùng trống sẽ bỏ chọn tất cả tệp/thư mục trước khi hiển thị menu ngữ cảnh thư mục hiện tại.
- Nút ⋮ (More) trên thanh điều hướng cho phép mở nhanh menu ngữ cảnh thư mục hiện tại mà không cần chuột phải.

## 7. Liên Kết Ứng Dụng Ngoài (Shell App Launcher)
- Nhận diện tự động và tích hợp khởi chạy ứng dụng mặc định:
  - **VS Code**: Mở file hoặc thư mục trực tiếp bằng Visual Studio Code.
  - **WinRAR**: Thực hiện nén/giải nén nâng cao qua WinRAR nếu máy tính đã cài đặt.
  - **Antigravity IDE**: Tích hợp mở nhanh dự án/file với Antigravity IDE.
  - **Terminal**: Mở nhanh Windows Terminal hoặc cmd tại đường dẫn hiện tại (với môi trường không bị xung đột).
- **Tích Hợp Windows Explorer**: Bằng cách chạy file `install-context-menu.bat`, người dùng có thể thêm mục "Open with Monkez File Manager" vào menu chuột phải của Windows. Khi click, ứng dụng sẽ mở thẳng vào thư mục đó.

## 8. Quản Lý Drive và Bookmarks
- Tự động hiển thị các ổ đĩa cục bộ của Windows (C:, D:, E:, v.v.) kèm thanh dung lượng sử dụng trên thanh Sidebar bên trái.
- Cho phép người dùng đánh dấu (Bookmark) các thư mục quan trọng để truy cập nhanh từ thanh Sidebar hoặc trực tiếp qua **Bookmarks Dropdown** trên thanh công cụ phía trên (Top Toolbar), giúp chuyển nhanh thư mục hoạt động mà không cần mở Sidebar.
- Tách biệt thành **3 Menu Dropdown riêng biệt** trên thanh công cụ (Top Toolbar):
  - **Bookmarks** (Icon Ngôi sao): Danh sách các bookmark người dùng lưu tùy chỉnh. Bạn có thể bấm **chuột phải** vào một bookmark để thao tác sửa/xóa nâng cao, hoặc xóa nhanh bằng dấu `x`.
  - **Thư mục** (Icon Thư mục): Truy cập nhanh lập tức các thư mục Windows phổ biến: Desktop, Downloads, Documents, Pictures, Videos, Music, User Profile, Program Files, Program Files (x86), Windows (C:\Windows), AppData (Roaming), và Temp.
  - **Công cụ** (Icon Tiện ích): Khởi chạy trực tiếp các công cụ quản trị hệ điều hành dưới nền bằng cách sử dụng luồng chạy độc lập (không gây lỗi GUI): Control Panel, Windows Settings, Add or Remove Programs, Task Manager, Disk Management, Device Manager, Registry Editor, Services, Resource Monitor, Command Prompt (CMD), và PowerShell.
- Nút **ổ đĩa nhanh (Drive Toolbar)** ở đầu mỗi Pane hiển thị đầy đủ thông tin: nhãn ổ đĩa, biểu tượng, dung lượng trống và tổng dung lượng (ví dụ: `Local Disk (C:) - 45.2 GB trống / 120 GB`).

## 9. Thanh Công Cụ Hiển Thị (View Toggles)
- Bật/tắt hiển thị tệp tin và thư mục ẩn (Hidden Items) qua biểu tượng con mắt trên thanh công cụ chính.
- Bật/tắt hiển thị phần mở rộng của tệp tin (File Extensions) qua biểu tượng văn bản. Cài đặt tự động ghi nhớ cho các phiên bản làm việc sau.
- Rê chuột vào vùng phân cách dưới Topbar để hiện nút mũi tên, sau đó dùng nút này để thu gọn hoặc mở lại toàn bộ thanh công cụ trên cùng.
- Trong Settings có thể hiện/ẩn Status Bar và bật/tắt riêng dải gợi ý phím tắt ở dưới cùng.
- Nút cuộn tab trái/phải tự ẩn khi toàn bộ tab vẫn nằm gọn trong Pane.

## 10. Undo/Redo, Conflict Resolver và Batch Rename
- Hỗ trợ Undo/Redo cho các thao tác file thường dùng như tạo thư mục, tạo tệp, đổi tên, copy, move và đổi tên hàng loạt.
- Khi copy/move có thể chọn cách xử lý trùng tên: giữ cả hai, ghi đè, bỏ qua hoặc báo lỗi.
- Batch Rename có màn hình preview trước khi áp dụng, hỗ trợ pattern `{name}`, `{index}`, `{ext}`, tìm/thay thế, chuyển chữ thường và chữ hoa.
- Hệ thống tự phát hiện tên mới bị trùng để tránh thao tác rename dở dang.

## 11. Task Manager Nâng Cao
- Các tác vụ copy/move lớn chạy nền và hiển thị tiến độ theo thời gian thực.
- Hiển thị tốc độ xử lý, ETA, số mục đã xử lý và trạng thái hiện tại.
- Cho phép tạm dừng, tiếp tục hoặc hủy tác vụ đang chạy.
- Thao tác đưa vào Thùng rác và xóa vĩnh viễn chạy qua Task Manager, hiển thị số mục đã xử lý và chi tiết lỗi nếu thất bại.
- Khi dán file vào chính thư mục hiện tại, ứng dụng tự tạo tên `- Copy`, `- Copy 2` và không báo lỗi trùng tên.
- Các task chạy đồng thời giữ chỗ tên đích riêng để không ghi đè hoặc tranh chấp cùng một đường dẫn.
- Task hoàn tất không có lỗi tự biến mất sau vài giây để bảng luôn gọn; task lỗi và task bị hủy vẫn được giữ lại và có thể xóa thủ công.
- Khi task hoàn tất, thao tác copy/move được ghi vào lịch sử để có thể undo/redo.

## 12. Search Nâng Cao và Command Palette
- Ô search trong mỗi pane hỗ trợ tìm sâu bằng `Enter`, kèm bộ lọc theo đuôi file, loại file/thư mục, dung lượng, ngày sửa và nội dung file text/code.
- Quick Command Palette mở bằng `Ctrl+Shift+P` hoặc nút **Command**, giúp gọi nhanh các lệnh thường dùng mà không cần rời bàn phím.
- Có thể kéo thả tab trên thanh tabs để đổi vị trí, giúp sắp xếp phiên làm việc gọn hơn.

## 13. Power Send Qua Mạng LAN
- Gửi trực tiếp nhiều file và folder giữa hai máy trong LAN bằng một mã tùy ý, không cần tài khoản, cloud hoặc nhập IP.
- Máy nhận tự tìm máy gửi bằng UDP discovery, sau đó tải dữ liệu trực tiếp qua HTTP streaming.
- Hỗ trợ giữ nguyên cấu trúc thư mục và tự tránh ghi đè khi thư mục đích có tên trùng.
- Power Send Manager hiển thị tiến trình, tốc độ, ETA, máy peer và cho phép dừng/xóa phiên.
- Có thể thêm nhiều nguồn vào cùng một mã gửi.
- API quản trị vẫn khóa ở localhost; cổng LAN chỉ phục vụ dữ liệu của offer có token tạm.
