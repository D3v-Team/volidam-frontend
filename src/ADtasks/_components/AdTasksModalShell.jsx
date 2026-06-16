import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Box,
    Text,
    useColorModeValue,
} from "@chakra-ui/react";

/** ADtasks.jsx modallari bilan bir xil fon, header gradient va footer. */
export function useAdTasksModalChrome(tone = "default") {
    const borderCol = useColorModeValue("gray.200", "whiteAlpha.200");
    const headerBorder = useColorModeValue("gray.200", "whiteAlpha.200");
    const footerBg = useColorModeValue("gray.50", "whiteAlpha.50");
    const heroBg = useColorModeValue(
        "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 50%, #ddd6fe 100%)",
        "linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(99,102,241,0.22) 100%)"
    );
    const heroDangerBg = useColorModeValue(
        "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 40%, #fff7ed 100%)",
        "linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(249,115,22,0.16) 100%)"
    );
    return {
        borderCol,
        headerBorder,
        footerBg,
        heroBg: tone === "danger" ? heroDangerBg : heroBg,
    };
}

export default function AdTasksModalShell({
    isOpen,
    onClose,
    size = "md",
    title,
    subtitle,
    children,
    footer = null,
    isCentered = true,
    closeOnOverlayClick = true,
    tone = "default",
}) {
    const { borderCol, headerBorder, footerBg, heroBg } = useAdTasksModalChrome(tone);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            isCentered={isCentered}
            size={size}
            motionPreset="slideInBottom"
            closeOnOverlayClick={closeOnOverlayClick}
        >
            <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(6px)" />
            <ModalContent
                bg="surface"
                borderRadius="2xl"
                overflow="hidden"
                boxShadow="2xl"
                borderWidth="1px"
                borderColor={borderCol}
            >
                <Box
                    px={6}
                    py={4}
                    borderBottomWidth="1px"
                    borderColor={headerBorder}
                    bgImage={heroBg}
                >
                    <Text fontWeight="bold" fontSize="lg" pr={10}>
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text fontSize="sm" color="gray.500" mt={1}>
                            {subtitle}
                        </Text>
                    ) : null}
                    <ModalCloseButton top={4} />
                </Box>

                <ModalBody px={6} py={5}>{children}</ModalBody>

                {footer != null ? (
                    <ModalFooter
                        bg={footerBg}
                        borderTopWidth="1px"
                        borderColor={headerBorder}
                        gap={3}
                    >
                        {footer}
                    </ModalFooter>
                ) : null}
            </ModalContent>
        </Modal>
    );
}
