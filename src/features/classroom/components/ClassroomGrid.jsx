import React from 'react';
import Skeleton from '../../../components/common/Skeleton';

export default function ClassroomGrid({ classes = [], onSelect, onCreate, onEdit, onDelete, loading, styles }) {
    return (
        <>
            <div className={styles.header}>
                <div>
                    <h3 className={styles.title}>
                        <i className="bi bi-mortarboard-fill" style={{ color: '#1b2d75', marginRight: '0.75rem' }}></i>
                        Quản lý lớp học
                    </h3>
                </div>
                <button className={styles.btnCreateClass} onClick={onCreate}>
                    <i className="bi bi-plus-circle-fill"></i> Tạo Lớp Học Mới
                </button>
            </div>
            
            {loading ? (
                <Skeleton type="classroom" count={6} />
            ) : classes.length === 0 ? (
                <div className={styles.emptyState}>Bạn chưa tham gia quản lý lớp học nào. Click nút phía trên để tạo lớp học mới.</div>
            ) : (
                <div className={styles.grid}>
                    {classes.map(cls => {
                        return (
                        <div key={cls.classId} className={styles.classCard} onClick={() => onSelect(cls)}>
                            <div className={styles.classHeader}>
                                <div className={styles.cardActions}>
                                    <button 
                                        className={styles.miniBtnEdit} 
                                        onClick={(e) => { e.stopPropagation(); onEdit(cls); }}
                                        title="Sửa lớp học"
                                    >
                                        <i className="bi bi-pencil-fill"></i>
                                    </button>
                                    <button 
                                        className={styles.miniBtnDelete} 
                                        onClick={(e) => { e.stopPropagation(); onDelete(cls); }}
                                        title="Xóa lớp học"
                                    >
                                        <i className="bi bi-trash-fill"></i>
                                    </button>
                                </div>
                            </div>
                            <h4 className={styles.className}>{cls.className}</h4>
                            <div className={styles.classMeta}>
                                <span><i className="bi bi-people"></i> {cls.studentCount} học viên</span>
                                <span style={{color: '#10b981', fontWeight: 600}}>{cls.status}</span>
                            </div>
                            <div className={styles.progressContainer}>
                                <div className={styles.progressBar}>
                                    <div className={styles.progressFill} style={{width: '100%'}}></div>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
