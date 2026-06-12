import { $api } from "../parametres/axios";

class apiLids {
  static getList = async (params) => {
    const response = await $api.get("/lids", {
      params: { ...params, _ts: Date.now() },
    });
    return response;
  };

  static filter = async (params) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== "" && v !== null
      )
    );
    const response = await $api.get("/lids/filter", {
      params: { ...cleanParams, _ts: Date.now() },
    });
    return response;
  };

  static getById = async (id) => {
    const response = await $api.get(`/lids/${id}`);
    return response;
  };

  static assign = async (data) => {
    const response = await $api.put("/lids/assign", data, {
      showSuccessToast: "Hodim muvaffaqiyatli biriktirildi",
    });
    return response;
  };

  static create = async (data) => {
    const lidData = { ...data };
    if (!("child_status_id" in lidData) || lidData.child_status_id === undefined) {
      lidData.child_status_id = null;
    }
    const response = await $api.post("/lids", lidData, {
      showSuccessToast: "Lid muvaffaqiyatli yaratildi",
    });
    return response;
  };

  static update = async (id, data) => {
    const lidData = { ...data };
    if (!("child_status_id" in lidData) || lidData.child_status_id === undefined) {
      lidData.child_status_id = null;
    }
    const response = await $api.put(`/lids/${id}`, lidData);
    return response;
  };

  static delete = async (id) => {
    const response = await $api.delete(`/lids/${id}`, {
      showSuccessToast: "Lid o'chirildi",
    });
    return response;
  };

  static updateStatus = async (id, statusId, childStatusId) => {
    const body = { status_id: statusId };
    if (typeof childStatusId !== "undefined") {
      body.child_status_id = childStatusId;
    }
    return await $api.put(`/lids/${id}/status`, body, {
      showSuccessToast: "Status yangilandi",
    });
  };

  /**
   * Faqat child_status_id ni yangilash uchun alohida endpoint
   * PUT /api/v1/lids/{id}/child-status
   * Body: { child_status_id: string | null }
   */
  static updateChildStatus = async (id, childStatusId) => {
    return await $api.put(`/lids/${id}/child-status`, {
      child_status_id: childStatusId ?? null,
    });
  };

  static importExcel = async (file, statusId) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await $api.post("/lids/import/excel", formData, {
      params: { status_id: statusId },
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response;
  };
}

export { apiLids };