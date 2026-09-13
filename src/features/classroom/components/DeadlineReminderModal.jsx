import React, { useEffect, useMemo, useState } from 'react';

const HOURS_BEFORE_MODE = 'hours-before';
const FIXED_TIME_MODE = 'fixed-time';
const DEFAULT_HOURS_BEFORE = '24';

const pad = (value) => String(value).padStart(2, '0');

const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const toDateTimeLocalValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const calculateReminderAt = (dueDateValue, mode, hoursBeforeValue, fixedTimeValue) => {
    if (mode === FIXED_TIME_MODE) {
        if (!fixedTimeValue) return null;
        const fixedTime = new Date(fixedTimeValue);
        return Number.isNaN(fixedTime.getTime()) ? null : fixedTime;
    }

    const dueDate = new Date(dueDateValue);
    const hoursBefore = Number(hoursBeforeValue);
    if (Number.isNaN(dueDate.getTime()) || !Number.isInteger(hoursBefore) || hoursBefore <= 0) {
        return null;
    }

    return new Date(dueDate.getTime() - hoursBefore * 60 * 60 * 1000);
};

export default function DeadlineReminderModal({
    show,
    dueDate,
    currentReminderAt,
    processedAt,
    onApply,
    onCancelSchedule,
    onClose,
    styles
}) {
    const [mode, setMode] = useState(HOURS_BEFORE_MODE);
    const [hoursBefore, setHoursBefore] = useState(DEFAULT_HOURS_BEFORE);
    const [fixedTime, setFixedTime] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!show) return;

        const hasPendingReminder = Boolean(currentReminderAt && !processedAt);
        setMode(hasPendingReminder ? FIXED_TIME_MODE : HOURS_BEFORE_MODE);
        setHoursBefore(DEFAULT_HOURS_BEFORE);
        setFixedTime(hasPendingReminder ? toDateTimeLocalValue(currentReminderAt) : '');
        setError('');
    }, [show, currentReminderAt, processedAt]);

    const calculatedReminder = useMemo(
        () => calculateReminderAt(dueDate, mode, hoursBefore, fixedTime),
        [dueDate, mode, hoursBefore, fixedTime]
    );

    const validationMessage = useMemo(() => {
        if (mode === HOURS_BEFORE_MODE) {
            const numericHours = Number(hoursBefore);
            if (!Number.isInteger(numericHours) || numericHours <= 0) {
                return 'Số giờ phải là số nguyên lớn hơn 0.';
            }
        } else if (!fixedTime) {
            return 'Vui lòng chọn đầy đủ ngày, giờ và phút nhắc.';
        }

        if (!calculatedReminder || Number.isNaN(calculatedReminder.getTime())) {
            return 'Thời điểm nhắc chưa hợp lệ.';
        }

        const due = new Date(dueDate);
        if (Number.isNaN(due.getTime())) {
            return 'Vui lòng chọn deadline hợp lệ trước khi đặt lịch nhắc.';
        }
        if (calculatedReminder >= due) {
            return 'Thời điểm nhắc phải trước hạn nộp bài.';
        }
        if (calculatedReminder <= new Date()) {
            return 'Thời điểm nhắc phải ở trong tương lai.';
        }
        return '';
    }, [mode, hoursBefore, fixedTime, calculatedReminder, dueDate]);

    if (!show) return null;

    const selectMode = (nextMode) => {
        setMode(nextMode);
        setError('');
    };

    const handleApply = () => {
        if (validationMessage) {
            setError(validationMessage);
            return;
        }
        onApply(calculatedReminder.toISOString());
    };

    return (
        <div className={styles.reminderModalOverlay} onMouseDown={event => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <section className={styles.reminderModal} role="dialog" aria-modal="true" aria-labelledby="reminder-modal-title">
                <header className={styles.reminderModalHeader}>
                    <div className={styles.reminderModalIcon}>
                        <i className="bi bi-bell-fill"></i>
                    </div>
                    <div>
                        <span>EMAIL TỰ ĐỘNG</span>
                        <h3 id="reminder-modal-title">
                            {processedAt ? 'Đặt lịch nhắc mới' : 'Cấu hình nhắc deadline'}
                        </h3>
                        <p>Chỉ gửi cho học sinh chưa nộp đủ các mục bài tập.</p>
                    </div>
                    <button type="button" className={styles.reminderModalClose} onClick={onClose} aria-label="Đóng">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </header>

                <div className={styles.reminderModalBody}>
                    {currentReminderAt && (
                        <div className={`${styles.currentReminderCard} ${processedAt ? styles.reminderDone : ''}`}>
                            <i className={`bi ${processedAt ? 'bi-check-circle-fill' : 'bi-clock-fill'}`}></i>
                            <div>
                                <span>{processedAt ? 'Đã nhắc lúc' : 'Đang lên lịch lúc'}</span>
                                <strong>{formatDateTime(processedAt || currentReminderAt)}</strong>
                            </div>
                        </div>
                    )}

                    <fieldset className={styles.reminderModeFieldset}>
                        <legend>Cách đặt lịch nhắc</legend>
                        <div className={styles.reminderModeOptions}>
                            <label className={`${styles.reminderModeOption} ${mode === HOURS_BEFORE_MODE ? styles.reminderModeOptionActive : ''}`}>
                                <input
                                    type="radio"
                                    name="deadline-reminder-mode"
                                    value={HOURS_BEFORE_MODE}
                                    checked={mode === HOURS_BEFORE_MODE}
                                    onChange={() => selectMode(HOURS_BEFORE_MODE)}
                                />
                                <span className={styles.reminderModeIcon}><i className="bi bi-hourglass-split"></i></span>
                                <span className={styles.reminderModeText}>
                                    <strong>Giờ trước deadline</strong>
                                    <small>Tự động tính lùi từ hạn nộp bài</small>
                                </span>
                                <i className={`bi ${mode === HOURS_BEFORE_MODE ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                            </label>

                            <label className={`${styles.reminderModeOption} ${mode === FIXED_TIME_MODE ? styles.reminderModeOptionActive : ''}`}>
                                <input
                                    type="radio"
                                    name="deadline-reminder-mode"
                                    value={FIXED_TIME_MODE}
                                    checked={mode === FIXED_TIME_MODE}
                                    onChange={() => selectMode(FIXED_TIME_MODE)}
                                />
                                <span className={styles.reminderModeIcon}><i className="bi bi-calendar-event"></i></span>
                                <span className={styles.reminderModeText}>
                                    <strong>Thời điểm cố định</strong>
                                    <small>Chọn chính xác ngày, giờ và phút</small>
                                </span>
                                <i className={`bi ${mode === FIXED_TIME_MODE ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                            </label>
                        </div>
                    </fieldset>

                    <div className={styles.reminderInputPanel}>
                        {mode === HOURS_BEFORE_MODE ? (
                            <label className={styles.reminderField}>
                                <span>Số giờ trước deadline</span>
                                <div className={styles.reminderNumberInput}>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        inputMode="numeric"
                                        value={hoursBefore}
                                        onChange={event => {
                                            setHoursBefore(event.target.value);
                                            setError('');
                                        }}
                                    />
                                    <span>giờ</span>
                                </div>
                            </label>
                        ) : (
                            <label className={styles.reminderField}>
                                <span>Ngày và giờ gửi email</span>
                                <input
                                    type="datetime-local"
                                    step="60"
                                    value={fixedTime}
                                    onChange={event => {
                                        setFixedTime(event.target.value);
                                        setError('');
                                    }}
                                />
                            </label>
                        )}
                    </div>

                    <div className={`${styles.reminderPreview} ${validationMessage ? styles.reminderPreviewInvalid : ''}`}>
                        <div>
                            <i className="bi bi-calendar2-check"></i>
                            <span>Thời điểm dự kiến gửi</span>
                        </div>
                        <strong>{validationMessage ? 'Chưa hợp lệ' : formatDateTime(calculatedReminder)}</strong>
                    </div>

                    {(error || validationMessage) && (
                        <p className={styles.reminderValidation}>
                            <i className="bi bi-exclamation-circle"></i>
                            {error || validationMessage}
                        </p>
                    )}
                </div>

                <footer className={styles.reminderModalFooter}>
                    {currentReminderAt && !processedAt && (
                        <button type="button" className={styles.btnCancelReminder} onClick={onCancelSchedule}>
                            <i className="bi bi-trash3"></i>
                            Hủy lịch hiện tại
                        </button>
                    )}
                    <div className={styles.reminderModalActions}>
                        <button type="button" className={styles.btnReminderClose} onClick={onClose}>Đóng</button>
                        <button type="button" className={styles.btnReminderApply} onClick={handleApply}>
                            <i className="bi bi-check2"></i>
                            Áp dụng
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
}
