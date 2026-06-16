import {
    Box,
    Text,
    Button,
    Badge,
    VStack,
    SimpleGrid,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useColorModeValue,
    Flex,
    Divider,
    HStack,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import {
    taskTypeLabel,
    taskStatusLabel,
    taskPriorityLabel,
    DETAIL_FIELD_LABELS,
    TASK_DETAIL_LAYOUT_KEYS,
    locationTypeLabelUz,
    locationTypeColorScheme,
    adminPathForTaskLocation,
} from "./taskHelpers";

export default function TaskDetailsModal({
    isOpen,
    onClose,
    details,
    meta,
    /** Optional task type (for layout tweaks) */
    taskType,
    /** Optional override for role-specific route mapping */
    locationPathFor,
    /** Optional override for role-specific stock (warehouse) navigation */
    warehouseStockPathFor,
}) {
    const navigate = useNavigate();
    const panelBg = useColorModeValue("gray.50", "whiteAlpha.100");
    const borderCol = useColorModeValue("gray.200", "whiteAlpha.200");
    const locStripBg = useColorModeValue("white", "whiteAlpha.50");

    const d = details && typeof details === "object" ? details : {};
    const entries = Object.entries(d).filter(
        ([, v]) => v !== null && v !== undefined && String(v).trim() !== ""
    );

    const productName = d.product_name;
    const restEntries = entries.filter(([key]) => !TASK_DETAIL_LAYOUT_KEYS.has(key));

    const noteText =
        d.note != null && String(d.note).trim() !== ""
            ? String(d.note).trim()
            : d.izoh != null && String(d.izoh).trim() !== ""
            ? String(d.izoh).trim()
            : "";

    const typeToken = String(taskType ?? meta?.Turi ?? "")
        .trim()
        .toLowerCase();
    const isCompanyType = typeToken === "company" || typeToken.includes("kompaniya");

    const locName =
        d.location_name != null && String(d.location_name).trim() !== ""
            ? String(d.location_name).trim()
            : "";
    const locTypeRaw =
        d.location_type != null && String(d.location_type).trim() !== ""
            ? String(d.location_type).trim()
            : "";
    const locId =
        d.location_id != null && String(d.location_id).trim() !== ""
            ? String(d.location_id).trim()
            : "";
    const locPath = (locationPathFor || adminPathForTaskLocation)(locTypeRaw, locId);

    const companyAddress =
        d.address != null && String(d.address).trim() !== "" ? String(d.address).trim() : "";
    const companyPhone =
        d.phone != null && String(d.phone).trim() !== "" ? String(d.phone).trim() : "";
    const companyDirector =
        d.director_name != null && String(d.director_name).trim() !== ""
            ? String(d.director_name).trim()
            : "";
    const companyInn =
        d.inn != null && String(d.inn).trim() !== "" ? String(d.inn).trim() : "";
    const companyRatingGrade =
        d.rating_grade != null && String(d.rating_grade).trim() !== ""
            ? String(d.rating_grade).trim()
            : "";
    const companyRating =
        d.rating == null || String(d.rating).trim() === ""
            ? ""
            : Number.isFinite(Number(d.rating))
            ? String(Number(d.rating))
            : String(d.rating);

    const factoryId =
        d.factory_id != null && String(d.factory_id).trim() !== ""
            ? String(d.factory_id).trim()
            : "";
    const warehouseId =
        d.warehouse_id != null && String(d.warehouse_id).trim() !== ""
            ? String(d.warehouse_id).trim()
            : "";
    const stockId =
        d.stock_id != null && String(d.stock_id).trim() !== ""
            ? String(d.stock_id).trim()
            : "";

    const defaultWarehouseStockPathFor = (fId, wId, sId) => {
        if (!fId || !wId) return null;
        const base = `/factories/${encodeURIComponent(fId)}/warehouses/${encodeURIComponent(wId)}`;
        if (!sId) return base;
        return `${base}?task_stock_id=${encodeURIComponent(sId)}`;
    };
    const stockPath = (warehouseStockPathFor || defaultWarehouseStockPathFor)(
        factoryId,
        warehouseId,
        stockId
    );

    const metaValueToString = (v) => {
        if (v === null || v === undefined) return "";
        if (typeof v === "string") return v;
        if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
        if (typeof v === "object") {
            const n = v?.name ?? v?.label ?? v?.title ?? v?.value;
            if (n != null && String(n).trim() !== "") return String(n);
            try {
                return JSON.stringify(v);
            } catch {
                return String(v);
            }
        }
        return String(v);
    };

    const metaEntries =
        meta && typeof meta === "object"
            ? Object.entries(meta)
                  .map(([k, v]) => [k, metaValueToString(v)])
                  .filter(([, v]) => String(v).trim() !== "")
            : [];

    const hasLocationBlock = Boolean(locTypeRaw || locName || locPath);
    const hasStockBlock = Boolean(factoryId && warehouseId && stockPath);
    const hasCompanyExtras = isCompanyType;
    const hasContent =
        metaEntries.length > 0 ||
        Boolean(noteText) ||
        hasLocationBlock ||
        hasStockBlock ||
        hasCompanyExtras ||
        Boolean(productName) ||
        restEntries.length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
            <ModalOverlay backdropFilter="blur(4px)" />
            <ModalContent bg="surface" borderColor="border" borderWidth="1px">
                <ModalHeader pb={2}>Batafsil ma&apos;lumot</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    {!hasContent ? (
                        <Text color="gray.500" py={4}>
                            Qo&apos;shimcha ma&apos;lumot yo&apos;q
                        </Text>
                    ) : (
                        <VStack align="stretch" spacing={4}>
                            {hasCompanyExtras ? (
                                <Box
                                    p={4}
                                    borderRadius="xl"
                                    bg={panelBg}
                                    borderWidth="1px"
                                    borderColor={borderCol}
                                >
                                    <Text
                                        fontSize="xs"
                                        fontWeight="800"
                                        color="gray.500"
                                        letterSpacing="0.1em"
                                        textTransform="uppercase"
                                        mb={3}
                                    >
                                        Kompaniya ma&apos;lumotlari
                                    </Text>
                                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                                        <Box
                                            p={3}
                                            borderRadius="md"
                                            bg={locStripBg}
                                            borderWidth="1px"
                                            borderColor={borderCol}
                                        >
                                            <Text
                                                fontSize="xs"
                                                fontWeight="semibold"
                                                color="gray.500"
                                                mb={1}
                                            >
                                                INN:
                                            </Text>
                                            <Text fontSize="sm" fontWeight="700" fontFamily="mono">
                                                {companyInn || "—"}
                                            </Text>
                                        </Box>

                                        <Box
                                            p={3}
                                            borderRadius="md"
                                            bg={locStripBg}
                                            borderWidth="1px"
                                            borderColor={borderCol}
                                        >
                                            <Text
                                                fontSize="xs"
                                                fontWeight="semibold"
                                                color="gray.500"
                                                mb={1}
                                            >
                                                Reyting:
                                            </Text>
                                            <HStack spacing={2} flexWrap="wrap">
                                                {companyRatingGrade ? (
                                                    <Badge
                                                        colorScheme="purple"
                                                        variant="subtle"
                                                        borderRadius="full"
                                                    >
                                                        {companyRatingGrade}
                                                    </Badge>
                                                ) : null}
                                                <Text fontSize="sm" fontWeight="800">
                                                    {companyRating || "—"}
                                                </Text>
                                            </HStack>
                                        </Box>

                                        <Box
                                            p={3}
                                            borderRadius="md"
                                            bg={locStripBg}
                                            borderWidth="1px"
                                            borderColor={borderCol}
                                        >
                                            <Text
                                                fontSize="xs"
                                                fontWeight="semibold"
                                                color="gray.500"
                                                mb={1}
                                            >
                                                Telefon:
                                            </Text>
                                            <Text fontSize="sm" fontWeight="700">
                                                {companyPhone || "—"}
                                            </Text>
                                        </Box>

                                        <Box
                                            p={3}
                                            borderRadius="md"
                                            bg={locStripBg}
                                            borderWidth="1px"
                                            borderColor={borderCol}
                                        >
                                            <Text
                                                fontSize="xs"
                                                fontWeight="semibold"
                                                color="gray.500"
                                                mb={1}
                                            >
                                                Direktor:
                                            </Text>
                                            <Text fontSize="sm" fontWeight="700">
                                                {companyDirector || "—"}
                                            </Text>
                                        </Box>
                                    </SimpleGrid>
                                </Box>
                            ) : null}
                            {metaEntries.length > 0 ? (
                                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                                    {metaEntries.map(([k, v]) => (
                                        <Box
                                            key={k}
                                            p={3}
                                            borderRadius="md"
                                            bg={panelBg}
                                            borderWidth="1px"
                                            borderColor={borderCol}
                                        >
                                            <Text
                                                fontSize="xs"
                                                fontWeight="semibold"
                                                color="gray.500"
                                                textTransform="uppercase"
                                                letterSpacing="wide"
                                                mb={1}
                                            >
                                                {String(k)}
                                            </Text>
                                            <Text
                                                fontSize="sm"
                                                fontWeight="medium"
                                                color="text"
                                                wordBreak="break-word"
                                                title={String(v)}
                                            >
                                                {String(v)}
                                            </Text>
                                        </Box>
                                    ))}
                                </SimpleGrid>
                            ) : null}

                            {productName || noteText ? (
                                <SimpleGrid
                                    columns={{ base: 1, sm: isCompanyType ? 2 : 1 }}
                                    spacing={3}
                                >
                                    {productName ? (
                                        <Box
                                            p={3}
                                            borderRadius="md"
                                            bg={panelBg}
                                            borderWidth="1px"
                                            borderColor={borderCol}
                                            gridColumn={!isCompanyType ? "1 / -1" : undefined}
                                        >
                                            <Text
                                                fontSize="xs"
                                                fontWeight="semibold"
                                                color="gray.500"
                                                textTransform="uppercase"
                                                letterSpacing="wide"
                                                mb={1}
                                            >
                                                {DETAIL_FIELD_LABELS.product_name}
                                            </Text>
                                            <Text
                                                fontSize="sm"
                                                fontWeight="600"
                                                color="text"
                                                wordBreak="break-word"
                                                title={String(productName)}
                                            >
                                                {String(productName)}
                                            </Text>
                                        </Box>
                                    ) : null}
                                    {noteText ? (
                                        <Box
                                            p={3}
                                            borderRadius="md"
                                            bg={panelBg}
                                            borderWidth="1px"
                                            borderColor={borderCol}
                                            // Company detailda izoh kattaroq: butun qatorni egallasin
                                            gridColumn="1 / -1"
                                        >
                                            <Text
                                                fontSize="xs"
                                                fontWeight="semibold"
                                                color="gray.500"
                                                textTransform="uppercase"
                                                letterSpacing="wide"
                                                mb={1}
                                            >
                                                Izoh
                                            </Text>
                                            <Text
                                                fontSize="sm"
                                                fontWeight="600"
                                                color="text"
                                                whiteSpace="pre-wrap"
                                                wordBreak="break-word"
                                                title={String(noteText)}
                                            >
                                                {noteText}
                                            </Text>
                                        </Box>
                                    ) : null}
                                </SimpleGrid>
                            ) : null}

                            {hasLocationBlock ? (
                                <Box
                                    borderRadius="xl"
                                    overflow="hidden"
                                    borderWidth="1px"
                                    borderColor={borderCol}
                                    bg={panelBg}
                                >
                                    <Flex
                                        px={4}
                                        py={3.5}
                                        align="flex-start"
                                        justify="space-between"
                                        gap={4}
                                        wrap="wrap"
                                        bg={locStripBg}
                                        borderLeftWidth="4px"
                                        borderLeftColor={`${locationTypeColorScheme(locTypeRaw)}.500`}
                                    >
                                        <Box flex="1" minW={0}>
                                            {locTypeRaw ? (
                                                <>
                                                    <Text
                                                        fontSize="10px"
                                                        fontWeight="800"
                                                        color="gray.500"
                                                        letterSpacing="0.1em"
                                                        textTransform="uppercase"
                                                        mb={2}
                                                    >
                                                        Joylashuv turi
                                                    </Text>
                                                    <Badge
                                                        colorScheme={locationTypeColorScheme(locTypeRaw)}
                                                        variant="subtle"
                                                        px={3}
                                                        py={1.5}
                                                        borderRadius="full"
                                                        fontSize="sm"
                                                        fontWeight="700"
                                                        textTransform="none"
                                                        maxW="100%"
                                                        whiteSpace="normal"
                                                        textAlign="left"
                                                    >
                                                        {locationTypeLabelUz(locTypeRaw)}
                                                    </Badge>
                                                </>
                                            ) : locName ? (
                                                <>
                                                    <Text
                                                        fontSize="10px"
                                                        fontWeight="800"
                                                        color="gray.500"
                                                        letterSpacing="0.1em"
                                                        textTransform="uppercase"
                                                        mb={1}
                                                    >
                                                        Joylashuv nomi
                                                    </Text>
                                                    <Text
                                                        fontSize="sm"
                                                        fontWeight="600"
                                                        wordBreak="break-word"
                                                    >
                                                        {locName}
                                                    </Text>
                                                </>
                                            ) : null}
                                        </Box>
                                        {locPath ? (
                                            <Button
                                                size="sm"
                                                colorScheme="blue"
                                                borderRadius="lg"
                                                flexShrink={0}
                                                alignSelf="flex-start"
                                                onClick={() => {
                                                    navigate(locPath);
                                                    onClose();
                                                }}
                                            >
                                                Ko&apos;rsatish
                                            </Button>
                                        ) : null}
                                    </Flex>
                                    {locTypeRaw && locName ? (
                                        <Box
                                            px={4}
                                            py={3}
                                            borderTopWidth="1px"
                                            borderColor={borderCol}
                                        >
                                            <Text
                                                fontSize="10px"
                                                fontWeight="800"
                                                color="gray.500"
                                                letterSpacing="0.1em"
                                                textTransform="uppercase"
                                                mb={1}
                                            >
                                                Joylashuv nomi
                                            </Text>
                                            <Text
                                                fontSize="sm"
                                                fontWeight="600"
                                                wordBreak="break-word"
                                            >
                                                {locName}
                                            </Text>
                                        </Box>
                                    ) : null}
                                </Box>
                            ) : null}

                            {/* product_name + izoh yuqorida "tile" ko'rinishida beriladi */}

                            {hasStockBlock ? (
                                <Box
                                    borderRadius="xl"
                                    overflow="hidden"
                                    borderWidth="1px"
                                    borderColor={borderCol}
                                    bg={panelBg}
                                >
                                    <Flex
                                        px={4}
                                        py={3.5}
                                        align="flex-start"
                                        justify="space-between"
                                        gap={4}
                                        wrap="wrap"
                                        bg={locStripBg}
                                        borderLeftWidth="4px"
                                        borderLeftColor="blue.500"
                                    >
                                        <Box flex="1" minW={0}>
                                            <Text
                                                fontSize="10px"
                                                fontWeight="800"
                                                color="gray.500"
                                                letterSpacing="0.1em"
                                                textTransform="uppercase"
                                                mb={2}
                                            >
                                                Mahsulot joylashuvi
                                            </Text>
                                            <Badge
                                                colorScheme="blue"
                                                variant="subtle"
                                                px={3}
                                                py={1.5}
                                                borderRadius="full"
                                                fontSize="sm"
                                                fontWeight="700"
                                                textTransform="none"
                                                maxW="100%"
                                                whiteSpace="normal"
                                                textAlign="left"
                                            >
                                                Zavod / Ombor
                                            </Badge>
                                            {/* stock_id display removed by requirement */}
                                        </Box>
                                        {stockPath ? (
                                            <Button
                                                size="sm"
                                                colorScheme="blue"
                                                borderRadius="lg"
                                                flexShrink={0}
                                                alignSelf="flex-start"
                                                onClick={() => {
                                                    navigate(stockPath);
                                                    onClose();
                                                }}
                                            >
                                                Ko&apos;rsatish
                                            </Button>
                                        ) : null}
                                    </Flex>
                                </Box>
                            ) : null}
                        </VStack>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
