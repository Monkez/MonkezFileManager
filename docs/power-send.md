# Power Send - Truyền File Nhanh Trong Mạng LAN

Power Send giúp truyền trực tiếp nhiều file và thư mục giữa hai máy tính đang dùng Monkez File Manager trong cùng mạng LAN. Không cần tài khoản, không cần nhập địa chỉ IP và không tải dữ liệu lên cloud.

## 1. Gửi File Hoặc Thư Mục

1. Chọn một hoặc nhiều file/thư mục.
2. Nhấn chuột phải và chọn **Network Send**.
3. Nhập mã gửi tùy ý hoặc dùng mã 6 ký tự được ứng dụng tạo sẵn.
4. Nhấn **Bắt đầu chờ nhận**.
5. Giữ ứng dụng mở cho tới khi máy nhận tải xong.

Có thể thêm nhiều file/thư mục vào cùng một mã. Nếu tạo Network Send mới với cùng mã trên cùng máy, ứng dụng sẽ gộp thêm các mục vào offer đang chờ.

## 2. Nhận File

1. Trên máy nhận, mở thư mục muốn lưu dữ liệu.
2. Nhấn chuột phải vào thư mục hoặc vùng trống và chọn **Network Receive Here**.
3. Nhập đúng mã từ máy gửi.
4. Nhấn **Tìm và tải về**.

Ứng dụng sẽ broadcast trong LAN để tìm máy có mã tương ứng, sau đó tải trực tiếp toàn bộ file và cấu trúc thư mục.

Nếu thư mục đích đã có mục trùng tên, Power Send sẽ tự tạo tên dạng `- Copy`, `- Copy 2` để tránh ghi đè dữ liệu.

## 3. Power Send Manager

Mở bằng nút **Power Send** trên toolbar hoặc Command Palette.

Panel hiển thị:

- phiên đang chờ máy nhận;
- phiên đang tìm máy gửi;
- file/thư mục đang được truyền;
- phần trăm, dung lượng, tốc độ và ETA;
- tên máy và địa chỉ peer;
- lỗi nếu kết nối thất bại.

Các nút quản lý:

- **Copy mã**: sao chép mã gửi.
- **Dừng**: hủy phiên đang chờ hoặc đang truyền.
- **Xóa**: xóa phiên đã dừng, hoàn tất hoặc lỗi khỏi danh sách.

## 4. Yêu Cầu Mạng

- Hai máy phải ở cùng mạng LAN hoặc cùng subnet có hỗ trợ UDP broadcast.
- Windows Firewall có thể hỏi quyền truy cập mạng trong lần đầu dùng. Cần cho phép ứng dụng trên **Private networks**.
- Router có bật AP/Client Isolation có thể chặn các thiết bị nhìn thấy nhau.
- UDP discovery mặc định dùng cổng `38492`.
- File được stream qua một cổng TCP ngẫu nhiên do ứng dụng mở khi bắt đầu dùng Power Send.

Có thể đổi cổng discovery bằng biến môi trường:

```powershell
$env:POWER_SEND_DISCOVERY_PORT = "38493"
```

Hai máy phải dùng cùng một cổng discovery.

## 5. Bảo Mật Và Giới Hạn

- API quản trị chính của Monkez File Manager vẫn chỉ lắng nghe trên localhost.
- Cổng LAN của Power Send chỉ cung cấp manifest và file của offer đã tạo.
- Mỗi offer dùng token ngẫu nhiên tạm thời, chỉ được gửi về máy đã hỏi đúng hash của mã.
- Đường dẫn tuyệt đối của máy gửi không được đưa vào manifest.
- Máy nhận kiểm tra path traversal trước khi tạo file.
- Symbolic link không được hỗ trợ để tránh đọc dữ liệu ngoài cây thư mục đã chọn.
- Dữ liệu hiện truyền trực tiếp bằng HTTP trong LAN và **chưa mã hóa đầu cuối**. Không nên dùng trên Wi-Fi công cộng hoặc mạng không đáng tin cậy.
- Mã phân biệt chữ hoa/chữ thường. Nên dùng mã khó đoán.

Lịch sử Power Send hiện được lưu trong bộ nhớ và sẽ mất khi đóng ứng dụng.

## 6. Xử Lý Sự Cố

### Không tìm thấy máy gửi

- Kiểm tra hai máy đang cùng Wi-Fi/LAN.
- Kiểm tra mã có đúng chữ hoa/chữ thường.
- Cho phép Monkez File Manager qua Windows Firewall trên Private networks.
- Tắt tạm VPN hoặc kiểm tra adapter mạng đang dùng.
- Kiểm tra router có bật AP Isolation hay không.

### Truyền bị dừng giữa chừng

- File đang tải sẽ dùng đuôi tạm `.powersend-...part`.
- Khi phiên lỗi hoặc bị hủy, ứng dụng cố gắng xóa file tạm.
- Có thể tạo lại Network Receive với cùng mã để tải lại từ đầu.
