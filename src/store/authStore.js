// src/store/authStore.js
import { create } from "zustand";
import Cookies from "js-cookie";

export const useAuthStore = create((set, get) => ({
    token: Cookies.get("token") || null,
    refreshToken: Cookies.get("refresh_token") || null,
    userId: Cookies.get("user_id") || null,
    user: Cookies.get("user") ? JSON.parse(Cookies.get("user")) : null,

    login: ({ token, refreshToken, user }) => {
        Cookies.set("token", token);
        Cookies.set("refresh_token", refreshToken);
        Cookies.set("user_id", user.id);
        Cookies.set("user", JSON.stringify(user));

        set({
            token,
            refreshToken,
            userId: user.id,
            user,
        });
    },

    setTokens: ({ token, refreshToken }) => {
        if (token) {
            Cookies.set("token", token);
            set({ token });
        }
        if (refreshToken) {
            Cookies.set("refresh_token", refreshToken);
            set({ refreshToken });
        }
    },

    logout: () => {
        Cookies.remove("token");
        Cookies.remove("refresh_token");
        Cookies.remove("user_id");
        Cookies.remove("user");

        set({
            token: null,
            refreshToken: null,
            userId: null,
            user: null,
        });
    },

    isAuthenticated: () => !!Cookies.get("token"),
}));
