import {
    Box,
    Flex,
    HStack,
    Text,
    IconButton,
    Avatar,
    useColorMode,
    useColorModeValue,
} from "@chakra-ui/react";
import { TrendingUp, SunMoon } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import LogoutModal from "./LogoutModal";

export default function LeadsPanelHeader() {
    const { toggleColorMode } = useColorMode();
    const user = useAuthStore((s) => s.user);
    const borderCol = useColorModeValue("gray.200", "whiteAlpha.200");

    return (
        <Flex
            as="header"
            position="sticky"
            top={0}
            zIndex={100}
            minH="64px"
            py={3}
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
            <HStack spacing={2} minW={0} flex="1 1 auto">
                <Box color="blue.500" flexShrink={0}>
                    <TrendingUp size={22} />
                </Box>
                <Text fontWeight="800" fontSize="md" color="text" noOfLines={1}>
                    Lidlar
                </Text>
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
                    <Avatar size="sm" name={user?.full_name} bg="blue.500" flexShrink={0} />
                    <Box lineHeight="short" minW={0}>
                        <Text fontSize="sm" fontWeight="600" color="text" noOfLines={1}>
                            {user?.full_name}
                        </Text>
                        <Text fontSize="xs" color="text" noOfLines={1}>
                            {user?.role}
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
