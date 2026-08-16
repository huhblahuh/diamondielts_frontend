import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import Swal from 'sweetalert2';
import styles from './ClassroomManagement.module.css';

// Import new modular sub-components
import ClassroomGrid from './components/ClassroomGrid';
import MemberListTab from './components/MemberListTab';
import DeadlineListTab from './components/DeadlineListTab';
import AddMemberModal from './components/AddMemberModal';
import FolderConfigModal from './components/FolderConfigModal';
import ClassroomFormModal from './components/ClassroomFormModal';
import StudentDetailsModal from './components/StudentDetailsModal';

export default function ClassroomManagement() {
    const navigate = useNavigate();
    const location = useLocation();
    // DATA STATES
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [detailedClass, setDetailedClass] = useState(null);
    const [deadlines, setDeadlines] = useState([]);
    const [usersPool, setUsersPool] = useState([]);
    const [oldExercises, setOldExercises] = useState([]);

    // UI STATES
    const [currentTab, setCurrentTab] = useState('students'); // 'students' | 'deadlines'
    const [loading, setLoading] = useState(false);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [folderAssignmentId, setFolderAssignmentId] = useState(null);

    // CLASSROOM CRUD STATES
    const [showClassFormModal, setShowClassFormModal] = useState(false);
    const [classFormMode, setClassFormMode] = useState('create'); // 'create' | 'edit'
    const [editingClass, setEditingClass] = useState(null);

    // STUDENT DETAILS STATES
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [selectedStudentName, setSelectedStudentName] = useState('');

    // Auto-select class if returning from AssignmentReviewPage
    useEffect(() => {
        if (location.state?.classId && classes.length > 0) {
            const targetClass = classes.find(c => c.classId === location.state.classId);
            if (targetClass) {
                handleSelectClass(targetClass);
                // Clear the state to avoid loop
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [classes, location.state]);

    const fetchClasses = async () => {
        try {
            setLoading(true);
            const data = await axiosClient.get('/teacher/classroom');
            setClasses(data || []);
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Không thể tải danh sách lớp học từ máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch initial list of classes from DB
    useEffect(() => {
        fetchClasses();
    }, []);

    // CLASS CRUD HANDLERS
    const handleOpenCreateClass = () => {
        setClassFormMode('create');
        setEditingClass(null);
        setShowClassFormModal(true);
    };

    const handleOpenEditClass = (cls) => {
        setClassFormMode('edit');
        setEditingClass(cls);
        setShowClassFormModal(true);
    };

    const handleSaveClass = async (formData) => {
        setLoading(true);
        try {
            if (classFormMode === 'create') {
                await axiosClient.post('/teacher/classroom', formData);
                Swal.fire('Thành công', 'Đã tạo lớp học mới!', 'success');
            } else {
                await axiosClient.put(`/teacher/classroom/${editingClass.classId}`, formData);
                Swal.fire('Thành công', 'Đã cập nhật thông tin lớp học!', 'success');
            }
            setShowClassFormModal(false);
            fetchClasses();
        } catch (error) {
            console.error("Save class error:", error);
            Swal.fire('Thất bại', 'Không thể lưu thông tin. Vui lòng thử lại.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClass = (cls) => {
        Swal.fire({
            title: 'Xác nhận xóa?',
            text: `Bạn có chắc chắn muốn xóa lớp học "${cls.className}"? Tất cả thông tin lớp và điểm số sẽ bị ẩn.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Xóa ngay',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                setLoading(true);
                try {
                    await axiosClient.delete(`/teacher/classroom/${cls.classId}`);
                    Swal.fire('Thành công', 'Đã xóa lớp học thành công!', 'success');
                    fetchClasses();
                } catch (error) {
                    console.error("Delete class error:", error);
                    Swal.fire('Lỗi', 'Không thể thực hiện thao tác. Vui lòng thử lại.', 'error');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    // STUDENT DETAILS HANDLERS
    const handleOpenStudentDetails = (studentId, fullName) => {
        setSelectedStudentId(studentId);
        setSelectedStudentName(fullName);
        setShowStudentModal(true);
    };

    const handleViewSubmission = (assignmentId, itemId) => {
        setShowStudentModal(false);
        navigate(`/teacher/assignment/${assignmentId}`, {
            state: { itemId, studentId: selectedStudentId }
        });
    };

    // 2. When a class is clicked, fetch detail and reset tab
    const handleSelectClass = async (cls) => {
        setSelectedClass(cls);
        setCurrentTab('deadlines');
        setDetailedClass(null); // reset
        try {
            setLoading(true);
            const details = await axiosClient.get(`/teacher/classroom/${cls.classId}`);
            setDetailedClass(details);
        } catch (err) {
            console.error(err);
            Swal.fire('Thông báo', 'Có lỗi khi tải chi tiết lớp học.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchDeadlines = async () => {
        if (!selectedClass) return;
        try {
            const data = await axiosClient.get(`/teacher/assignment/class/${selectedClass.classId}`);
            setDeadlines(data || []);
        } catch (err) {
            console.error("Failed to load deadlines:", err);
        }
    };

    // 3. When tab is Deadline, fetch assignments from DB
    useEffect(() => {
        if (selectedClass && currentTab === 'deadlines') {
            fetchDeadlines();
        }
    }, [selectedClass, currentTab]);

    const handleBack = () => {
        setSelectedClass(null);
        setDetailedClass(null);
        setCurrentTab('students');
    };

    // Pre-fetch old exercises pool for folder modals
    const fetchOldExercises = async () => {
        try {
            const allEx = await axiosClient.get('/teacher/exercise');
            setOldExercises(allEx || []);
        } catch (err) {
            console.error("Error loading exercises:", err);
        }
    };

    const handleAddDeadline = async () => {
        setFolderAssignmentId(null);
        await fetchOldExercises();
        setShowFolderModal(true);
    };

    const openEditFolderModal = async (dl) => {
        setFolderAssignmentId(dl.assignmentId);
        await fetchOldExercises();
        setShowFolderModal(true);
    };

    const handleOpenAddUser = async () => {
        try {
            setShowAddUserModal(true);
            const data = await axiosClient.get('/teacher/classroom/users-pool');
            setUsersPool(data || []);
        } catch (err) {
            console.error(err);
            Swal.fire('Lỗi', 'Không thể tải danh sách thành viên', 'error');
        }
    };

    const handleAddUserToClass = async (userId) => {
        try {
            await axiosClient.post(`/teacher/classroom/${selectedClass.classId}/add-user/${userId}`);
            Swal.fire('Thành công', 'Đã thêm thành viên vào lớp học!', 'success');
            const details = await axiosClient.get(`/teacher/classroom/${selectedClass.classId}`);
            setDetailedClass(details);
        } catch (err) {
            Swal.fire('Thông báo', 'Không thể thực hiện thao tác. Vui lòng thử lại.', 'warning');
        }
    };

    const handleRemoveUserFromClass = async (userId, fullName) => {
        const confirmResult = await Swal.fire({
            title: 'Xác nhận gỡ?',
            text: `Bạn có chắc chắn muốn gỡ "${fullName}" khỏi lớp học không?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Gỡ ngay',
            cancelButtonText: 'Hủy'
        });

        if (confirmResult.isConfirmed) {
            try {
                await axiosClient.delete(`/teacher/classroom/${selectedClass.classId}/remove-user/${userId}`);
                Swal.fire('Đã xóa!', 'Đã gỡ thành viên thành công.', 'success');
                const details = await axiosClient.get(`/teacher/classroom/${selectedClass.classId}`);
                setDetailedClass(details);
            } catch (err) {
                Swal.fire('Lỗi', 'Không thể xóa thành viên.', 'error');
            }
        }
    };

    const handleDeleteAssignment = async (assignmentId, title) => {
        const confirmResult = await Swal.fire({
            title: 'Xác nhận xóa?',
            text: `Bạn có chắc chắn muốn xóa bài tập "${title}"? Tất cả bài nộp và kết quả liên quan của học viên cũng sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Có, xóa ngay',
            cancelButtonText: 'Hủy bỏ'
        });

        if (confirmResult.isConfirmed) {
            try {
                setLoading(true);
                await axiosClient.delete(`/teacher/assignment/${assignmentId}`);
                Swal.fire('Thành công', 'Đã xóa bài tập thành công!', 'success');
                await fetchDeadlines();
            } catch (err) {
                console.error(err);
                Swal.fire('Lỗi', 'Không thể thực hiện thao tác. Vui lòng thử lại.', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const formatDate = (dtStr) => {
        if (!dtStr) return 'N/A';
        return new Date(dtStr).toLocaleDateString('vi-VN');
    };

    return (
        <div className={styles.container}>
            {/* SCREEN 1: LISTING TEACHER CLASSES */}
            {!selectedClass ? (
                <ClassroomGrid
                    classes={classes}
                    onSelect={handleSelectClass}
                    onCreate={handleOpenCreateClass}
                    onEdit={handleOpenEditClass}
                    onDelete={handleDeleteClass}
                    loading={loading}
                    styles={styles}
                />
            ) : (
                /* SCREEN 2: DETAILED CLASSROOM TAB VIEW */
                <div className={styles.detailView}>
                    <div className={styles.detailHeader}>
                        <button className={styles.btnBack} onClick={handleBack}>
                            <i className="bi bi-arrow-left"></i> Quay lại
                        </button>
                    </div>

                    <div className={styles.classBanner}>
                        <div>
                            <h2>{detailedClass?.className || selectedClass.className}</h2>
                            <p className={styles.metaText}>
                                <i className="bi bi-people-fill"></i> {detailedClass?.members?.length || 0} thành viên
                            </p>
                        </div>
                        
                        <div className={styles.headerActions}>
                            <div className={styles.tabSwitcher}>
                                <button 
                                    className={currentTab === 'students' ? styles.activeTab : ''} 
                                    onClick={() => setCurrentTab('students')}
                                >
                                    <i className="bi bi-people-fill"></i> Học Viên
                                </button>
                                <button 
                                    className={currentTab === 'deadlines' ? styles.activeTab : ''} 
                                    onClick={() => setCurrentTab('deadlines')}
                                >
                                    <i className="bi bi-clock-history"></i> Deadline
                                </button>
                            </div>
                            <button className={styles.btnUserAdd} onClick={handleOpenAddUser}>
                                <i className="bi bi-person-plus-fill"></i> Thêm Thành Viên
                            </button>
                            <button className={styles.btnDeadline} onClick={handleAddDeadline}>
                                <i className="bi bi-calendar-plus"></i> Thêm Deadline
                            </button>
                        </div>
                    </div>

                    {/* TABS LOGIC */}
                    {currentTab === 'students' ? (
                        <MemberListTab
                            members={detailedClass?.members || []}
                            onRemoveUser={handleRemoveUserFromClass}
                            onViewDetails={handleOpenStudentDetails}
                            loading={loading}
                            formatDate={formatDate}
                            styles={styles}
                        />
                    ) : (
                        <DeadlineListTab
                            deadlines={deadlines}
                            onEditFolder={openEditFolderModal}
                            onDeleteDeadline={handleDeleteAssignment}
                            onViewSubmissions={(id) => navigate(`/teacher/assignment/${id}`)}
                            formatDate={formatDate}
                            styles={styles}
                        />
                    )}
                </div>
            )}

            {/* MODAL SEARCH & INVITE USER */}
            <AddMemberModal
                show={showAddUserModal}
                onClose={() => setShowAddUserModal(false)}
                usersPool={usersPool}
                existingMembers={detailedClass?.members || []}
                onAddUser={handleAddUserToClass}
                styles={styles}
            />

            {/* MODAL CONFIG DEADLINE FOLDER */}
            <FolderConfigModal
                show={showFolderModal}
                onClose={() => setShowFolderModal(false)}
                assignmentId={folderAssignmentId}
                classId={selectedClass?.classId}
                oldExercises={oldExercises}
                onSaved={fetchDeadlines}
                styles={styles}
            />

            {/* MODAL CREATE/EDIT CLASSROOM */}
            <ClassroomFormModal
                show={showClassFormModal}
                onClose={() => setShowClassFormModal(false)}
                onSave={handleSaveClass}
                classData={editingClass}
            />

            {/* MODAL STUDENT DETAILS */}
            <StudentDetailsModal
                show={showStudentModal}
                onClose={() => setShowStudentModal(false)}
                classId={selectedClass?.classId}
                studentId={selectedStudentId}
                studentName={selectedStudentName}
                onViewSubmission={handleViewSubmission}
            />
        </div>
    );
}
