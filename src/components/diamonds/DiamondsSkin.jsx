/* Diamonds IELTS: gắn giao diện chung (diamonds-kit.js) vào web Speaking.
   Kit nạp ở index.html, file này chỉ báo cho kit biết đang ở màn nào.
   - scene: có phong cảnh (đăng nhập, các trang chính của học viên)
   - plain: nền trơn có dải trời (phòng thu Speaking, giáo viên và quản trị)
   Nút "Cổng bài tập" chỉ hiện ở màn đăng nhập. */
import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PORTAL = 'https://diamonds-ielts.netlify.app/';

const isAuthPage = (p) => p === '/login' || p === '/forgot-password';

function modeFor(path, search) {
  if (isAuthPage(path)) return 'scene';
  if (new URLSearchParams(search).get('offTopic') === '1') return 'scene';
  if (path.startsWith('/student/speaking/')) return 'plain';
  if (path.startsWith('/student')) return 'scene';
  return 'plain';
}

export default function DiamondsSkin() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    const DK = window.DK;
    if (!DK) return;
    const mode = modeFor(pathname, search);
    DK.init({ app: 'Speaking', portal: PORTAL, mode });
    DK.mode(mode);
    DK.portal(isAuthPage(pathname));
    const role = pathname.startsWith('/student') ? 'student' : isAuthPage(pathname) ? 'auth' : 'staff';
    document.body.dataset.dkRole = role;
  }, [pathname, search]);

  return null;
}
