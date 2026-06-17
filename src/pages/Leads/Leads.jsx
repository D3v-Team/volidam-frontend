import { useLocation, useParams } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import LeadsBoard from "../../components/leads/LeadsBoard";
import LeadDetailPage from "./LeadDetailPage";
import { useAuthStore } from "../../store/authStore";
import { isAdmin, isOperator, isSuperAdmin } from "../../utils/roles";

export default function Leads() {
    const user = useAuthStore((s) => s.user);
    const role = user?.role;
    const { pathname } = useLocation();
    const { id } = useParams();

    const panelLayout =
        pathname.startsWith("/admin") || pathname.startsWith("/operator") || pathname.startsWith("/superadmin");

    const scrollRoleScope = pathname.startsWith("/operator")
        ? "operator"
        : pathname.startsWith("/admin")
            ? "admin"
            : "superadmin";

    const maxVisibleColumns = isSuperAdmin(role) ? 4 : 5;
    const canDeleteLid = isSuperAdmin(role);

    // id bo'lsa — detail overlay ko'rsatiladi
    const showDetail = Boolean(id);

    return (
        // position: relative — detail overlay ning anchor si
        <Box position="relative" flex="1" minH={0} display="flex" flexDirection="column" overflow="hidden">
            {/* ── Leads board — hech qachon unmount bo'lmaydi ── */}
            <LeadsBoard
                title="Lidlar"
                panelLayout={panelLayout}
                scrollRoleScope={scrollRoleScope}
                maxVisibleColumns={maxVisibleColumns}
                canManageStatuses={isSuperAdmin(role)}
                canManageColumns={isSuperAdmin(role)}
                canCreateLid={isSuperAdmin(role) || isAdmin(role) || isOperator(role)}
                canDeleteLid={canDeleteLid}
                detailOpen={showDetail}
            />

            {/* ── Detail overlay — leads board ustida, o'z scrolliga ega ── */}
            {showDetail && (
                <Box
                    key={id}
                    position="absolute"
                    inset={0}
                    zIndex={20}
                    bg="bg"
                    overflowY="auto"
                    overflowX="hidden"
                >
                    <LeadDetailPage />
                </Box>
            )}
        </Box>
    );
}
