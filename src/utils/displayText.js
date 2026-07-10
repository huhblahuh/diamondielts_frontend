const HIDDEN_COURSE_NAMES = new Set([
    'IELTS Academic Super Fast'
]);

export function displayCourseName(courseName) {
    const name = (courseName || '').trim();
    return HIDDEN_COURSE_NAMES.has(name) ? '' : name;
}
