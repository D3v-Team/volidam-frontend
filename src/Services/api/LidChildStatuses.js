import { $api } from "../parametres/axios";

class apiLidChildStatuses {
    static getAll = async (params = {}) => {
        const response = await $api.get("/lid-child-statuses", { params });
        return response;
    };

    static create = async (data) => {
        const response = await $api.post("/lid-child-statuses", data, {
            showSuccessToast: "Child status yaratildi",
        });
        return response;
    };

    static update = async (id, data) => {
        const response = await $api.put(`/lid-child-statuses/${id}`, data, {
            showSuccessToast: "Child status yangilandi",
        });
        return response;
    };

    static delete = async (id) => {
        const response = await $api.delete(`/lid-child-statuses/${id}`, {
            showSuccessToast: "Child status o'chirildi",
        });
        return response;
    };
}

export { apiLidChildStatuses };
