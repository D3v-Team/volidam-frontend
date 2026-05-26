import { Box, Text, VStack } from "@chakra-ui/react";
import { useAuthStore } from "../../store/authStore";

export default function Dashboard() {
    const user = useAuthStore((s) => s.user);

    return (
        <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minH="calc(100vh - 64px)"
        >
            <VStack spacing={3}>
                <Text fontSize="xl" fontWeight="800" color="text">
                    Xush kelibsiz, {user?.full_name}!
                </Text>
                <Text fontSize="sm" color="gray.500">
                    Volidam boshqaruv paneliga xush kelibsiz
                </Text>
            </VStack>
        </Box>
    );
}