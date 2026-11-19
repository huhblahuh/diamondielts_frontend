# DIAMONDS-UI: giao diện chung các web Diamonds IELTS

Các web bài tập (Dictation, Reading, Writing, Speaking) dùng chung giao diện với Cổng Bài Tập (diamonds-ielts.netlify.app): nền phong cảnh vẽ bằng code đổi màu theo giờ, thẻ kính mờ viền vàng, logo trên cùng.

Bộ giao diện nằm trong một file: `diamonds-kit.js`. File `demo.html` là trang mẫu, mở bằng trình duyệt để xem (đặt cạnh `diamonds-kit.js`).

## 1. Nguyên tắc

**Chỉ thay phần vỏ.** Màu, khung, nền, font, vị trí thanh trên cùng. Không đụng Supabase, RPC, PIN, logic chấm bài, lưu bài, id của phần tử mà JS đang dùng, luồng màn hình. Không bớt hay thêm chức năng.

**Không sửa `diamonds-kit.js`.** File này giống hệt nhau ở mọi web. Muốn chỉnh gì riêng cho web nào thì viết CSS trong file html của web đó.

**Không tự vẽ lại các khối riêng của web** (thanh nghe audio, vòng quay, khung passage, bảng điểm giáo viên...). Chỉ đổi màu, bo góc, viền cho ăn khớp với bộ kit.

## 2. Cố định và tùy biến

Cố định, web nào cũng giống:
- Nền phong cảnh và dải trời do kit vẽ.
- Thanh trên cùng: nút "‹ Cổng" bên trái, logo kèm tên web ở giữa, bên phải là nút riêng của web rồi tới nút đổi chủ đề.
- Font Be Vietnam Pro, màu navy `#101d54` và vàng `#e0b762` / `#fff0a5`.
- Kiểu khung, nút, ô nhập, danh sách, nhãn trạng thái theo các class `dk-` ở mục 5.

Tùy theo từng web:
- Số màn, số nút, cách sắp xếp nội dung trong từng màn.
- Các khối chức năng riêng (chỉ phối màu cho khớp).

## 3. Màn nào có cảnh, màn nào nền trơn

Gọi `DK.mode("scene")` hoặc `DK.mode("plain")` mỗi khi chuyển màn (trong hàm chuyển màn sẵn có của web).

**`scene`, có phong cảnh:** màn học sinh lướt qua.
- Đăng nhập học sinh (chọn lớp, tên, PIN)
- Danh sách bài / màn chính của học sinh
- Màn nộp xong, xem điểm, kết quả
- Màn đăng nhập giáo viên
- Các màn ngắn khác của học sinh (ví, phần thưởng...)

**`plain`, nền trơn sáng, trên cùng có dải trời mỏng:** màn đọc hoặc gõ lâu, cần tập trung.
- Màn làm bài (gõ bài, nghe chép, đọc passage và trả lời)
- Màn xem lại bài chi tiết
- Toàn bộ phía giáo viên sau khi đăng nhập (bảng điều khiển, chấm bài, kho bài, cài đặt)

Ở chế độ `scene` chữ màu trắng trên kính tối. Ở `plain` chữ màu đậm trên nền trắng. Các class `dk-` tự đổi theo chế độ, không cần viết hai bộ CSS.

## 3b. Nền trơn (từ kit bản 3)

Trong bảng đổi chủ đề có ô "Nền trơn" cho học sinh khó nhìn. Bật lên thì kit coi mọi màn là `plain`: bỏ phong cảnh, chỉ giữ dải trời trên cùng, khung trắng chữ đậm. Kit tự nhớ theo máy và nhận từ cổng qua `?plain=1`.

Web không cần làm gì thêm, miễn là CSS riêng của web viết đúng hai chế độ:
- Chữ trắng, nền kính tối chỉ đặt trong `body.dk-mode-scene ...`. Không ghi cứng chữ trắng ở chỗ khác.
- Ở `body.dk-mode-plain` mọi thứ phải đọc được trên nền sáng.
- Muốn biết học sinh có đang bật Nền trơn: `DK.plain` (true/false), hoặc class `dk-plain-pref` trên `<body>`.

## 4. Cách gắn vào web

Đặt `diamonds-kit.js` cùng thư mục với file html. Trong html, ngay trước thẻ `<script>` chính của web:

```html
<script src="diamonds-kit.js"></script>
```

Đầu script chính (trước khi web dựng giao diện):

```js
DK.init({ app: "Writing", portal: "https://diamonds-ielts.netlify.app/" });
```

- `app`: tên web, hiện cạnh logo trên máy tính.
- `portal`: địa chỉ Cổng Bài Tập, dùng cho nút "‹ Cổng".
- Kit tự chèn: font, CSS, icon tab (logo), nền phong cảnh, dải trời, thanh trên cùng, nút và bảng đổi chủ đề, chim bay, sao băng.

Nút riêng của web trên thanh trên cùng (Đăng xuất, Giáo viên...): chuyển vào `DK.slot`. Nút ra khỏi tài khoản luôn ghi "Đăng xuất", không ghi "Thoát".

```js
DK.slot.appendChild(document.getElementById("btn-exit"));
```

Cho các nút này class `dk-pill`.

**Nút Giáo viên (vào phía giáo viên) KHÔNG để trên thanh trên cùng.** Đặt ở cuối khung đăng nhập học sinh, làm nút nhỏ `dk-btn alt sm`, căn giữa. Thanh trên cùng ở màn đăng nhập chỉ có: nút Cổng bài tập, logo, nút đổi chủ đề. Sau khi đăng nhập chỉ có: logo, nút Đăng xuất, nút đổi chủ đề. Ẩn hoặc hiện nút như cũ, kit không quản.

Bỏ thanh tiêu đề, logo, màu nền cũ của web, vì kit đã lo phần này.

**Nút "‹ Cổng bài tập" chỉ hiện ở màn đăng nhập học sinh.** Đăng nhập xong gọi `DK.portal(false)` (lúc này góc phải có nút Đăng xuất). Bấm Đăng xuất quay về màn đăng nhập thì gọi `DK.portal(true)`. Mở web mà đã đăng nhập sẵn (nhớ phiên) thì cũng gọi `DK.portal(false)`. Phía giáo viên sau khi đăng nhập: `DK.portal(false)`. Không để nút cổng và nút Đăng xuất cùng hiện một lúc.

Mỗi màn bọc nội dung trong `<main class="dk-page">` (màn rộng như làm bài, giáo viên: `dk-page wide`). Nếu không đổi được thẻ bọc thì cho thẻ đó cùng padding: trên cùng chừa 86px ở chế độ `scene`, 18px ở `plain`.

Tên tab: `Writing · Diamonds IELTS` (đổi tên web tương ứng).

## 5. Các class có sẵn

| Class | Dùng cho |
|---|---|
| `dk-page`, `dk-page wide` | Khung nội dung mỗi màn, rộng 560px / 900px |
| `dk-card` | Khung chính (kính mờ ở `scene`, thẻ trắng ở `plain`) |
| `dk-title`, `dk-sub`, `dk-label` | Tiêu đề, dòng phụ, nhãn ô nhập |
| `dk-btn` | Nút chính màu vàng. Thêm `block` (rộng hết), `alt` (nút phụ viền), `sm` (nhỏ) |
| `dk-input`, `dk-select`, `dk-textarea` | Ô nhập, ô chọn, khung gõ bài |
| `dk-pin` | Thêm vào ô PIN (chữ to, giãn cách). Ô PIN để trống, không có chữ gợi ý hay dấu chấm |
| `dk-msg` | Dòng báo lỗi dưới form |
| `dk-list` > `dk-item` | Danh sách bài. Trong item: `dk-item-b` chứa `dk-item-t` (tên) và `dk-item-s` (dòng phụ) |
| `dk-tag` | Nhãn trạng thái. Thêm `new` (vàng), `ok` (xanh), `warn` (cam), `bad` (đỏ) |
| `dk-seg` | Nút chuyển tab nhỏ, nút đang chọn có class `on` |
| `dk-score` | Số điểm to, chữ vàng |
| `dk-row`, `dk-row between`, `dk-gap` | Xếp hàng ngang, khoảng cách |
| `dk-pill` | Nút tròn dài kiểu kính trên thanh trên cùng |

Biến màu dùng được trong CSS riêng của web (tự đổi theo chế độ): `--dk-text`, `--dk-mute`, `--dk-line`, `--dk-surface`, `--dk-field`, `--dk-field-line`, `--dk-navy`, `--dk-gold`, `--dk-gold-hi`, `--dk-ok-t`, `--dk-warn-t`, `--dk-bad-t`.

Khối riêng của web nằm trên nền phong cảnh thì dùng `background: var(--dk-surface)` và viền `rgba(240,214,150,.45)`. Không đặt chữ trực tiếp lên phong cảnh mà không có khung, trừ tiêu đề lớn có `text-shadow`.

## 6. Chữ trên giao diện

Chữ hiện cho học sinh viết cực ngắn như web thật. Ví dụ: "Đã nộp · 19:51, 7/10", "Sai PIN · còn 4 lần", "Hạn 21:00, 18/10". Không viết câu giải thích dài. Không đổi nội dung chữ đang có, trừ khi chữ đó quá dài. Phía giáo viên viết dài hơn được.

## 7. Chủ đề nền

- Vào từ cổng: link có `?theme=...`, kit tự đọc rồi xóa khỏi thanh địa chỉ. Không đụng tham số khác của web.
- Học sinh chọn tay bằng nút đổi chủ đề: lưu lại cho lần sau.
- Không có hai thứ trên: bốc ngẫu nhiên.
- Xem thử khung giờ: thêm `?dkt=22` (giờ 22) vào link.

API: `DK.mode()`, `DK.portal(true/false)`, `DK.plain`, `DK.setPlain(true/false)`, `DK.theme`, `DK.setTheme(key)`, `DK.themes`, `DK.slot`, `DK.portalLink()`.

## 8. Kiểm tra trước khi giao file

- Mọi chức năng cũ chạy như trước: đăng nhập PIN, tải bài, lưu, nộp, phía giáo viên.
- Mỗi màn đúng chế độ ở mục 3.
- Khổ điện thoại 360px: không tràn ngang, thanh trên cùng không bị lẹm.
- Chữ đọc rõ trên nền ban ngày và ban đêm.
- Không còn logo, thanh tiêu đề, màu nền cũ.
