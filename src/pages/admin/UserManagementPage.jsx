import React, { useEffect, useState } from 'react';
import styles from './UserManagementPage.module.css';
import axiosClient from '../../api/axiosClient';
import Swal from 'sweetalert2';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 10;

export default function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [currentUserId, setCurrentUserId] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        username: '',
        role: 'Student',
        password: ''
    });

    const [formErrors, setFormErrors] = useState({});

    // Fetch users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await axiosClient.get('/admin/users');
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
            Swal.fire('Lỗi!', error.message || 'Không thể tải danh sách người dùng.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Handle form change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Open Modal for Create
    const openCreateModal = () => {
        setModalMode('create');
        setCurrentUserId(null);
        setFormData({
            fullName: '',
            email: '',
            username: '',
            role: 'Student',
            password: ''
        });
        setFormErrors({});
        setIsModalOpen(true);
    };

    // Open Modal for Edit
    const openEditModal = (user) => {
        setModalMode('edit');
        setCurrentUserId(user.userId);
        setFormData({
            fullName: user.fullName,
            email: user.email,
            username: user.username,
            role: user.role,
            password: '' // Keep empty to indicate no password change
        });
        setFormErrors({});
        setIsModalOpen(true);
    };

    // Form validation
    const validateForm = () => {
        const errors = {};
        if (!formData.fullName.trim()) errors.fullName = 'Vui lòng nhập họ tên';
        if (!formData.email.trim()) {
            errors.email = 'Vui lòng nhập email';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Email không hợp lệ';
        }
        if (!formData.username.trim()) errors.username = 'Vui lòng nhập tên tài khoản';
        if (modalMode === 'create' && !formData.password) {
            errors.password = 'Vui lòng nhập mật khẩu';
        } else if (formData.password && formData.password.length < 6) {
            errors.password = 'Mật khẩu phải từ 6 ký tự trở lên';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle Submit
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            if (modalMode === 'create') {
                await axiosClient.post('/admin/users', formData);
                Swal.fire('Thành công!', 'Đã tạo tài khoản mới.', 'success');
            } else {
                await axiosClient.put(`/admin/users/${currentUserId}`, formData);
                Swal.fire('Thành công!', 'Đã cập nhật thông tin tài khoản.', 'success');
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error("Save User error:", error);
            Swal.fire('Thất bại!', error.message || 'Đã xảy ra lỗi khi lưu thông tin.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle Delete
    const handleDeleteUser = (user) => {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (Number(user.userId) === Number(currentUser.userId)) {
            Swal.fire('Lỗi!', 'Bạn không thể tự xóa tài khoản của chính mình.', 'error');
            return;
        }

        Swal.fire({
            title: 'Bạn có chắc chắn?',
            text: `Tài khoản "${user.fullName}" (${user.username}) sẽ bị xóa khỏi hệ thống.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Đồng ý xóa',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axiosClient.delete(`/admin/users/${user.userId}`);
                    Swal.fire('Đã xóa!', 'Người dùng đã bị xóa thành công.', 'success');
                    fetchUsers();
                } catch (error) {
                    console.error("Delete user error:", error);
                    Swal.fire('Lỗi!', error.message || 'Không thể xóa người dùng.', 'error');
                }
            }
        });
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.username?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === '' || user.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'Admin': return styles.badgeAdmin;
            case 'Teacher': return styles.badgeTeacher;
            default: return styles.badgeStudent;
        }
    };

    return (
        <div className={styles.container}>
            {/* Header section */}
            <div className={styles.header}>
                <div>
                    <h3>Quản Lý Người Dùng</h3>
                    <p>Thêm, sửa thông tin, đặt lại mật khẩu hoặc xóa tài khoản người dùng trong hệ thống.</p>
                </div>
                <button className={styles.btnAddUser} onClick={openCreateModal}>
                    <i className="bi bi-person-plus-fill"></i> Thêm Người Dùng
                </button>
            </div>

            {/* Filter and Search Panel */}
            <div className={styles.filterPanel}>
                <div className={styles.searchWrapper}>
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo Tên, Email, Tài khoản..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className={styles.searchInput}
                    />
                </div>
                <div className={styles.filters}>
                    <select
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                        className={styles.select}
                    >
                        <option value="">Tất cả vai trò</option>
                        <option value="Student">Học viên (Student)</option>
                        <option value="Teacher">Giáo viên (Teacher)</option>
                        <option value="Admin">Quản trị viên (Admin)</option>
                    </select>
                    <button className={styles.btnReset} onClick={() => { setSearchQuery(''); setRoleFilter(''); setCurrentPage(1); }}>
                        <i className="bi bi-arrow-counterclockwise"></i> Reset
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className={styles.tablePanel}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Mã NV/HV</th>
                                <th>Họ và Tên</th>
                                <th>Tên Tài Khoản</th>
                                <th>Email</th>
                                <th>Vai Trò</th>
                                <th>Ngày Tạo</th>
                                <th style={{ textAlign: 'center' }}>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                        <div className="spinner-border text-primary" role="status"></div>
                                        <div style={{ marginTop: '0.5rem', color: '#64748b' }}>Đang tải dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                        <i className="bi bi-people" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                        Không tìm thấy người dùng nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                pagedUsers.map(user => (
                                    <tr key={user.userId}>
                                        <td className={styles.idCell}>#{user.userId}</td>
                                        <td>
                                            <div className={styles.userProfileCol}>
                                                <div className={`${styles.avatar} ${getRoleBadgeClass(user.role)}`}>
                                                    {user.fullName?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <span className={styles.fullNameText}>{user.fullName}</span>
                                            </div>
                                        </td>
                                        <td><strong>{user.username}</strong></td>
                                        <td>{user.email}</td>
                                        <td>
                                            <span className={`${styles.roleBadge} ${getRoleBadgeClass(user.role)}`}>
                                                {user.role === 'Admin' ? 'Admin' : user.role === 'Teacher' ? 'Giáo Viên' : 'Học Viên'}
                                            </span>
                                        </td>
                                        <td className={styles.timeCell}>
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '---'}
                                        </td>
                                        <td>
                                            <div className={styles.actionGroup}>
                                                <button
                                                    className={styles.btnEdit}
                                                    onClick={() => openEditModal(user)}
                                                    title="Sửa thông tin"
                                                >
                                                    <i className="bi bi-pencil-square"></i> Sửa
                                                </button>
                                                {Number(user.userId) !== Number(JSON.parse(localStorage.getItem('user') || '{}').userId) && (
                                                    <button 
                                                        className={styles.btnDelete} 
                                                        onClick={() => handleDeleteUser(user)}
                                                        title="Xóa tài khoản"
                                                    >
                                                        <i className="bi bi-trash"></i> Xóa
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={(p) => setCurrentPage(p)}
            />

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h4>{modalMode === 'create' ? 'Tạo Tài Khoản Mới' : 'Sửa Thông Tin Tài Khoản'}</h4>
                            <button className={styles.btnCloseModal} onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className={styles.modalBody}>
                                <div className={styles.formGroup}>
                                    <label>Họ và Tên <span className={styles.required}>*</span></label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        placeholder="Nhập họ và tên..."
                                        className={formErrors.fullName ? styles.inputError : ''}
                                    />
                                    {formErrors.fullName && <small className={styles.errorText}>{formErrors.fullName}</small>}
                                </div>

                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label>Email <span className={styles.required}>*</span></label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="example@gmail.com..."
                                            className={formErrors.email ? styles.inputError : ''}
                                        />
                                        {formErrors.email && <small className={styles.errorText}>{formErrors.email}</small>}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Tên Đăng Nhập <span className={styles.required}>*</span></label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            placeholder="Tên tài khoản..."
                                            className={formErrors.username ? styles.inputError : ''}
                                        />
                                        {formErrors.username && <small className={styles.errorText}>{formErrors.username}</small>}
                                    </div>
                                </div>

                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label>Vai Trò (Role) <span className={styles.required}>*</span></label>
                                        <select
                                            name="role"
                                            value={formData.role}
                                            onChange={handleInputChange}
                                        >
                                            <option value="Student">Học viên (Student)</option>
                                            <option value="Teacher">Giáo viên (Teacher)</option>
                                            <option value="Admin">Quản trị viên (Admin)</option>
                                        </select>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Mật Khẩu {modalMode === 'create' ? <span className={styles.required}>*</span> : <span className={styles.optional}>(Bỏ trống nếu không đổi)</span>}</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder={modalMode === 'create' ? 'Nhập mật khẩu ít nhất 6 ký tự' : 'Mật khẩu mới...'}
                                            className={formErrors.password ? styles.inputError : ''}
                                        />
                                        {formErrors.password && <small className={styles.errorText}>{formErrors.password}</small>}
                                    </div>
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.btnCancel} onClick={() => setIsModalOpen(false)}>
                                    Hủy bỏ
                                </button>
                                <button type="submit" className={styles.btnSave} disabled={loading}>
                                    {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
