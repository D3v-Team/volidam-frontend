// src/routes/adminRoutes.jsx
import { Navigate } from "react-router-dom";
import Leads from "../pages/Leads/Leads";
import LeadDetailPage from "../pages/Leads/LeadDetailPage";

const adminRoutes = [
    {
        name: "home",
        path: "",
        element: <Navigate to="/admin/leads" replace />, 
    },
    {
        name: "leads",
        path: "leads",
        element: <Leads />,
    },
    {
        name: "leadDetail",
        path: "leads/:id",
        element: <LeadDetailPage />,
    },
];

export default adminRoutes;