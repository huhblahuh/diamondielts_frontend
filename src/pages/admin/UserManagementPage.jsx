import React, { useEffect, useState } from 'react';
import styles from './UserManagementPage.module.css';
import axiosClient from '../../api/axiosClient';
import Swal from 'sweetalert2';
import Pagination from '../../components/Pagination';
import StudentProfileModal from '../../features/classroom/components/StudentProfileModal';

const PAGE_SIZE = 10;

export default function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [excelFile, setExcelFile] = useState(null);
    const [excelPreview, setExcelPreview] = useState(null);
    const [excelLoading, setExcelLoading] = useState(false);
    const [profileStudent, setProfileStudent] = useState(null);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [currentUserId, setCurrentUserId] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        username: '',
        role: 'Student',
        password: '',
        classIds: []
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
            Swal.fire('Lỗi!', 'Không thể tải dữ liệu. Vui lòng thử lại.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            const data = await axiosClient.get('/admin/classes');
            setClasses(data);
        } catch (error) {
            console.error("Error fetching classes:", error);
            Swal.fire(
                'Lỗi!',
                'Không thể tải danh sách lớp học.',
                'error'
            );
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchClasses();
    }, []);

    // Handle form change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            ...(name === 'role' && value !== 'Teacher'
                ? { classIds: [] }
                : {})
        }));
    };

    const toggleTeacherClass = (classId) => {
        setFormData(prev => ({
            ...prev,
            classIds: prev.classIds.includes(classId)
                ? prev.classIds.filter(id => id !== classId)
                : [...prev.classIds, classId]
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
            password: '',
            classIds: []
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
            password: '', // Keep empty to indicate no password change
            classIds: user.classIds || []
        });
        setFormErrors({});
        setIsModalOpen(true);
    };

    const openExcelModal = () => {
        setExcelFile(null);
        setExcelPreview(null);
        setIsExcelModalOpen(true);
    };

    const handleDownloadExcelTemplate = async () => {
        try {
            const blob = await axiosClient.get('/admin/users/import-excel/template', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'user-import-template.xlsx';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            Swal.fire('Không thể tải file mẫu!', error.message, 'error');
        }
    };

    const handlePreviewExcel = async () => {
        if (!excelFile) {
            Swal.fire('Thiếu dữ liệu!', 'Vui lòng chọn file Excel.', 'warning');
            return;
        }

        setExcelLoading(true);
        try {
            const body = new FormData();
            body.append('file', excelFile);
            const preview = await axiosClient.post('/admin/users/import-excel/preview', body, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setExcelPreview(preview);
        } catch (error) {
            setExcelPreview(null);
            Swal.fire('File Excel không hợp lệ!', error.message, 'error');
        } finally {
            setExcelLoading(false);
        }
    };

    const handleConfirmExcel = async () => {
        if (!excelPreview || excelPreview.invalidCount > 0) return;

        setExcelLoading(true);
        const failures = [];

        for (const item of excelPreview.users) {
            try {
                await axiosClient.post('/admin/users', item.user);
            } catch (error) {
                failures.push({
                    index: item.index,
                    username: item.user.username,
                    message: error.message
                });
            }
        }

        setExcelLoading(false);
        await fetchUsers();

        if (failures.length === 0) {
            setIsExcelModalOpen(false);
            Swal.fire('Thành công!', `Đã tạo ${excelPreview.validCount} người dùng.`, 'success');
            return;
        }

        Swal.fire({
            icon: 'warning',
            title: 'Hoàn tất một phần',
            text: `Đã tạo ${excelPreview.total - failures.length}/${excelPreview.total} người dùng. ${failures.map(item => `Dòng ${item.index} (${item.username}): ${item.message}`).join(' | ')}`
        });
        await handlePreviewExcel();
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
        const normalizedUsername = formData.username.trim().normalize('NFC');
        if (!normalizedUsername) {
            errors.username = 'Vui lòng nhập tên tài khoản';
        } else if (normalizedUsername.length > 50 || !/^[\p{L}\p{M}\p{N}\x21-\x7E]+$/u.test(normalizedUsername)) {
            errors.username = 'Tối đa 50 ký tự, không có khoảng trắng hoặc emoji';
        }
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
            Swal.fire('Thất bại!', 'Không thể lưu thông tin. Vui lòng thử lại.', 'error');
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
                    Swal.fire('Lỗi!', 'Không thể thực hiện thao tác. Vui lòng thử lại.', 'error');
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
                <div className={styles.headerActions}>
                    <button className={styles.btnImportExcel} onClick={openExcelModal}>
                        <i className="bi bi-file-earmark-excel"></i> Nhập bằng Excel
                    </button>
                    <button className={styles.btnAddUser} onClick={openCreateModal}>
                        <i className="bi bi-person-plus-fill"></i> Thêm Người Dùng
                    </button>
                </div>
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
                                <th>Lớp phụ trách</th>
                                <th>Vai Trò</th>
                                <th>Ngày Tạo</th>
                                <th style={{ textAlign: 'center' }}>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                                        <div className="spinner-border text-primary" role="status"></div>
                                        <div style={{ marginTop: '0.5rem', color: '#64748b' }}>Đang tải dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                        <i className="bi bi-people" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                        Không tìm thấy người dùng nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                pagedUsers.map(user => (
                                    <tr key={user.userId}>
                                        <td className={styles.idCell}>#{user.userId}</td>
                                        <td>
                                            {user.role === 'Student' ? (
                                                <button
                                                    type="button"
                                                    className={`${styles.userProfileCol} ${styles.profileButton}`}
                                                    onClick={() => setProfileStudent({ studentId: user.userId, fullName: user.fullName })}
                                                    aria-label={`Xem hồ sơ học viên ${user.fullName}`}
                                                >
                                                    <span className={`${styles.avatar} ${getRoleBadgeClass(user.role)}`}>
                                                        {user.fullName?.charAt(0).toUpperCase() || 'U'}
                                                    </span>
                                                    <span className={styles.fullNameText}>{user.fullName}</span>
                                                </button>
                                            ) : (
                                                <div className={styles.userProfileCol}>
                                                    <span className={`${styles.avatar} ${getRoleBadgeClass(user.role)}`}>
                                                        {user.fullName?.charAt(0).toUpperCase() || 'U'}
                                                    </span>
                                                    <span className={styles.fullNameText}>{user.fullName}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td><strong>{user.username}</strong></td>
                                        <td>{user.email}</td>
                                        <td className={styles.classCell}>
                                            {user.role === 'Teacher'
                                                ? (user.classNames?.join(', ') || 'Chưa phân lớp')
                                                : '—'}
                                        </td>
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
                                            maxLength={50}
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
                                            type={modalMode === 'edit' ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder={modalMode === 'create' ? 'Nhập mật khẩu ít nhất 6 ký tự' : 'Mật khẩu mới...'}
                                            className={formErrors.password ? styles.inputError : ''}
                                        />
                                        {formErrors.password && <small className={styles.errorText}>{formErrors.password}</small>}
                                    </div>
                                </div>

                                {formData.role === 'Teacher' && (
                                    <div className={styles.formGroup}>
                                        <label>Phân công lớp học</label>
                                        <div className={styles.classPicker}>
                                            {classes.length === 0 ? (
                                                <span className={styles.emptyClasses}>
                                                    Chưa có lớp học để phân công.
                                                </span>
                                            ) : classes.map(item => (
                                                <label
                                                    key={item.classId}
                                                    className={styles.classOption}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.classIds.includes(
                                                            item.classId
                                                        )}
                                                        onChange={() =>
                                                            toggleTeacherClass(
                                                                item.classId
                                                            )
                                                        }
                                                    />
                                                    <span>
                                                        {item.className}
                                                        {item.status
                                                            ? ` (${item.status})`
                                                            : ''}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
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

            {isExcelModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} ${styles.excelModal}`}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h4>Nhập người dùng bằng Excel</h4>
                                <p className={styles.modalSubtitle}>Kiểm tra danh sách trước, sau đó Confirm để tạo bằng API người dùng hiện có.</p>
                            </div>
                            <button className={styles.btnCloseModal} onClick={() => setIsExcelModalOpen(false)}>&times;</button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.excelUploadBox}>
                                <i className="bi bi-file-earmark-spreadsheet"></i>
                                <div>
                                    <strong>Chọn file Excel (.xlsx)</strong>
                                    <p>Các cột: FullName, Email, Username, Password, Role.</p>
                                </div>
                                <input
                                    type="file"
                                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                    onChange={(event) => {
                                        setExcelFile(event.target.files?.[0] || null);
                                        setExcelPreview(null);
                                    }}
                                />
                                {excelFile && <span className={styles.selectedFile}>{excelFile.name}</span>}
                                <button type="button" className={styles.btnTemplate} onClick={handleDownloadExcelTemplate}>
                                    <i className="bi bi-download"></i> Tải file mẫu
                                </button>
                                <small className={styles.excelHint}>Role hỗ trợ: Student, Teacher, Admin. File Excel không thực hiện phân lớp. Tối đa 200 user/lần.</small>
                            </div>

                            {excelPreview && (
                                <div className={styles.previewSection}>
                                    <div className={styles.previewSummary}>
                                        <strong>{excelPreview.total} người dùng</strong>
                                        <span className={styles.validSummary}>{excelPreview.validCount} hợp lệ</span>
                                        {excelPreview.invalidCount > 0 && (
                                            <span className={styles.invalidSummary}>{excelPreview.invalidCount} cần sửa</span>
                                        )}
                                    </div>
                                    <div className={styles.previewTableWrapper}>
                                        <table className={styles.previewTable}>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Họ tên</th>
                                                    <th>Tài khoản</th>
                                                    <th>Email</th>
                                                    <th>Role</th>
                                                    <th>Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {excelPreview.users.map(item => (
                                                    <tr key={item.index} className={!item.isValid ? styles.invalidRow : ''}>
                                                        <td>{item.index}</td>
                                                        <td>{item.user.fullName || '—'}</td>
                                                        <td>{item.user.username || '—'}</td>
                                                        <td>{item.user.email || '—'}</td>
                                                        <td>{item.user.role || '—'}</td>
                                                        <td>
                                                            {item.isValid ? (
                                                                <span className={styles.validStatus}><i className="bi bi-check-circle-fill"></i> Hợp lệ</span>
                                                            ) : (
                                                                <ul className={styles.previewErrors}>
                                                                    {item.errors.map(error => <li key={error}>{error}</li>)}
                                                                </ul>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <button type="button" className={styles.btnCancel} onClick={() => setIsExcelModalOpen(false)} disabled={excelLoading}>
                                Hủy bỏ
                            </button>
                            <button type="button" className={styles.btnPreview} onClick={handlePreviewExcel} disabled={excelLoading || !excelFile}>
                                <i className="bi bi-eye"></i> {excelPreview ? 'Kiểm tra lại' : 'Xem trước'}
                            </button>
                            {excelPreview && (
                                <button
                                    type="button"
                                    className={styles.btnSave}
                                    onClick={handleConfirmExcel}
                                    disabled={excelLoading || excelPreview.invalidCount > 0}
                                    title={excelPreview.invalidCount > 0 ? 'Hãy sửa tất cả dòng chưa hợp lệ trong Excel trước khi Confirm' : ''}
                                >
                                    {excelLoading ? 'Đang tạo...' : `Confirm & tạo ${excelPreview.validCount} user`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <StudentProfileModal student={profileStudent} onClose={() => setProfileStudent(null)} />
        </div>
    );
}
