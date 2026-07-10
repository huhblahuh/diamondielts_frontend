import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import modalStyles from './ClassroomFormModal.module.css';
import { displayCourseName } from '../../../utils/displayText';

export default function ClassroomFormModal({ show, onClose, onSave, courses = [], classData = null }) {
    const styles = modalStyles;
    const [formData, setFormData] = useState({
        className: '',
        courseId: '',
        startDate: '',
        endDate: '',
        status: 'Active'
    });

    const [errors, setErrors] = useState({});

    // Reset or populate form when modal opens or classData changes
    useEffect(() => {
        if (show) {
            if (classData) {
                // Formatting Date strings (YYYY-MM-DD) for HTML Date Input
                const formatToInputDate = (dateStr) => {
                    if (!dateStr) return '';
                    return new Date(dateStr).toISOString().split('T')[0];
                };

                setFormData({
                    className: classData.className || '',
                    courseId: classData.courseId || (courses.length > 0 ? courses[0].courseId : ''),
                    startDate: formatToInputDate(classData.startDate),
                    endDate: formatToInputDate(classData.endDate),
                    status: classData.status || 'Active'
                });
            } else {
                const today = new Date();
                const threeMonthsLater = new Date();
                threeMonthsLater.setMonth(today.getMonth() + 3);

                setFormData({
                    className: '',
                    courseId: courses.length > 0 ? courses[0].courseId : '',
                    startDate: today.toISOString().split('T')[0],
                    endDate: threeMonthsLater.toISOString().split('T')[0],
                    status: 'Active'
                });
            }
            setErrors({});
        }
    }, [show, classData, courses]);

    if (!show) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        const errs = {};
        if (!formData.className.trim()) errs.className = 'Vui lòng nhập tên lớp học';
        if (!formData.courseId) errs.courseId = 'Vui lòng chọn khóa học';
        if (!formData.startDate) errs.startDate = 'Vui lòng chọn ngày bắt đầu';
        if (!formData.endDate) errs.endDate = 'Vui lòng chọn ngày kết thúc';
        
        if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
            errs.endDate = 'Ngày kết thúc phải lớn hơn ngày bắt đầu';
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        onSave({
            ...formData,
            courseId: parseInt(formData.courseId)
        });
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '500px' }}>
                <div className={styles.modalHeader}>
                    <h4>{classData ? 'Cập Nhật Lớp Học' : 'Tạo Lớp Học Mới'}</h4>
                    <button className={styles.btnCloseModal} onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label>Tên Lớp Học <span className={styles.required}>*</span></label>
                            <input 
                                type="text" 
                                name="className"
                                value={formData.className}
                                onChange={handleInputChange}
                                placeholder="Nhập tên lớp (VD: IELTS Cấp Tốc A2)..."
                                className={errors.className ? styles.inputError : ''}
                            />
                            {errors.className && <small className={styles.errorText}>{errors.className}</small>}
                        </div>

                        <div className={styles.formGroup}>
                            <label>Khóa Học <span className={styles.required}>*</span></label>
                            <select 
                                name="courseId"
                                value={formData.courseId}
                                onChange={handleInputChange}
                                className={errors.courseId ? styles.inputError : ''}
                            >
                                <option value="">-- Chọn Khóa Học --</option>
                                {courses.map(c => (
                                    <option key={c.courseId} value={c.courseId}>
                                        {displayCourseName(c.name) || c.level}
                                        {displayCourseName(c.name) && c.level ? ` (${c.level})` : ''}
                                    </option>
                                ))}
                            </select>
                            {errors.courseId && <small className={styles.errorText}>{errors.courseId}</small>}
                        </div>

                        <div className={styles.formGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className={styles.formGroup}>
                                <label>Ngày Bắt Đầu <span className={styles.required}>*</span></label>
                                <input 
                                    type="date" 
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleInputChange}
                                    className={errors.startDate ? styles.inputError : ''}
                                />
                                {errors.startDate && <small className={styles.errorText}>{errors.startDate}</small>}
                            </div>
                            
                            <div className={styles.formGroup}>
                                <label>Ngày Kết Thúc <span className={styles.required}>*</span></label>
                                <input 
                                    type="date" 
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleInputChange}
                                    className={errors.endDate ? styles.inputError : ''}
                                />
                                {errors.endDate && <small className={styles.errorText}>{errors.endDate}</small>}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Trạng Thái Lớp Học</label>
                            <select 
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                            >
                                <option value="Active">Đang hoạt động (Active)</option>
                                <option value="Ended">Đã kết thúc (Ended)</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.btnCancel} onClick={onClose}>
                            Hủy bỏ
                        </button>
                        <button type="submit" className={styles.btnSave}>
                            {classData ? 'Cập Nhật' : 'Tạo Lớp'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
