// src/auth/RequireAuth.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function RequireAuth({ role }) {
    const isAuth = useAuthStore((s) => s.isAuthenticated());
    const location = useLocation();
    const userRole = useAuthStore((s) => s.user?.role);

    if (!isAuth || (role && userRole !== role)) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
}
