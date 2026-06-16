import {
    Box,
    HStack,
    Text,
    Center,
    VStack,
    Grid,
    GridItem,
    useColorModeValue,
    IconButton,
    Checkbox,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
} from "@chakra-ui/react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

function ColumnHeaderActionsMenu({
    onEditColumn,
    onDeleteColumn,
    menuButtonProps = {},
    dangerColor,
    hoverBg,
}) {
    const menuHoverBg = useColorModeValue("gray.50", "whiteAlpha.100");
    const menuDangerHoverBg = useColorModeValue("red.50", "whiteAlpha.100");

    return (
        <Menu placement="bottom-end" isLazy>
            <MenuButton
                as={IconButton}
                aria-label="Status amallari"
                icon={<MoreVertical size={16} />}
                size="xs"
                variant="ghost"
                borderRadius="md"
                onClick={(e) => e.stopPropagation()}
                {...menuButtonProps}
            />
            <MenuList
                minW="160px"
                zIndex={20}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <MenuItem
                    icon={<Pencil size={14} />}
                    onClick={(e) => {
                        e.stopPropagation();
                        onEditColumn?.();
                    }}
                    borderRadius="md"
                    _hover={{ bg: hoverBg ?? menuHoverBg }}
                >
                    Tahrirlash
                </MenuItem>
                <MenuItem
                    icon={<Trash2 size={14} />}
                    color={dangerColor ?? "red.500"}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteColumn?.();
                    }}
                    borderRadius="md"
                    _hover={{ bg: menuDangerHoverBg }}
                >
                    O&apos;chirish
                </MenuItem>
            </MenuList>
        </Menu>
    );
}

export default function KanbanColumn({
    statusKey,
    /** PUT /tasks/:id/status uchun UUID; bo‘lsa drag-drop shu ID bilan ketadi */
    statusApiId = null,
    title,
    colorScheme = "blue",
    badgeHexBg,
    count,
    isActiveDrop,
    showColumnActions = false,
    onEditColumn,
    onDeleteColumn,
    /** Bulk assign mode: show checkbox in column header */
    headerCheck = null,
    /** Non-company types: keep task gaps consistent */
    uniformTaskSpacing = false,
    /** Kompaniya vazifalari: sarlavhada rangli fon yo‘q, matn + count markazda */
    plainTitle = false,
    /** Drag sessiyasi: ustun fon/chegara animatsiyasini o‘chirish */
    disableChromeTransition = false,
    children,
}) {
    const bg = useColorModeValue("gray.50", "whiteAlpha.50");
    const border = useColorModeValue("gray.200", "whiteAlpha.200");
    const plainTitleColor = useColorModeValue("gray.800", "gray.100");
    const plainCountColor = useColorModeValue("blue.600", "blue.300");
    const bannerSchemeBg = useColorModeValue(
        `${colorScheme}.500`,
        `${colorScheme}.600`
    );
    const bannerBg = badgeHexBg || bannerSchemeBg;
    const bannerActionHover = useColorModeValue("blackAlpha.100", "whiteAlpha.200");
    const activeBg = useColorModeValue("blue.50", "whiteAlpha.100");
    const activeBorder = useColorModeValue("blue.300", "blue.400");
    const emptyBorder = useColorModeValue("gray.200", "gray.200");
    const emptyText = useColorModeValue("gray.500", "gray.400");
    const actionHover = useColorModeValue("gray.100", "whiteAlpha.200");
    const listSpacing = uniformTaskSpacing ? 2 : count > 0 && count <= 2 ? 4 : 2;

    return (
        <Box
            bg={isActiveDrop ? activeBg : bg}
            borderWidth="1px"
            borderColor={isActiveDrop ? activeBorder : border}
            borderRadius="2xl"
            p={3}
            // Let columns grow naturally together (no internal scroll)
            h="100%"
            minH="400px"
            w="100%"
            display="flex"
            flexDirection="column"
            transition={
                disableChromeTransition
                    ? "none"
                    : "background 0.15s ease, border-color 0.15s ease"
            }
        >
            {plainTitle ? (
                <Grid
                    templateColumns={
                        headerCheck
                            ? "auto minmax(0,1fr) auto"
                            : "minmax(0,1fr) auto minmax(0,1fr)"
                    }
                    alignItems="center"
                    gap={2}
                    mb={3}
                    px={1}
                    w="100%"
                >
                    <GridItem justifySelf="start" minW={0}>
                        {headerCheck ? (
                            <Checkbox
                                isChecked={!!headerCheck.checked}
                                isIndeterminate={!!headerCheck.indeterminate}
                                onChange={headerCheck.onChange}
                                onClick={(e) => e.stopPropagation()}
                                mt={0.5}
                            />
                        ) : null}
                    </GridItem>
                    <GridItem justifySelf="center" minW={0}>
                        <HStack spacing={2} justify="center" align="center" flexWrap="wrap">
                            <Text
                                fontWeight="700"
                                fontSize="md"
                                color={plainTitleColor}
                                textAlign="center"
                                noOfLines={2}
                            >
                                {title}
                            </Text>
                            <Text
                                fontSize="sm"
                                fontWeight="semibold"
                                color={plainCountColor}
                                flexShrink={0}
                            >
                                {count}
                            </Text>
                        </HStack>
                    </GridItem>
                    <GridItem justifySelf="end">
                        {showColumnActions ? (
                            <ColumnHeaderActionsMenu
                                onEditColumn={onEditColumn}
                                onDeleteColumn={onDeleteColumn}
                                hoverBg={actionHover}
                            />
                        ) : null}
                    </GridItem>
                </Grid>
            ) : (
                <Box
                    w="107%"
                    mx={-3}
                    mt={-3}
                    mb={3}
                    px={3}
                    pt={3}
                    pb={2.5}
                    bg={bannerBg}
                    borderTopRadius="2xl"
                >
                    <Grid
                        templateColumns={
                            headerCheck
                                ? "auto minmax(0,1fr) auto"
                                : "minmax(0,1fr) auto minmax(0,1fr)"
                        }
                        alignItems="center"
                        gap={2}
                        w="100%"
                    >
                        <GridItem justifySelf="start" minW={0}>
                            {headerCheck ? (
                                <Checkbox
                                    isChecked={!!headerCheck.checked}
                                    isIndeterminate={!!headerCheck.indeterminate}
                                    onChange={headerCheck.onChange}
                                    onClick={(e) => e.stopPropagation()}
                                    mt={0.5}
                                    colorScheme="whiteAlpha"
                                    sx={{
                                        "& .chakra-checkbox__control": {
                                            borderColor: "whiteAlpha.800",
                                            bg: "whiteAlpha.200",
                                        },
                                    }}
                                />
                            ) : null}
                        </GridItem>
                        <GridItem justifySelf="center" minW={0}>
                            <HStack spacing={2} justify="center" align="center" flexWrap="wrap">
                                <Text
                                    fontWeight="700"
                                    fontSize="md"
                                    color="white"
                                    textAlign="center"
                                    noOfLines={2}
                                >
                                    {title}
                                </Text>
                                <Text
                                    fontSize="sm"
                                    fontWeight="semibold"
                                    color="whiteAlpha.900"
                                    flexShrink={0}
                                >
                                    {count}
                                </Text>
                            </HStack>
                        </GridItem>
                        <GridItem justifySelf="end">
                            {showColumnActions ? (
                                <ColumnHeaderActionsMenu
                                    onEditColumn={onEditColumn}
                                    onDeleteColumn={onDeleteColumn}
                                    menuButtonProps={{
                                        color: "whiteAlpha.900",
                                        _hover: { bg: bannerActionHover },
                                    }}
                                    dangerColor="red.200"
                                    hoverBg={bannerActionHover}
                                />
                            ) : null}
                        </GridItem>
                    </Grid>
                </Box>
            )}

            <Box pr={1}>
                {count === 0 ? (
                    <VStack align="stretch" spacing={4}>
                        <Center
                            py={10}
                            borderWidth="1px"
                            borderStyle="dashed"
                            borderColor={emptyBorder}
                            borderRadius="xl"
                            bg={useColorModeValue("white", "transparent")}
                        >
                            <VStack spacing={2}>
                                <Text fontWeight="700" color={emptyText}>
                                    Vazifalar yo&apos;q
                                </Text>
                                <Text fontSize="sm" color={emptyText}>
                                    Bu statusda hozircha vazifa yo&apos;q.
                                </Text>
                            </VStack>
                        </Center>
                        {children}
                    </VStack>
                ) : (
                    <VStack align="stretch" spacing={listSpacing}>
                        {children}
                    </VStack>
                )}
            </Box>
        </Box>
    );
}
