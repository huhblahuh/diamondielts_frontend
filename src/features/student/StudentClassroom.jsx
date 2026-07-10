import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import styles from './StudentClassroom.module.css';
import Swal from 'sweetalert2';
import { displayCourseName } from '../../utils/displayText';

export default function StudentClassroom() {
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [deadlines, setDeadlines] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingDeadlines, setLoadingDeadlines] = useState(false);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                setLoadingClasses(true);
                const data = await axiosClient.get('/student/classroom');
                setClasses(data || []);
                if (data && data.length > 0) {
                    setSelectedClass(data[0]);
                }
            } catch (e) {
                console.error(e);
                Swal.fire('Lỗi', 'Không thể tải danh sách lớp học', 'error');
            } finally {
                setLoadingClasses(false);
            }
        };
        fetchClasses();
    }, []);

    useEffect(() => {
        if (!selectedClass) return;
        const fetchDeadlines = async () => {
            try {
                setLoadingDeadlines(true);
                const data = await axiosClient.get(`/student/assignment/class/${selectedClass.classId}`);
                setDeadlines(data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingDeadlines(false);
            }
        };
        fetchDeadlines();
    }, [selectedClass]);

    const formatDateTime = (isoStr) => {
        if (!isoStr) return "No Date";
        const d = new Date(isoStr);
        return d.toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    };

    if (loadingClasses) {
        return <div style={{padding:'2rem', textAlign:'center'}}>Đang tải lớp học...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.sidebar}>
                <h4 className={styles.sidebarTitle}><i className="bi bi-mortarboard"></i> Lớp học của tôi</h4>
                <div className={styles.classList}>
                    {classes.length === 0 ? (
                        <div className={styles.emptyMsg}>Chưa tham gia lớp nào</div>
                    ) : (
                        classes.map(cls => (
                            (() => {
                                const courseName = displayCourseName(cls.courseName);
                                return (
                            <div 
                                key={cls.classId} 
                                className={`${styles.classItem} ${selectedClass?.classId === cls.classId ? styles.classItemActive : ''}`}
                                onClick={() => setSelectedClass(cls)}
                            >
                                <h5>{cls.className}</h5>
                                {courseName && <small>{courseName}</small>}
                            </div>
                                );
                            })()
                        ))
                    )}
                </div>
            </div>

            <div className={styles.content}>
                {!selectedClass ? (
                    <div className={styles.welcomePlaceHolder}>
                        <i className="bi bi-arrow-left-circle"></i>
                        <p>Vui lòng chọn một lớp học bên trái để xem chi tiết.</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.classHeader}>
                            <h2>{selectedClass.className}</h2>
                            {displayCourseName(selectedClass.courseName) && (
                                <span className={styles.badge}>{displayCourseName(selectedClass.courseName)}</span>
                            )}
                        </div>

                        <div className={styles.deadlineSection}>
                            <div className={styles.secHeader}>
                                <h4><i className="bi bi-calendar4-event"></i> Bài tập & Deadline được giao</h4>
                            </div>

                            {loadingDeadlines ? (
                                <div style={{padding:'1rem', textAlign:'center', color:'#64748b'}}>Đang cập nhật danh sách...</div>
                            ) : deadlines.length === 0 ? (
                                <div className={styles.emptyDeadlines}>
                                    🎉 Tuyệt vời! Lớp học hiện không có bài tập nào chờ xử lý.
                                </div>
                            ) : (
                                <div className={styles.deadlineGrid}>
                                    {deadlines.map(dl => {
                                        const isOverdue = new Date(dl.dueDate) < new Date();
                                        return (
                                            <div key={dl.assignmentId} className={`${styles.dlCard} ${isOverdue ? styles.cardOverdue : ''}`}>
                                                <div className={styles.dlInfo}>
                                                    <h5>{dl.title}</h5>
                                                    <p className={styles.dlMeta}>
                                                        <i className="bi bi-clock-history"></i> Hạn nộp: <span style={{fontWeight:600}}>{formatDateTime(dl.dueDate)}</span>
                                                    </p>
                                                    <div className={styles.dlCounts}>
                                                        <span><i className="bi bi-layers"></i> {dl.itemCount || 0} Hạng mục</span>
                                                    </div>
                                                </div>
                                                <div className={styles.dlActions}>
                                                    <button 
                                                        className={styles.btnDo} 
                                                        onClick={() => navigate(`/student/assignment/${dl.assignmentId}`)}
                                                    >
                                                        {isOverdue ? 'Xem lại' : 'Bắt đầu làm'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
