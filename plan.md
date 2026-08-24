Plan Sửa Animation Homepage
Mục tiêu
Homepage Angular phải có hành vi tương tự homepage-sample.html:
- CV mặc định có hiệu ứng 3D khi đưa chuột vào.
- Ba CV phía dưới bay phất phơi liên tục.
- Hover CV làm CV nổi lên, phóng nhẹ và nằm trên các CV khác.
- Animation vẫn chạy dù browser bật prefers-reduced-motion.
1. Sửa điều kiện chặn animation
File: src/app/features/home/profile-card/profile-card.component.ts
- Bỏ điều kiện prefers-reduced-motion trong onPointerMove().
- Vẫn giữ kiểm tra window để hỗ trợ SSR.
- Có thể giữ kiểm tra pointer: coarse vì thiết bị cảm ứng không có hover chuột thực sự.
File: src/app/features/home/home.component.scss
- Xóa media query:
@media (prefers-reduced-motion: reduce)
- Không đặt animation: none cho .float-card-1, .float-card-2, .float-card-3.
2. Đồng bộ hover tilt của CV mặc định
File: src/app/features/home/profile-card/profile-card.component.html
- Giữ sự kiện hover trên article.profile-card, vì đây là phần tử hiển thị thực tế.
- Không chuyển tilt lên #hero-main-cv, vì wrapper này đang được GSAP điều khiển transform khi scroll. Gộp hai animation vào cùng phần tử sẽ gây xung đột transform.
File: src/app/features/home/profile-card/profile-card.component.ts
- Giữ cách tính --tilt-x, --tilt-y, --tilt-lift.
- Đảm bảo pointermove cập nhật liên tục.
- pointerleave phải reset đầy đủ các biến tilt.
File: src/app/features/home/profile-card/profile-card.component.scss
- Giữ công thức transform:
perspective(...)
rotateX(...)
rotateY(...)
translateY(...)
- Bổ sung hiệu ứng scale khi hover cho card compact, tương đương:
hover:scale-[1.02]
- Không để hover scale phá vỡ công thức tilt hiện tại.
3. Đồng bộ floating animation cho ba CV
File: src/app/features/home/home.component.scss
- Giữ các keyframe hiện tại vì chúng đã tương đương sample:
- floatCard1
- floatCard2
- floatCard3
- Đảm bảo mỗi host nhận đúng animation:
.float-card-1
.float-card-2
.float-card-3
- Giữ delay và thời lượng khác nhau để ba CV bay lệch pha.
- Không đặt animation: none ở media query nào khác.
File: src/app/features/home/home.component.html
- Giữ việc gán class theo index hiện tại.
- Kiểm tra Angular thực sự gán class lên host app-profile-card.
- Nếu cần, chuyển class floating thành input/class rõ ràng trên component để tránh animation bị áp dụng sai phần tử.
4. Sửa trạng thái tương tác của ba CV sau GSAP reveal
File: src/app/features/home/home.component.ts
- pointer-events: none chỉ được dùng trước khi ba CV xuất hiện.
- Khi timeline reveal hoàn tất, bắt buộc chuyển sang:
pointerEvents: 'auto'
- Kiểm tra ScrollTrigger không giữ pointer-events: none sau khi timeline bị refresh hoặc resize.
- Đảm bảo animation floating không bị reset khi GSAP chạy transform trên #hero-split-trio.
File: src/app/features/home/home.component.scss
- Giữ opacity: 0 ban đầu cho hiệu ứng reveal.
- Không để CSS tĩnh ghi đè pointer-events: auto do GSAP thiết lập.
5. Tránh xung đột transform
Phân chia rõ quyền điều khiển:
- #hero-main-cv: GSAP scroll animation.
- #hero-split-trio: GSAP reveal animation.
- app-profile-card host: floating animation.
- .profile-card bên trong: hover tilt và hover scale.
Không gắn floating animation và tilt vào cùng một phần tử nếu không dùng CSS variables để hợp nhất transform.
6. Bổ sung trạng thái hover trực quan
File: src/app/features/home/home.component.scss
Khi hover một CV:
- Tăng z-index.
- Scale nhẹ 1.02.
- Giữ floating animation.
- Tăng nhẹ brightness hoặc shadow.
- Không làm mất transform tilt.
7. Kiểm tra sau khi sửa
Kiểm tra thủ công:
- Tắt/bật prefers-reduced-motion trong DevTools, animation vẫn phải chạy.
- Hover CV mặc định, kiểm tra tilt theo vị trí chuột.
- Rời chuột khỏi CV, card phải trở về trạng thái ban đầu.
- Scroll đến phần ba CV, kiểm tra cả ba card đều bay lệch pha.
- Hover từng CV, card phải nổi lên trên và scale nhẹ.
- Resize desktop/mobile, kiểm tra không bị kẹt pointer-events: none.
- Kiểm tra tab button vẫn hoạt động và không bị hover card chặn.
Kiểm tra kỹ thuật:
npm test -- --watch=false
npm run build
Kết quả mong muốn
Sau khi hoàn thành, animation sẽ không còn bị tắt bởi prefers-reduced-motion, CV mặc định sẽ tilt giống sample, ba CV sẽ floating liên tục, và hover sẽ hoạt động sau khi GSAP reveal chúng.