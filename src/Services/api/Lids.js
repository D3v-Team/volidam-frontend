import { $api } from "../parametres/axios";

class apiLids {
  static getList = async (params) => {
    const response = await $api.get("/lids", { params });
    return response;
  };

  static getById = async (id) => {
    const response = await $api.get(`/lids/${id}`);
    return response;
  };

  static create = async (data) => {
    const response = await $api.post("/lids", data, {
      showSuccessToast: "Lid muvaffaqiyatli yaratildi",
    });
    return response;
  };

  static update = async (id, data) => {
    const response = await $api.put(`/lids/${id}`, data, {
      showSuccessToast: "Lid yangilandi",
    });
    return response;
  };

  static delete = async (id) => {
    const response = await $api.delete(`/lids/${id}`, {
      showSuccessToast: "Lid o'chirildi",
    });
    return response;
  };

  static updateStatus = async (id, statusId) => {
    const body = { status_id: statusId };
    return await $api.put(`/lids/${id}/status`, body, {
      showSuccessToast: "Status yangilandi",
    });
  };
  static importExcel = async (file, statusId) => {
    const formData = new FormData();
    formData.append("file", file);
    if (statusId) formData.append("status_id", statusId);
    const response = await $api.post("/lids/import/excel", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      showSuccessToast: "Excel muvaffaqiyatli yuklandi",
    });
    return response;
  };
}

export { apiLids };
