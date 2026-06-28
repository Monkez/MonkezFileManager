# Hướng Dẫn Sử Dụng - Monkez File Manager

Monkez File Manager cung cấp các công cụ quản lý file trực quan, thuận tiện và có hiệu năng cao thông qua cấu trúc chia khung hình (Panes).

## 1. Bố Cục Khung Hình (Pane Layout)
- Ứng dụng hỗ trợ chia từ **1 Pane, 2 Panes (Mặc định)** cho đến **3 Panes** cùng lúc.
- Sử dụng các nút bấm tương ứng trên thanh công cụ trên cùng để thay đổi số lượng khung hình hoạt động.
- Để thao tác trên một khung hình bất kỳ, hãy nhấp chuột vào khung hình đó để kích hoạt (khung hình được kích hoạt sẽ hiển thị viền xanh sáng xung quanh).

## 2. Các Chế Độ Xem (View Modes)
Nhấp chuột vào biểu tượng **List/Grid** ở thanh công cụ của từng khung hình để chuyển đổi giữa 4 chế độ xem:
1. **Chi tiết (Chỉ chữ)**: Chế độ bảng hiển thị thông tin chi tiết của tất cả các file (Tên, Kích thước, Ngày cập nhật, Định dạng).
2. **Ảnh nhỏ (Small Grid)**: Chế độ ô lưới nhỏ hiển thị ảnh thumbnail cho ảnh/video và icon cho file khác.
3. **Ảnh vừa (Medium Grid)**: Chế độ hiển thị thumbnail cỡ trung bình thích hợp để duyệt nhanh ảnh/video.
4. **Ảnh lớn (Large Grid)**: Chế độ thumbnail cỡ lớn giúp xem trước chi tiết ảnh/video trực quan.

## 3. Thao Tác Kéo Thả (Drag & Drop)
- **Nội bộ**: Kéo thả tệp tin từ khung hình này sang khung hình khác để Copy hoặc Move.
- **Hệ điều hành**: 
  - Kéo tệp tin từ ngoài (Windows Explorer, Desktop) thả vào ứng dụng để nhập khẩu (Import/Copy) tệp tin vào thư mục hiện tại.
  - Kéo tệp tin từ bên trong ứng dụng thả ra Desktop hoặc thư mục khác trên máy tính để thực hiện xuất khẩu tệp tin.

## 4. Clipboard & Highlight Màu Sắc
Khi chọn tệp tin và thực hiện thao tác:
- **Sao chép (Ctrl + C)**: Font chữ và icon của các tệp tin được chọn sẽ được highlight bằng **Màu Xanh Dương**.
- **Cắt (Ctrl + X)**: Font chữ và icon của các tệp tin được chọn sẽ được highlight bằng **Màu Đỏ** đồng thời giảm độ mờ (opacity 70%) để biểu thị trạng thái đang chờ di chuyển.
- **Dán (Ctrl + V)**: Sau khi dán tệp tin thành công, tất cả các khung hình liên quan sẽ được tự động làm mới để cập nhật nội dung đồng bộ.
- Nếu dán file vào chính thư mục đang chứa file đó, ứng dụng tự tạo bản sao có tên `- Copy`, `- Copy 2`... thay vì báo lỗi.

## Task Manager

Khi copy hoặc di chuyển nhiều tệp/thư mục lớn, ứng dụng sẽ hiển thị bảng **Tasks** ở góc dưới bên phải. Bảng này cho biết trạng thái, phần trăm tiến độ, dung lượng đã xử lý, tốc độ hiện tại, ETA và cho phép tạm dừng, tiếp tục hoặc hủy tác vụ đang chạy.

Các pane sẽ tự làm mới sau khi task hoàn tất.

Khi nhiều task cùng sao chép tới một thư mục, Task Manager tự giữ chỗ tên đích để mỗi bản sao có tên riêng và không phát sinh lỗi `EEXIST`.

Task hoàn tất thành công sẽ hiện dấu xác nhận màu xanh trong khoảng 8 giây rồi tự biến mất. Task có lỗi hoặc bị hủy không tự ẩn để người dùng còn xem được nguyên nhân và trạng thái; dùng nút thùng rác để xóa chúng khỏi danh sách khi đã kiểm tra xong.

## Undo/Redo Và Xử Lý Trùng Tên

- Dùng `Ctrl + Z` để hoàn tác thao tác file gần nhất.
- Dùng `Ctrl + Y` hoặc `Ctrl + Shift + Z` để làm lại thao tác vừa hoàn tác.
- Undo/Redo hỗ trợ các thao tác tạo thư mục, tạo tệp, đổi tên, copy, move và đổi tên hàng loạt.
- Khi copy/move, hộp thoại sẽ có mục **Conflict resolver**:
  - **Keep both**: giữ cả hai, tự tạo tên dạng `- Copy`.
  - **Replace**: ghi đè mục đang có ở thư mục đích.
  - **Skip**: bỏ qua mục bị trùng tên.
  - **Error**: dừng và báo lỗi nếu gặp trùng tên.

## Search Nâng Cao

Ô filter trong mỗi pane vẫn lọc nhanh theo tên khi gõ. Nhấn `Enter` để tìm sâu trong toàn bộ cây thư mục hiện tại.

Bạn có thể dùng thêm cú pháp:

| Cú pháp | Ý nghĩa | Ví dụ |
| :--- | :--- | :--- |
| `ext:pdf` | Chỉ tìm file có đuôi cụ thể | `invoice ext:pdf` |
| `type:file` | Chỉ tìm file | `report type:file` |
| `type:folder` | Chỉ tìm thư mục | `backup type:folder` |
| `content:"abc"` | Tìm trong nội dung file text/code | `content:"TODO"` |
| `min:1048576` | File lớn hơn số byte chỉ định | `video min:1048576` |
| `max:5000000` | File nhỏ hơn số byte chỉ định | `log max:5000000` |
| `after:2026-01-01` | Sửa sau ngày chỉ định | `after:2026-01-01` |
| `before:2026-06-01` | Sửa trước ngày chỉ định | `before:2026-06-01` |

## Batch Rename Và Command Palette

- Chọn một hoặc nhiều file/thư mục, mở **Command** trên toolbar hoặc nhấn `Ctrl + Shift + P`, sau đó chọn **Đổi tên hàng loạt**.
- Công cụ đổi tên hàng loạt có preview trước khi áp dụng và sẽ cảnh báo nếu tên mới bị trùng.
- Pattern hỗ trợ `{name}` cho tên cũ, `{index}` cho số thứ tự và `{ext}` cho phần mở rộng.
- Command Palette cũng cho phép tạo file/thư mục, đổi layout pane, thêm bookmark, refresh, undo/redo và bật/tắt các tùy chọn hiển thị.

## Tabs

- Có thể kéo thả tab trên thanh tabs của từng pane để đổi thứ tự.
- Tab đã ghim vẫn được lưu lại cho lần mở ứng dụng sau.

## Power Send Trong Mạng LAN

### Gửi

1. Chọn một hoặc nhiều file/thư mục.
2. Nhấn chuột phải, chọn **Network Send**.
3. Nhập mã tùy ý hoặc dùng mã ứng dụng tạo sẵn.
4. Nhấn **Bắt đầu chờ nhận**.

### Nhận

1. Mở thư mục đích.
2. Nhấn chuột phải vào folder hoặc vùng trống, chọn **Network Receive Here**.
3. Nhập đúng mã từ máy gửi.
4. Nhấn **Tìm và tải về**.

Nút **Power Send** trên toolbar mở bảng quản lý tất cả phiên gửi/nhận. Có thể theo dõi tốc độ, ETA, dừng phiên hoặc xóa phiên khỏi danh sách.

Hai máy phải ở cùng mạng LAN. Windows Firewall có thể yêu cầu cấp quyền mạng lần đầu. Xem hướng dẫn đầy đủ tại `docs/power-send.md`.

## 5. Bảng Phím Tắt Tiện Ích

| Phím tắt | Thao tác | Mô tả |
| :--- | :--- | :--- |
| **Enter** | Mở thư mục / file | Kích hoạt thư mục con hoặc chạy file bằng app mặc định |
| **Backspace** | Go Up | Trở lại thư mục cha của thư mục hiện tại |
| **Ctrl + A** | Select All | Chọn tất cả tập tin và thư mục trong khung hình hiện tại |
| **Ctrl + C** | Copy | Copy các tệp được chọn vào clipboard (chữ xanh) |
| **Ctrl + X** | Cut | Cắt các tệp được chọn vào clipboard (chữ đỏ) |
| **Ctrl + V** | Paste | Dán các tệp từ clipboard vào thư mục hiện tại |
| **Ctrl + Z** | Undo | Hoàn tác thao tác file gần nhất |
| **Ctrl + Y** | Redo | Làm lại thao tác file vừa hoàn tác |
| **Ctrl + Shift + Z** | Redo | Cách khác để làm lại thao tác vừa hoàn tác |
| **Ctrl + Shift + P** | Command Palette | Mở bảng lệnh nhanh |
| **F2** | Đổi tên | Đổi tên tệp hoặc thư mục đang chọn |
| **Delete** | Xóa | Chuyển tệp hoặc thư mục đang chọn vào Thùng Rác |
| **Shift + Delete** | Xóa vĩnh viễn | Mở hộp thoại xác nhận xóa vĩnh viễn các tệp đã chọn |
| **Shift + Lên/Xuống** | Chọn nhiều tệp | Mở rộng vùng chọn tệp tin lên/xuống |
| **F5** | Copy to Target | Copy nhanh các tệp chọn sang khung hình lân cận |
| **F6** | Move to Target | Di chuyển nhanh các tệp chọn sang khung hình lân cận |
| **F7** | Tạo thư mục | Tạo một thư mục mới tại đường dẫn hiện tại |
