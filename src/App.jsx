// App.jsx
import { Navigate, Route, Routes } from "react-router";
import "./App.css";
import RequireAuth from "./auth/RequireAuth";
import { Toaster } from "react-hot-toast";
import ErrorPage from "./pages/ErrorPage";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import LeadsPanelLayout from "./layouts/LeadsPanelLayout";
import superAdminRoutes from "./routes/superAdminRoutes";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Leads from "./pages/Leads/Leads";
import LeadDetailPage from "./pages/Leads/LeadDetailPage";
import Dashboard from "./pages/Dashboard/Dashboard"; // Dashboardni import qilish
import { ROLES } from "./utils/roles";

function App() {
  return (
    <>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route element={<RequireAuth role={ROLES.SUPER_ADMIN} />}>
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

        <Route element={<RequireAuth role={ROLES.ADMIN} />}>
          <Route path="/admin" element={<LeadsPanelLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />{" "}
            {/* Dashboard route */}
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<LeadDetailPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role={ROLES.OPERATOR} />}>
          <Route path="/operator" element={<LeadsPanelLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />{" "}
            {/* Dashboard route */}
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<LeadDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<ErrorPage />} />
      </Routes>

      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </>
  );
}

export default App;
