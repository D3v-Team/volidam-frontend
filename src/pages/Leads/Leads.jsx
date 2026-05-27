import { useLocation } from "react-router-dom";
import LeadsBoard from "../../components/leads/LeadsBoard";
import { useAuthStore } from "../../store/authStore";
import { isAdmin, isOperator, isSuperAdmin } from "../../utils/roles";

export default function Leads() {
    const user = useAuthStore((s) => s.user);
    const role = user?.role;
    const { pathname } = useLocation();

    const panelLayout =
        pathname.startsWith("/admin") || pathname.startsWith("/operator");

    const scrollRoleScope = pathname.startsWith("/operator")
        ? "operator"
        : pathname.startsWith("/admin")
            ? "admin"
            : "superadmin";

    const maxVisibleColumns = isSuperAdmin(role) ? 4 : 5;

    return (
        <LeadsBoard
            title="Lidlar"
            panelLayout={panelLayout}
            scrollRoleScope={scrollRoleScope}
            maxVisibleColumns={maxVisibleColumns}
            canManageStatuses={isSuperAdmin(role)}
            canManageColumns={isSuperAdmin(role)}
            canCreateLid={isSuperAdmin(role) || isAdmin(role) || isOperator(role)}
        />
    );
}
