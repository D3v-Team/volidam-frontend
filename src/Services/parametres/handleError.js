import { toastService } from "../../utils/toast";
export default function handleApiError(error) {
    const status = error.response?.status;
    const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Noma'lum xatolik";

    switch (status) {
        case 400:
            toastService.error(msg);
            break;

        case 401:
            toastService.error("Autentifikatsiya xatosi");
            break;

        case 403:
            toastService.error("Ruxsat yo‘q");
            break;

        case 404:
            toastService.error("Ma'lumot topilmadi");
            break;

        case 409:
            toastService.error("Mavjud ma'lumot bilan to‘qnashuv");
            break;

        case 422:
            toastService.error("Yaroqsiz ma'lumot yuborildi");
            break;

        case 500:
        case 502:
        case 503:
            toastService.error("Serverda muammo");
            break;

        default:
            toastService.error(msg);
            break;
    }
};
