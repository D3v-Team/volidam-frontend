// src/hooks/useAuth.js
import { useAuthStore } from "../store/authStore";

export const useAuth = () => {
    const loginToStore = useAuthStore((s) => s.login);
    const logoutFromStore = useAuthStore((s) => s.logout);

    // LOGIN
    const login = ({ token, refreshToken, user }) => {
        loginToStore({ token, refreshToken, user });
    };

    // LOGOUT
    const logout = () => {
        logoutFromStore();
        window.location.href = "/login";
    };


    return {
        login,
        logout,
    };
};
