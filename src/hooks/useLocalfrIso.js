export function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString("uz-UZ", { hour12: false });
}
