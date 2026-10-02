// Assignment due dates are stored as UTC DateTime values. SQL Server returns
// DateTimeKind.Unspecified, so the API may omit the UTC suffix in JSON.
export const parseAssignmentDueDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const dateTime = String(value);
    const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateTime);
    return new Date(hasTimeZone ? dateTime : `${dateTime}Z`);
};

export const toAssignmentDateTimeLocal = (value) => {
    const date = parseAssignmentDueDate(value);
    if (!date || Number.isNaN(date.getTime())) return '';
    const pad = (number) => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
