# YamadaNihon AI — Media/UI upgrade

Bản này sửa UI chat theo feedback:
- Nút `+` mở một menu duy nhất chứa Camera, Ảnh/Video, Tệp, Plugin và Suy nghĩ sâu hơn.
- Menu tự đóng khi bấm ra ngoài.
- File đang chọn hiện ngay trong khung chat phía trên ô nhập; gửi xong tự biến mất.
- Khung chat mỏng/gọn hơn và vùng tin nhắn vẫn cuộn độc lập.
- Toast/UI tạm thời dùng `visibility + pointer-events` để không còn lớp ẩn nằm chắn click.
- Typing dots, upload media, fullscreen ảnh và tải media vẫn giữ nguyên.

Lưu ý: Plugin và Suy nghĩ sâu hơn hiện là UI; backend Gemini cần được nối riêng để các chế độ này thay đổi cách gọi model.
