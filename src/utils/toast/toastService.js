import toast from "react-hot-toast";

export const toastService = {
    success(message = "Muvaffaqiyatli bajarildi!") {
        toast.success(message);
    },

    error(message = "Xatolik yuz berdi!") {
        toast.error(message);
    },
    loading(message = "Iltimos, kuting...") {
        return toast.loading(message);
    },
    dismiss(id) {
        toast.dismiss(id);
    },

    promise(promise, messages) {
        return toast.promise(promise, {
            loading: messages.loading || "Yuklanmoqda...",
            success: messages.success || "Muvaffaqiyatli!",
            error: messages.error || "Xato!",
        });
    },

    custom(component) {
        toast.custom(component);
    },
};
