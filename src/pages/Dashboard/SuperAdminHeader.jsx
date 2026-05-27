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
import {
  TrendingUp,
  SunMoon,
  Home,
  ShieldCheck,
  Headset,
  Users,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import LogoutModal from "../../components/common/LogoutModal";

const NAV_LINKS = [
  { label: "Bosh sahifa", to: "/superadmin", icon: <Home size={16} /> },
  {
    label: "Adminlar",
    to: "/superadmin/admins",
    icon: <ShieldCheck size={16} />,
  },
  {
    label: "Operatorlar",
    to: "/superadmin/operators",
    icon: <Headset size={16} />,
  },
  { label: "Lidlar", to: "/superadmin/leads", icon: <Users size={16} /> },
];

export default function SuperAdminHeader() {
  const { toggleColorMode } = useColorMode();
  const user = useAuthStore((s) => s.user);
  const borderCol = useColorModeValue("gray.200", "whiteAlpha.200");
  const activeBg = useColorModeValue("blue.50", "whiteAlpha.100");
  const activeColor = useColorModeValue("blue.600", "blue.300");
  const hoverBg = useColorModeValue("gray.100", "whiteAlpha.100");
  const { pathname } = useLocation();

  const showBack = pathname !== "/superadmin";
  const currentPage = NAV_LINKS.find((l) =>
    l.to === "/superadmin" ? pathname === "/superadmin" : pathname.startsWith(l.to),
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
        <Box color="blue.500" pl={"80px"} >
          {showBack ? currentPage?.icon : <TrendingUp size={20} />}
        </Box>
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
              leftIcon={link.icon}
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
