import { Outlet } from "react-router";
import { Box, Flex } from "@chakra-ui/react";
import SuperAdminHeader from "../pages/Dashboard/SuperAdminHeader";
import LeadDetailPage from "../pages/Leads/LeadDetailPage";

export default function SuperAdminLayout() {
    return (
        <Flex direction="column" minH="100vh">
            <SuperAdminHeader />
            {/* <LeadDetailPage /> */}
            <Box flex="1" minW={0} w="100%" maxW="100vw" overflowX="hidden">
                <Outlet />
            </Box>
        </Flex>
    );
}