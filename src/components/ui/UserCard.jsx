import {
    Box,
    Flex,
    Text,
    Avatar,
    IconButton,
    HStack,
    useColorModeValue,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon, LockIcon } from "@chakra-ui/icons";
import {
    volidamEditIconButton,
    volidamLockIconButton,
    volidamDeleteIconButton,
    volidamSectionShadow,
} from "./volidamUi";

/** Admin / Operator foydalanuvchi kartochkasi — amallar ismning o'ng tomonida */
export default function UserCard({
    user,
    onEdit,
    onResetPassword,
    onDelete,
}) {
    const hoverBorder = useColorModeValue("brand.400", "brand.500");
    const cardShadow = useColorModeValue(
        "0 4px 20px rgba(233, 30, 99, 0.08)",
        volidamSectionShadow.base
    );

    return (
        <Box
            borderWidth="1px"
            borderColor="border"
            borderRadius="2xl"
            bg="surface"
            p={4}
            boxShadow={cardShadow}
            transition="border-color 0.2s, box-shadow 0.2s, transform 0.15s"
            _hover={{
                borderColor: hoverBorder,
                transform: "translateY(-2px)",
                boxShadow: "0 8px 28px rgba(233, 30, 99, 0.12)",
            }}
        >
            <Flex align="flex-start" gap={3}>
                <Avatar
                    name={user.full_name}
                    size="lg"
                    bg="brand.500"
                    color="white"
                    flexShrink={0}
                />

                <Box flex="1" minW={0}>
                    <Flex align="flex-start" justify="space-between" gap={2}>
                        <Text
                            fontWeight="700"
                            fontSize="md"
                            color="text"
                            noOfLines={1}
                            letterSpacing="0.02em"
                            textTransform="uppercase"
                            flex="1"
                            minW={0}
                        >
                            {user.full_name}
                        </Text>

                        <HStack spacing={0.5} flexShrink={0}>
                            <IconButton
                                {...volidamEditIconButton}
                                size="xs"
                                icon={<EditIcon boxSize={3} />}
                                aria-label="Tahrirlash"
                                onClick={() => onEdit?.(user)}
                            />
                            <IconButton
                                {...volidamLockIconButton}
                                size="xs"
                                icon={<LockIcon boxSize={3} />}
                                aria-label="Parolni tiklash"
                                onClick={() => onResetPassword?.(user)}
                            />
                            <IconButton
                                {...volidamDeleteIconButton}
                                size="xs"
                                icon={<DeleteIcon boxSize={3} />}
                                aria-label="O'chirish"
                                onClick={() => onDelete?.(user)}
                            />
                        </HStack>
                    </Flex>

                    <Text fontSize="sm" color="textSecondary" mt={0.5} noOfLines={1}>
                        @{user.username}
                    </Text>
                </Box>
            </Flex>
        </Box>
    );
}
