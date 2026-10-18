export const SCORE_ITEMS = [
    { key: 'grammarScore', label: 'Ngữ pháp', color: '#f05152', pointStyle: 'circle', dash: [] },
    { key: 'vocabularyScore', label: 'Từ vựng', color: '#10a37f', pointStyle: 'rect', dash: [6, 3] },
    { key: 'pronunciationScore', label: 'Phát âm', color: '#f5a623', pointStyle: 'triangle', dash: [2, 3] },
    { key: 'fluencyScore', label: 'Trôi chảy & mạch lạc', short: 'Trôi chảy', color: '#2a3f94', pointStyle: 'rectRot', dash: [8, 3, 2, 3] },
];

export const formatScore = (value) => Number.isFinite(value)
    ? Number(value).toFixed(1)
    : '—';

export function scoreLabel(value) {
    if (!Number.isFinite(value)) return 'Chưa có dữ liệu';
    if (value >= 8) return 'Rất tốt';
    if (value >= 7) return 'Tốt';
    if (value >= 6) return 'Khá';
    if (value >= 5) return 'Trung bình';
    return 'Cần cải thiện';
}
