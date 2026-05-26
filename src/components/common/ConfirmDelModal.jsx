import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Button,
    Text,
} from "@chakra-ui/react";

export default function ConfirmDelModal({ isOpen, onClose, onConfirm, itemName, loading, typeItem }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(6px)" />

            <ModalContent>
                <ModalHeader>Confirm Delete</ModalHeader>

                <ModalBody>
                    <Text>Haqiqatda bu {typeItem} o'chirmoqchimisiz?</Text>
                    <Text color={"red.400"}>{itemName}</Text>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button isLoading={loading} loadingText="O‘chirilmoqda..." colorScheme="red" onClick={onConfirm}>
                        Delete
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
