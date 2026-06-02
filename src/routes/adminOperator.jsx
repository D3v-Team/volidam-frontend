// src/routes/operatorRoutes.jsx
import { Navigate } from "react-router-dom";
import Leads from "../pages/Leads/Leads";
import LeadDetailPage from "../pages/Leads/LeadDetailPage";

const operatorRoutes = [
    {
        name: "home",
        path: "",
        element: <Navigate to="/operator/leads" replace />,
        end: true,
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

export default operatorRoutes;