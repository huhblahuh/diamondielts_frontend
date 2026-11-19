# Web Speaking · Diamonds IELTS (frontend)

Hướng dẫn cho Claude khi làm việc trên kho này. Kho là phần giao diện (frontend) của web Speaking, viết bằng React và Vite, chạy tại https://diamonds-speaking.netlify.app. Kho thuộc thầy Vinh. Bạn dev bên ngoài là cộng tác viên và vẫn sửa kho thường xuyên.

**Kho đang công khai.** Không đưa vào kho: mật khẩu, khóa, file tài khoản học sinh, cách đặt username và mật khẩu, tên lớp, chuyện chi phí hay hợp đồng với bạn dev. Những thứ đó nằm ở Project "Website Speaking" bên claude.ai của thầy.

## Ranh giới

- **Frontend (kho này):** của thầy. Claude được sửa, mở pull request, gộp khi thầy duyệt.
- **Backend:** bạn dev giữ, Claude không xem và không sửa được. Gồm tài khoản, lớp, bài tập, bài nộp, file ghi âm, chấm điểm, chuyển giọng nói thành chữ, gửi email, CORS. Địa chỉ server nằm trong biến `VITE_API_URL`, không có trong kho.
- Lỗi phía server (đăng nhập xoay mãi, lỗi CORS, chấm không ra điểm, không nhận được email): chỉ chẩn đoán rồi soạn lời nhắn để thầy gửi bạn dev. Không đoán mò cách server chạy. Chỗ nào không chắc thì nói rõ là phải hỏi bạn dev.
- Lời nhắn cho bạn dev (hoặc AI bên bạn dev): viết như ghi chú kỹ thuật, ngắn, rõ, không kiểu tin nhắn tâm sự.
- Web không dùng Supabase. Không cần environment hay mã riêng, mở phiên với environment nào cũng được.

## Cách sửa

- Bạn dev đẩy thẳng lên `main` thường xuyên. Claude không đẩy thẳng lên `main`: sửa trên nhánh mới, mở pull request. GitHub Actions (`.github/workflows/netlify.yml`) tự đăng bản xem thử `pr-N--...netlify.app` và ghi link vào pull request. Gửi link cho thầy, thầy duyệt mới gộp. Gộp vào `main` là đăng web thật, khoảng 2 đến 3 phút, thầy tải lại bằng Ctrl + F5.
- Trước khi sửa, lấy bản `main` mới nhất. Sửa xong chạy `npm ci` rồi `npx vite build` để chắc build không lỗi. Không commit thư mục `dist`.
- Giữ nguyên kiểu xuống dòng (CRLF hoặc LF) của từng file. Không để script ghi lại cả file làm đổi kiểu xuống dòng.
- Đổi giao diện lớn: dựng bản xem trước cho thầy xem trước. Sửa nhỏ, rõ ràng (đổi chỗ nút, sửa chữ): làm luôn.
- Lời nhắn commit và pull request viết tiếng Việt, ngắn.

## Giao diện chung

- Luật giao diện chung của mọi web Diamonds: `docs/DIAMONDS-UI.md` (chép từ kho `diamonds-portal`, là bản gốc).
- Kit ở `public/diamonds-kit.js`. Không sửa tay. Có bản kit mới thì thay nguyên file.
- Bạn dev đã dựng lại phần giao diện trong React (từ tháng 11/2026). Đọc `src/styles/README.md` trước khi đụng giao diện: `components/diamonds/DiamondsLayout.jsx` giữ cảnh nền, header và nút đổi chủ đề, `components/diamonds/studentLayoutPolicy.js` quyết định màn nào hiện cảnh nền, `design-tokens.css` giữ cỡ chữ và khoảng cách. File `DiamondsSkin.jsx` và hàm `modeFor()` trong ghi chú cũ không còn nữa.
- CSS riêng từng màn nằm trong file `.module.css` của màn đó. Giữ phần ghi đè bạn dev đã làm cho học sinh và giáo viên.
- Nút ra khỏi tài khoản luôn ghi "Đăng xuất".
- Không dùng `@import` Google Fonts trong CSS của trang tải lười. Từng làm trắng cả app.

## Chữ trên giao diện

- Chữ cho học sinh cực ngắn như web thật, ví dụ "Đã nộp · 19:51, 7/10". Không câu giải thích dài.
- Phía giáo viên và quản trị viết dài hơn được.
- Không dùng dấu gạch ngang dài và dấu chấm phẩy.

## Làm việc với thầy Vinh

- Tiếng Việt, câu ngắn, nói thẳng. Không dùng dấu gạch ngang dài, không dùng dấu chấm phẩy.
- Thầy không rành kỹ thuật. Hướng dẫn kiểu bấm đâu, gõ gì, mỗi lần một hai bước.
- Bàn hết phương án rồi mới làm. Thầy chỉ hỏi để hiểu thì giải thích thôi, không tự sửa.
- Không bao giờ xin hay lưu mật khẩu tài khoản quản trị.
- **Khung trạng thái (thầy chốt 19/11/2026, thầy chỉ đọc cuối tin nhắn).** Khi đang làm việc cho thầy (sửa code, chạy lệnh, xuất file, deploy, có việc chờ thầy quyết hoặc thầy cần làm tiếp), kết thúc câu trả lời bằng một khung trạng thái đặt cuối cùng, sau khung không viết gì thêm. Hỏi đáp bình thường, câu hỏi cơ bản thì không cần khung.
  - Khung gồm dòng nhãn, rồi dòng "**Anh:** <việc thầy cần làm tiếp>". Không có việc gì thì ghi "**Anh:** chưa cần làm gì." (nhãn và chữ "Anh:" giữ y như vậy ở mọi kho của thầy).
  - Chỉ dùng 4 nhãn, không emoji nào khác:
    - `🔄 **ĐANG CHẠY:**` việc còn đang chạy, ghi khoảng bao lâu nữa xong.
    - `✅ **XONG:**` đã xong.
    - `❓ **CHỜ ANH:**` chờ thầy quyết.
    - `⛔ **KẸT:**` có lỗi không tự gỡ được, ghi cái gì hỏng và thầy cần làm gì.
  - Với CHỜ ANH: dòng nhãn chỉ ghi ngắn đang chờ cái gì. Mọi lựa chọn đặt hết ở dòng **Anh:**, mỗi lựa chọn một hàng gạch đầu dòng dạng "**A** = ..." hoặc "**1** = ...", để thầy trả lời một chữ. Không bao giờ để các lựa chọn chung một hàng.
- Danh sách lựa chọn nào cũng đánh sao ở cuối hàng lựa chọn mình nghiêng về. "⭐ em khuyên": lựa chọn về công việc, có phương án an toàn hơn hoặc tốt hơn. "⭐ em đề xuất": chuyện gu và ý tưởng, không có đúng sai. Chỉ là gợi ý, thầy vẫn là người chọn.

## Việc còn treo

- Hai lỗi có từ bản gốc, cần thử trên web thật. Còn thì báo bạn dev, hoặc tự sửa nếu là lỗi frontend:
  - Trang `/student/dashboard/progress` trắng màn (`Cannot read properties of undefined (reading 'slice')`).
  - Ô Diamond ở trang chủ học viên hiện "Còn NaN/NaN diamond".
