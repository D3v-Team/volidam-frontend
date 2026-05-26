import Dashboard from "../pages/Dashboard/Dashboard";
import Admins from "../pages/Admins/Admins";
import Operators from "../pages/Operators/Operators";
import Leads from "../pages/Leads/Leads";

const superAdminRoutes = [
    {
        name: "dashboard",
        path: "",
        element: <Dashboard />,
        end: true,
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
        name: "ladies",
        path: "ladies",
        element: <Leads />,
    },
];

export default superAdminRoutes;
