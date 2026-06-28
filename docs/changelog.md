# Nhật Ký Thay Đổi - Monkez File Manager

Tài liệu này ghi lại lịch sử thay đổi và cập nhật tính năng của Monkez File Manager.

## [1.6.1] - 28-06-2026

### Cải Tiến
- Power Send Manager hiển thị tên và đường dẫn đầy đủ của từng file/thư mục trong phiên gửi.
- Danh sách nguồn gửi có vùng cuộn riêng để vẫn dễ theo dõi khi gửi nhiều mục hoặc đường dẫn dài.
- Dán file vào chính thư mục hiện tại sẽ tự tạo tên `- Copy`, không còn tạo task lỗi `EEXIST`.
- Task Manager giữ chỗ tên đích để nhiều task đồng thời tự dùng `- Copy 2`, `- Copy 3`; move về chính thư mục được coi là đã hoàn tất mà không đổi tên file.
- Loại bỏ việc `Ctrl+V` bị xử lý hai lần bởi Pane và listener phím tắt toàn cục.
- Làm mới giao diện Task Manager với độ tương phản đúng theo theme, trạng thái tiếng Việt và thông tin dung lượng/tốc độ dễ đọc hơn.
- Task hoàn tất không có lỗi tự mờ và được xóa sau khoảng 8 giây; task lỗi hoặc bị hủy vẫn được giữ lại để kiểm tra.
- Thêm cài đặt hiện/ẩn Status Bar và dải gợi ý phím tắt dưới cùng; lựa chọn được ghi nhớ giữa các phiên.
- Thêm nút mũi tên để thu gọn/mở lại Topbar và ghi nhớ trạng thái Topbar.
- Nút cuộn trái/phải của thanh tab chỉ xuất hiện khi có tab bị che khuất.
- Bỏ nút khôi phục thư mục phiên trước khỏi thanh công cụ của Pane.

## [1.6.0] - 28-06-2026

### Thêm Mới
- Thêm **Power Send** để truyền trực tiếp nhiều file/thư mục giữa các máy trong cùng mạng LAN bằng mã gửi/nhận.
- Thêm `Network Send` trong menu chuột phải của file/thư mục và `Network Receive Here` trong menu của folder/vùng trống.
- Thêm UDP discovery để máy nhận tự tìm máy gửi theo mã, không cần nhập địa chỉ IP.
- Thêm HTTP streaming server riêng chỉ khởi động khi dùng Power Send, xác thực bằng token tạm cho từng offer.
- Thêm Power Send Manager hiển thị trạng thái chờ, gửi, nhận, tốc độ, ETA, peer và hỗ trợ dừng/xóa/copy mã.
- Thêm Command Palette actions cho Network Send, Network Receive và mở Power Send Manager.
- Thêm test loopback truyền thật nhiều file/thư mục qua HTTP, test gộp nguồn cùng mã và kiểm tra path nhận an toàn.
- Thêm tài liệu `docs/power-send.md`.

### Bảo Mật
- API quản trị chính tiếp tục chỉ lắng nghe trên localhost.
- Manifest truyền qua LAN không chứa đường dẫn tuyệt đối của máy gửi.
- Máy nhận chặn path traversal; symbolic link bị từ chối.
- Cổng stream LAN chỉ phục vụ offer hợp lệ có token tạm.

## [1.5.0] - 28-06-2026

### Thêm Mới
- Thêm Undo/Redo cho các thao tác file quan trọng: tạo thư mục, tạo tệp, đổi tên, copy, move và batch rename.
- Thêm Conflict Resolver cho copy/move với các chế độ: giữ cả hai, ghi đè, bỏ qua mục trùng, hoặc báo lỗi khi trùng tên.
- Thêm Batch Rename Tool có preview trước khi áp dụng, hỗ trợ pattern `{name}`, `{index}`, `{ext}`, tìm/thay thế, lowercase và uppercase.
- Thêm Quick Command Palette mở bằng `Ctrl+Shift+P` hoặc nút **Command** trên toolbar.
- Thêm Search nâng cao: lọc theo `ext:`, `type:`, `content:`, `min:`, `max:`, `after:` và `before:`.
- Thêm kéo thả tab để đổi vị trí tab trực tiếp trên thanh tabs của từng pane.

### Cải Tiến
- Task Manager hiển thị tốc độ xử lý, ETA, hỗ trợ pause/resume/cancel cho tác vụ nền.
- Copy/move task ghi lịch sử để có thể undo/redo sau khi hoàn tất.
- Batch Rename phát hiện xung đột tên mới giữa chính các mục được chọn, tránh rename dở dang.
- Bổ sung API `/api/history`, `/api/undo`, `/api/redo`, `/api/batch-rename/preview`, `/api/batch-rename/apply`.
- Bổ sung test cho batch rename conflict và undo/redo history, nâng tổng số test backend lên 10.

## [1.4.1] - 28-06-2026

### Cải Tiến
- Tách nhóm API thao tác file (`mkdir`, `mkfile`, `rename`, `delete`, `copy`, `move`, `foldersize`) sang `routes/fileOperations.routes.js` và `services/fileOperations.js`.
- Bổ sung test cho service thao tác file, nâng số test backend lên 8.
- Giảm rủi ro command injection cho `open`, `reveal`, `open-with` và `launch-tool` bằng cách chuyển sang `spawn` với mảng arguments.
- Tạm khóa dynamic shell command từ registry context menu cho tới khi có parser an toàn.

### Bảo Mật
- Chuẩn hóa path cho `open`, `reveal` và `open-with`.
- Loại bỏ nhiều vị trí ghép chuỗi lệnh shell với path người dùng.

## [1.4.0] - 27-06-2026

### Thêm Mới
- Thêm Task Manager nền cho copy/move, có API `/api/tasks/*`, tiến độ qua Server-Sent Events và UI hiển thị/cancel task.
- Thêm Zustand store cho task state phía frontend.
- Thêm test runner `npm test`, `test.bat`, test backend cho path guard và task manager.
- Thêm tài liệu `docs/architecture.md`, `docs/security.md`, `docs/testing.md`.

### Cải Tiến
- Tách backend entrypoint: `server.js` chỉ khởi động server, Express app nằm trong `app.js`.
- Thêm `pathGuard` để chuẩn hóa path và validate tên file/thư mục.
- Copy/move không ghi đè im lặng khi trùng tên; hệ thống tự tạo tên `- Copy`.
- Tách render bảng/lưới trong `Pane.jsx` thành `FileTable.jsx` và `FileGrid.jsx`.
- Khóa backend mặc định vào `127.0.0.1`, giới hạn Host/CORS về localhost.
- Chuyển ZIP/Unzip sang helper process an toàn hơn, tránh ghép lệnh shell trực tiếp với path người dùng.

## [1.3.0] - 25-06-2026

### Thêm Mới
- **Menu Ngữ Cảnh Động của Windows (Dynamic Context Menu)**: Tích hợp menu chuột phải gốc của Windows (như Git Bash, VS Code...) trực tiếp vào ứng dụng bằng cách đọc Registry. Hỗ trợ trích xuất biểu tượng ứng dụng (.exe) hiển thị trên menu.
- **Tích Hợp Windows Explorer**: Thêm file cài đặt để đưa tùy chọn "Open with Monkez File Manager" vào menu chuột phải của Windows. Ứng dụng tự động điều hướng tới thư mục được chọn khi khởi động.
- **Thùng Rác (Recycle Bin)**: Đổi hành vi mặc định của "Xóa" (Delete) thành chuyển vào Thùng Rác hệ thống. Xóa vĩnh viễn (Permanent Delete) được tách thành tùy chọn độc lập.
- **Bộ Cài Đặt (Installer)**: Tích hợp `electron-builder` để tạo bộ cài đặt NSIS tiêu chuẩn cho Windows.
- **Chọn Vùng Kéo Thả (Sweep Selection)**: Hỗ trợ dùng chuột drag để tạo vùng chọn bao quát nhiều tệp/thư mục.
- **Menu Ngữ Cảnh Bookmark**: Cho phép chuột phải vào mục Bookmark để thao tác tiện lợi hơn.
- **Biểu Tượng Menu Ngữ Cảnh**: Thêm icon minh họa vào các lệnh trên menu chuột phải (Context Menu) giúp nhận diện nhanh chóng.

### Cải Tiến và Sửa Lỗi
- Đảm bảo tiến trình backend Node.js được tắt hoàn toàn khi đóng cửa sổ chính, tránh treo ngầm.
- Sắp xếp lại thứ tự các nút chức năng trên thanh công cụ để tối ưu UI/UX.

## [1.2.3] - 24-06-2026

### Sửa Lỗi
- **Sửa lỗi triệt để khởi động màn hình trống do EADDRINUSE**: Chuyển phần nạp server backend vào sau khi kiểm tra Single Instance Lock, đảm bảo tiến trình thứ hai không cố gắng khởi chạy backend trước khi kịp đóng ứng dụng.

### Sửa Lỗi
- **Sửa lỗi khởi động màn hình trống do EADDRINUSE**: Thêm khóa phiên bản duy nhất (Single Instance Lock) vào tiến trình chính của ứng dụng. Điều này ngăn chặn việc mở nhiều ứng dụng đồng thời gây xung đột cổng kết nối `3001` của backend. Giờ đây, mở lần hai sẽ tự động gọi cửa sổ ứng dụng đang chạy hiện tại lên trên cùng.

## [1.2.1] - 24-06-2026

### Thêm Mới
- **Chọn nhiều tệp bằng phím tắt**: Hỗ trợ giữ phím `Shift` kết hợp phím mũi tên Lên/Xuống để mở rộng vùng chọn nhiều tệp tin liên tiếp.
- **Xóa vĩnh viễn nhiều tệp**: Hỗ trợ phím tắt `Shift+Delete` và tùy chọn "Permanent Delete" trong menu ngữ cảnh để xóa trực tiếp (không qua thùng rác), hiển thị hộp thoại cảnh báo với toàn bộ danh sách tệp được chọn.
- **Toggles hiển thị nhanh**: Bổ sung nút chuyển đổi bật/tắt nhanh Tệp tin ẩn (Hidden Items) và Phần mở rộng tệp (File Extensions) trực tiếp trên thanh công cụ chính (Global Toolbar).

## [1.2.0] - 24-06-2026

### Thêm Mới
- **Tách 3 Menu Quick Access và Sửa lỗi khởi chạy Control Panel**:
  - Tách dropdown Bookmarks cũ thành **3 menu độc lập** trên thanh công cụ: Bookmarks cá nhân (icon Ngôi sao), Thư mục hệ thống (icon Thư mục), và Công cụ quản trị (icon Tiện ích).
  - Bổ sung nhiều thư mục hệ thống Windows: Desktop, Downloads, Documents, Pictures, Videos, Music, User Profile, Program Files, Program Files (x86), Windows (C:\Windows), AppData, và Temp.
  - Bổ sung nhiều công cụ tiện ích quản trị: Control Panel, Windows Settings, Add or Remove Programs, Task Manager, Disk Management, Device Manager, Registry Editor, Services, Resource Monitor, CMD, và PowerShell.
  - Sửa triệt để lỗi mở Control Panel hiển thị thông báo cảnh báo lỗi bằng cách sử dụng luồng chạy độc lập `start` và phản hồi kết quả tức thì từ backend.
- **Khôi phục thư mục phiên làm việc trước (Restore Last Folder)**: Bổ sung nút khôi phục lịch sử (icon đồng hồ) ở thanh điều hướng mỗi Pane. Khi ứng dụng khởi động lại hoặc máy tính reboot, click nút này sẽ mở lại thư mục hoạt động cuối cùng của Pane đó ở phiên làm việc trước. Nút tự động ẩn/disable khi Pane đã ở đúng thư mục đó.

### Cải Tiến
- **Nút ổ cứng nhanh chi tiết ở đầu Pane**: Nâng cấp các nút ổ đĩa cục bộ ở đầu mỗi Pane hiển thị đầy đủ icon ổ đĩa, tên nhãn ổ đĩa + chữ cái phân vùng (ví dụ: `Local Disk (C:)`), cùng thông tin dung lượng thực tế của ổ đĩa (`[Dung lượng trống] trống / [Tổng dung lượng]`). Hiển thị vạch màu tiến trình trực quan phủ lên ổ đĩa biểu diễn tỉ lệ dung lượng đã sử dụng (đổi màu Xanh -> Vàng -> Đỏ theo dung lượng trống).

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
