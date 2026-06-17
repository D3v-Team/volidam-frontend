import { Outlet } from "react-router";
import Sidebar from "../components/common/Sidebar";
import { useUIStore } from "../store/useUIStore";
import { LayoutDashboard, UserCog, Headset, TrendingUp } from "lucide-react";

const links = [
    { label: "Bosh sahifa", to: "/superadmin", icon: LayoutDashboard, end: true },
    { label: "Adminlar",    to: "/superadmin/admins",     icon: UserCog },
    { label: "Operatorlar", to: "/superadmin/operators",  icon: Headset },
    { label: "Lidlar",      to: "/superadmin/leads",      icon: TrendingUp },
];
import { Box, Flex } from "@chakra-ui/react";
import SuperAdminHeader from "../pages/Dashboard/SuperAdminHeader";

export default function SuperAdminLayout() {
    return (
        <Flex direction="column" h="100vh" overflow="hidden">
            <SuperAdminHeader />
            <Box flex="1" minH={0} minW={0} w="100%" maxW="100vw" overflowX="hidden" display="flex" flexDirection="column">
                <Outlet />
            </Box>
        </Flex>
    );
}