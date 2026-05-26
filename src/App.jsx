import { Navigate, Route, Routes } from "react-router";
import "./App.css";
import RequireAuth from "./auth/RequireAuth";
import { Toaster } from "react-hot-toast";
import ErrorPage from "./pages/ErrorPage";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import superAdminRoutes from "./routes/superAdminRoutes";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";

function App() {
    return (
        <>
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />

                <Route path="/" element={<Navigate to="/login" replace />} />

                <Route element={<RequireAuth role="super_admin" />}>
                    <Route path="/superadmin" element={<SuperAdminLayout />}>
                        {superAdminRoutes.map((r) => (
                            <Route
                                key={r.name}
                                index={r.path === ""}
                                path={r.path || undefined}
                                element={r.element}
                            />
                        ))}
                    </Route>
                </Route>

                <Route path="*" element={<ErrorPage />} />
            </Routes>

            <Toaster
                position="top-center"
                toastOptions={{ duration: 3000 }}
            />
        </>
    );
}

export default App;
