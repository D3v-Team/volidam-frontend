import {
  Box,
  Flex,
  HStack,
  Text,
  IconButton,
  Avatar,
  useColorMode,
  useColorModeValue,
  Button,
} from "@chakra-ui/react";
import { TrendingUp, SunMoon } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { getRoleLabel } from "../../utils/roles";
import LogoutModal from "../../components/common/LogoutModal";
import { ChevronLeftIcon } from "@chakra-ui/icons";

const NAV_LINKS = [
  { label: "Bosh sahifa", to: "/superadmin" },
  { label: "Adminlar", to: "/superadmin/admins" },
  { label: "Operatorlar", to: "/superadmin/operators" },
  { label: "Lidslar", to: "/superadmin/leads" },
];

export default function SuperAdminHeader() {
  const { toggleColorMode } = useColorMode();
  const user = useAuthStore((s) => s.user);
  const borderCol = useColorModeValue("gray.200", "whiteAlpha.200");
  const activeBg = useColorModeValue("blue.50", "whiteAlpha.100");
  const activeColor = useColorModeValue("blue.600", "blue.300");
  const hoverBg = useColorModeValue("gray.100", "whiteAlpha.100");
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const showBack = pathname !== "/superadmin";

  const currentPage = NAV_LINKS.find((l) =>
    l.to === "/superadmin"
      ? pathname === "/superadmin"
      : pathname.startsWith(l.to),
  );

  return (
    <Flex
      as="header"
      position="sticky"
      top={0}
      zIndex={100}
      minH="64px"
      py={2}
      px={{ base: 3, md: 5 }}
      align="center"
      justify="space-between"
      gap={3}
      flexWrap="wrap"
      bg="surface"
      borderBottomWidth="1px"
      borderColor={borderCol}
      flexShrink={0}
    >
      <HStack spacing={2} minW={0} flexShrink={0}>
        {showBack ? (
          <IconButton
            aria-label="Orqaga"
            icon={<ChevronLeftIcon boxSize={5} />}
            variant="ghost"
            borderRadius="lg"
            size="sm"
            onClick={() => navigate("/superadmin")}
          />
        ) : (
          <Box color="blue.500">
            <TrendingUp size={22} />
          </Box>
        )}
        <Text fontWeight="800" fontSize="md" color="text" noOfLines={1}>
          {showBack ? (currentPage?.label ?? "Volidam") : "Volidam"}
        </Text>
      </HStack>

      <HStack
        as="nav"
        spacing={1}
        display={{ base: "none", md: "flex" }}
        flex="1 1 auto"
        justify="center"
      >
        {NAV_LINKS.map((link) => {
          const isActive =
            link.to === "/superadmin"
              ? pathname === "/superadmin"
              : pathname.startsWith(link.to);
          return (
            <Button
              key={link.to}
              as={NavLink}
              to={link.to}
              size="sm"
              variant="ghost"
              borderRadius="lg"
              px={3}
              fontWeight={isActive ? "700" : "500"}
              bg={isActive ? activeBg : "transparent"}
              color={isActive ? activeColor : "text"}
              _hover={{ bg: isActive ? activeBg : hoverBg }}
            >
              {link.label}
            </Button>
          );
        })}
      </HStack>

      <HStack spacing={2} flexShrink={0}>
        <HStack
          spacing={2}
          display={{ base: "none", md: "flex" }}
          pr={2}
          borderRightWidth="1px"
          borderColor={borderCol}
          maxW="200px"
        >
          <Avatar
            size="xs"
            name={user?.full_name}
            bg="blue.500"
            flexShrink={0}
          />
          <Box lineHeight="short" minW={0}>
            <Text fontSize="sm" fontWeight="600" color="text" noOfLines={1}>
              {user?.full_name}
            </Text>
            <Text fontSize="xs" color="gray.500" noOfLines={1}>
              {getRoleLabel(user?.role)}
            </Text>
          </Box>
        </HStack>

        <IconButton
          aria-label="Rang rejimini almashtirish"
          icon={<SunMoon size={18} />}
          variant="ghost"
          borderRadius="lg"
          flexShrink={0}
          onClick={toggleColorMode}
        />
        <Box flexShrink={0}>
          <LogoutModal />
        </Box>
      </HStack>
    </Flex>
  );
}
