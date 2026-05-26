import { Outlet } from "react-router";
import Sidebar from "../components/common/Sidebar";
import { Box } from "@chakra-ui/react";
import { useUIStore } from "../store/useUIStore";
import { LayoutDashboard, UserCog, Headset, TrendingUp } from "lucide-react";

const links = [
    { label: "Bosh sahifa", to: "/superadmin", icon: LayoutDashboard, end: true },
    { label: "Adminlar",    to: "/superadmin/admins",     icon: UserCog },
    { label: "Operatorlar", to: "/superadmin/operators",  icon: Headset },
    { label: "Lidslar",      to: "/superadmin/ladies",      icon: TrendingUp },
];

export default function SuperAdminLayout() {
    const { collapsed } = useUIStore();
    return (
        <Box>
            <Sidebar collapsed={collapsed} links={links} role="SUPER_ADMIN" />
            <Box
                pl={collapsed ? "80px" : "250px"}
                transition="0.25s ease"
                minH="100vh"
            >
                <Outlet />
            </Box>
        </Box>
    );
}
