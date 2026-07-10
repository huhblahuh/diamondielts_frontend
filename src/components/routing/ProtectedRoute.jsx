import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles = [] }) => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    let user = null;

    if (userRaw) {
        try {
            user = JSON.parse(userRaw);
        } catch (e) {
            user = null;
        }
    }

    // 1. Nếu không có Token -> Chưa đăng nhập -> Đá về /login
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // 2. Nếu có yêu cầu Role cụ thể mà User không khớp -> Cấm truy cập
    if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
        // Có thể redirect sang trang 403 hoặc Login tùy ý.
        return <Navigate to="/login" replace />; 
    }

    // 3. Hợp lệ -> Cho phép render component bên trong (Outlet)
    return <Outlet />;
};

export default ProtectedRoute;
