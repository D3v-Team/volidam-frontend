import BulkLocationAssignModal from "../../CLcompany/__components/BulkLocationAssignModal";

/** Bitta yoki bir nechta location uchun hodim biriktirish (BulkLocationAssignModal UI). */
export default function LocationAssignModal({
    isOpen,
    onClose,
    locationIds = [],
    onSuccess,
}) {
    const companies = (locationIds ?? [])
        .map((id) => String(id ?? "").trim())
        .filter(Boolean)
        .map((id) => ({ id }));

    return (
        <BulkLocationAssignModal
            isOpen={isOpen}
            onClose={onClose}
            companies={companies}
            onSuccess={onSuccess}
        />
    );
}
