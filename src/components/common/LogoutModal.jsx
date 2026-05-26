import { useState } from "react";
import {
    Button,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    useDisclosure,
    Text
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { LucideLogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function LogoutModal() {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { logout } = useAuth()
    const handleLogout = () => {
        logout()
    };

    return (
        <>
            {/* Trigger Button (xs kiyin istalgan joyga bosib qo'ying) */}
            <Button
                cursor="pointer"
                padding={"0px"}
                bg="surface"
                color={"text"}
                _hover={{ bg: "red.300", color: "red" }}
                onClick={onOpen}
            >
                <LucideLogOut size={20} />
            </Button>

            {/* Modal */}
            <Modal isOpen={isOpen} onClose={onClose} isCentered>
                <ModalOverlay
                    bg="blackAlpha.300"
                    backdropFilter="blur(6px)"
                />
                <ModalContent>
                    <ModalHeader>Chiqishni tasdiqlang</ModalHeader>
                    <ModalCloseButton />

                    <ModalBody>
                        <Text>Haqiqatan ham tizimdan chiqmoqchimisiz?</Text>
                    </ModalBody>

                    <ModalFooter gap={3}>
                        <Button variant="ghost" onClick={onClose}>
                            Bekor qilish
                        </Button>
                        <Button colorScheme="red" onClick={handleLogout}>
                            Chiqish
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}
