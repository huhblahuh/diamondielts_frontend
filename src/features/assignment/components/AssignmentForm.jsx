import React from 'react';
import TiptapEditor from '../../../components/TiptapEditor';
import styles from '../CreateAssignment.module.css';
import { displayCourseName } from '../../../utils/displayText';

export default function AssignmentForm({ title, setTitle, description, setDescription, dueDate, setDueDate, classId, setClassId, isEdit, classes = [] }) {
    return (
        <div className={styles.panel}>
            <h4 className={styles.panelTitle}><i className="bi bi-card-heading"></i> Cấu hình chung</h4>
            <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom:'1.5rem'}}>
                <div className={styles.formGroup}>
                    <label>Tên Deadline</label>
                    <input 
                        type="text" value={title} onChange={e => setTitle(e.target.value)}
                        className={styles.input} placeholder="VD: Final Test - Week 12" required
                    />
                </div>
                <div className={styles.formGroup}>
                    <label>Hạn Chót Nộp Bài</label>
                    <input 
                        type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
                        className={styles.input} required
                    />
                </div>
            </div>

            {!isEdit && (
                <div className={styles.formGroup} style={{maxWidth:'300px'}}>
                    <label>Lớp Áp Dụng</label>
                    <select className={styles.select} value={classId} onChange={e=>setClassId(e.target.value)}>
                        {classes.map(cls => (
                            <option key={cls.classId} value={cls.classId.toString()}>
                                {cls.className}{displayCourseName(cls.courseName) ? ` (${displayCourseName(cls.courseName)})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className={styles.formGroup}>
                <label>Mô tả / Hướng dẫn chi tiết</label>
                <div style={{border:'1px solid #e2e8f0', borderRadius:'8px', minHeight:'150px'}}>
                    <TiptapEditor value={description} onChange={setDescription} placeholder="Nhập nội dung chỉ dẫn cho sinh viên tại đây..." />
                </div>
            </div>
        </div>
    );
}
