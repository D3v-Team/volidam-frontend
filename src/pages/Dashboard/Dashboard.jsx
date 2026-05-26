import { Box, Flex, Heading, Text, SimpleGrid, Icon } from "@chakra-ui/react";
import { Users, UserCog, Headset, TrendingUp } from "lucide-react";

const stats = [
    { label: "Adminlar", value: "—", icon: UserCog, color: "blue.400" },
    { label: "Operatorlar", value: "—", icon: Headset, color: "green.400" },
    { label: "Lidlar", value: "—", icon: TrendingUp, color: "orange.400" },
    { label: "Foydalanuvchilar", value: "—", icon: Users, color: "purple.400" },
];

export default function Dashboard() {
    return (
        <Box p={6}>
            <Heading size="lg" mb={1} color="text">
                Bosh sahifa
            </Heading>
            <Text color="gray.500" mb={8}>
                Tizim umumiy ko'rinishi
            </Text>

            <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={5}>
                {stats.map((s) => (
                    <Flex
                        key={s.label}
                        bg="surface"
                        p={5}
                        rounded="xl"
                        shadow="sm"
                        align="center"
                        gap={4}
                        border="1px solid"
                        borderColor="border"
                    >
                        <Flex
                            w="48px"
                            h="48px"
                            bg={s.color}
                            rounded="lg"
                            align="center"
                            justify="center"
                            flexShrink={0}
                        >
                            <Icon as={s.icon} color="white" w={5} h={5} />
                        </Flex>
                        <Box>
                            <Text fontSize="2xl" fontWeight="bold" color="text" lineHeight={1.2}>
                                {s.value}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                                {s.label}
                            </Text>
                        </Box>
                    </Flex>
                ))}
            </SimpleGrid>
        </Box>
    );
}
