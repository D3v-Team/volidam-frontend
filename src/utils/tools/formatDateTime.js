export function formatDateTime(
    input,
    locale = 'uz-UZ',
    options = {}
) {
    if (!input) return '-';

    const date = new Date(input);
    if (isNaN(date.getTime())) return '-';

    const defaultOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    };

    return new Intl.DateTimeFormat(
        locale,
        { ...defaultOptions, ...options }
    ).format(date);
}
