import { $api } from "../parametres/axios";
import { BASE_URL } from "../parametres/axios";

class apiUsers {
  static getUsers = async (role) => {
    const response = await $api.get(`${BASE_URL}/user/all?role=${role}`)
    return response;
}

    static getUser = async (id) => {
        const response = await $api.get(`${BASE_URL}/user/${id}`)
        return response;
    }

    static Add = async (data) => {
        const response = await $api.post(`${BASE_URL}/user`, data, { showSuccessToast: "Foydalanuvchi muvaffaqiyatli yaratildi" })
        return response;
    }

    static Update = async (data, id) => {
        const response = await $api.put(`${BASE_URL}/user/${id}`, data, { showSuccessToast: "Foydalanuvchi muvaffaqiyatli yangilandi" })
        return response;
    }

    static Delete = async (id) => {
        const response = await $api.delete(`${BASE_URL}/user/${id}`, { showSuccessToast: "Foydalanuvchi muvaffaqiyatli o'chirildi" })
        return response;
    }

    static ResetPassword = async (id, data) => {
        const response = await $api.post(`${BASE_URL}/user/reset-password/${id}`, data, { showSuccessToast: "Parol muvaffaqiyatli o'zgartirildi" });
        return response;
    }
}

export { apiUsers };