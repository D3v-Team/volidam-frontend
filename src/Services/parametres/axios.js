// src/api/axios.js
import axios from "axios";
import Cookies from "js-cookie";
import { useAuthStore } from "../../store/authStore";
import { toastService } from "../../utils/toast";
import handleApiError from "./handleError";


export const BASE_URL = "https://dev.ithubs.uz/erp/api/v1";

export const $api = axios.create({
    baseURL: `${BASE_URL}`,
    // headers: { "Content-Type": "application/json" },
});

/* ============================
   REQUEST INTERCEPTOR
=============================== */
$api.interceptors.request.use(
    (config) => {
        const token = Cookies.get("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        toastService.error("So'rov yuborishda xatolik!");
        Promise.reject(error)
    }
);

/* ============================
   RESPONSE INTERCEPTOR
   + Refresh token
   + Retry
=============================== */
$api.interceptors.response.use(
    (response) => {
        if (response.config?.showSuccessToast) {
            toastService.success(response.config.showSuccessToast);
        }
        return response;
    },

    async (error) => {
        const originalRequest = error.config;
        const store = useAuthStore.getState();

        // Refresh required
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = Cookies.get("refresh_token");
                const userId = Cookies.get("user_id");

                if (!refreshToken || !userId) {
                    throw new Error("Refresh token yoki user ID topilmadi");
                }

                // ---- Refresh request ----
                const res = await axios.post(`${BASE_URL}/auth/refresh`, {
                    refreshToken,
                    userId,
                });

                const newAccess = res.data.access_token;
                const newRefresh = res.data.refresh_token;

                // ---- Save new tokens ----
                store.setTokens({
                    token: newAccess,
                    refreshToken: newRefresh,
                });

                // ---- Retry original request ----
                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                return $api(originalRequest);
            } catch (err) {
                // Clear auth + redirect
                toastService.error("Sessiya tugadi. Iltimos qayta kiring.");
                store.logout();
                window.location.href = "/login";
                return Promise.reject(err);
            }
        }
        /* ============================
           GLOBAL ERROR HANDLING
           =============================== */
        handleApiError(error)
        return Promise.reject(error);
    }
);
