import { parseAssignmentDueDate } from '../../utils/assignmentDate.js';

export const isSpeakingItem = (item) => ['AI_SPEAKING', 'SPEAKING'].includes((item.itemType || '').toUpperCase());

export const detectPartNumber = (type) => {
    const value = (type || '').toLowerCase();
    if (value.includes('part 2') || value.includes('part2') || value.includes('speaking2')) return 2;
    if (value.includes('part 3') || value.includes('part3') || value.includes('speaking3')) return 3;
    return 1;
};

export const getAssignmentFilterOptions = (items) => {
    const speakingParts = new Set(items.filter(isSpeakingItem).map(item => detectPartNumber(item.type || item.itemType)));
    return [
        { key: 'all', label: `Tất cả · ${items.length}` },
        ...[1, 2, 3].filter(part => speakingParts.has(part)).map(part => ({ key: `part${part}`, label: `Part ${part}` })),
        ...(items.some(item => !isSpeakingItem(item)) ? [{ key: 'file', label: 'Tự luận / File' }] : []),
    ];
};

export const filterAssignmentItems = (items, filter) => {
    if (filter === 'all') return items;
    if (filter === 'file') return items.filter(item => !isSpeakingItem(item));
    const part = Number(filter.replace('part', ''));
    if (![1, 2, 3].includes(part)) return items;
    return items.filter(item => isSpeakingItem(item) && detectPartNumber(item.type || item.itemType) === part);
};

export const formatDueDate = (isoStr) => {
    if (!isoStr) return 'Không thời hạn';
    const date = parseAssignmentDueDate(isoStr);
    const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const day = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time} · ${day}`;
};

export const getRemainingDaysText = (isoStr) => {
    if (!isoStr) return 'Không thời hạn';
    const diff = parseAssignmentDueDate(isoStr).getTime() - Date.now();
    if (diff <= 0) return 'Quá hạn nộp';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `Còn ${days} ngày`;
    if (hours > 0) return `Còn ${hours} giờ`;
    return 'Sắp hết hạn';
};

export const formatDateTime = (isoStr) => {
    if (!isoStr) return 'N/A';
    const date = new Date(isoStr);
    const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const day = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time} · ${day}`;
};

export const truncateText = (text, maxLength = 80) => {
    const value = String(text || '').trim();
    return value.length <= maxLength ? value : `${value.slice(0, maxLength).trimEnd()}…`;
};

export const cleanFileName = (raw) => {
    if (!raw) return 'Tài liệu đính kèm';
    const name = raw.substring(raw.lastIndexOf('/') + 1);
    const lastDot = name.lastIndexOf('.');
    if (lastDot === -1) return name;
    const extension = name.substring(lastDot);
    return name.substring(0, lastDot)
        .replace(/_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, '')
        .replace(/^[0-9]+_/, '') + extension;
};
