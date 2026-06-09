import { Navigate } from "react-router-dom";
import Dashboard from "../pages/Dashboard/Dashboard";
import Admins from "../pages/Admins/Admins";
import Operators from "../pages/Operators/Operators";
import Leads from "../pages/Leads/Leads";
import LeadDetailPage from "../pages/Leads/LeadDetailPage";
import SharedPageOne from "../pages/Shared/SharedPageOne";
import SharedPageTwo from "../pages/Shared/SharedPageTwo";

const superAdminRoutes = [
  {
    name: "home",
    path: "",
    element: <Navigate to="/superadmin/dashboard" replace />,
    end: true,
  },
  {
    name: "dashboard",
    path: "dashboard",
    element: <Dashboard />,
  },
  {
    name: "admins",
    path: "admins",
    element: <Admins />,
  },
  {
    name: "operators",
    path: "operators",
    element: <Operators />,
  },
  {
    name: "sharedOne",
    path: "shared-one",
    element: <SharedPageOne />,
  },
  {
    name: "sharedTwo",
    path: "shared-two",
    element: <SharedPageTwo />,
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

export default superAdminRoutes;
