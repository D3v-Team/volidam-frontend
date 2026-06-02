import {
    Text,
    HStack,
    Flex,
    FormControl,
    FormLabel,
    Input,
    Button,
    Badge,
    SimpleGrid,
    Box,
    useColorModeValue,
} from "@chakra-ui/react";
import { Save } from "lucide-react";
import {
    filterFieldProps,
    volidamFormLabel,
    volidamPrimaryButtonSm,
} from "./leadStyles";
import LeadDetailSection from "./LeadDetailSection";

export default function LeadValueFieldsSection({
    columns = [],
    values = {},
    onChange,
    onSave,
    saving = false,
    readOnly = false,
    dirty = false,
}) {
    const fieldBg = useColorModeValue("rgba(255,255,255,0.75)", "whiteAlpha.50");

    if (!columns.length) {
        return (
            <LeadDetailSection
                title="Qo'shimcha maydonlar"
                subtitle="Hozircha columnlar mavjud emas"
            >
                <Text fontSize="sm" color="textSecondary">
                    Super Admin yangi column qo&apos;shishi mumkin.
                </Text>
            </LeadDetailSection>
        );
    }

    const saveAction =
        !readOnly && onSave ? (
            <Button
            type="submit"
                {...volidamPrimaryButtonSm}
                leftIcon={<Save size={15} />}
                isLoading={saving}
                loadingText="Saqlanmoqda..."
                isDisabled={!dirty && !saving}
                onClick={onSave}
            >
                Saqlash
            </Button>
        ) : null;

    return (
        <LeadDetailSection
            title="Qo'shimcha maydonlar"
            subtitle="Har bir column uchun qiymat. Bo'sh qoldirish — o'chiriladi."
            action={
                <HStack spacing={2} flexShrink={0}>
                    {dirty && !readOnly ? (
                        <Badge
                            colorScheme="orange"
                            variant="subtle"
                            borderRadius="full"
                            px={2}
                        >
                            Saqlanmagan
                        </Badge>
                    ) : null}
                    {saveAction}
                </HStack>
            }
        >
            <SimpleGrid
                columns={{ base: 1, sm: 2, lg: 3, xl: 4 }}
                spacing={4}
                w="100%"
            >
                {columns.map((col) => (
                    <Box
                        key={col.id}
                        p={3}
                       
                     
                        bg={fieldBg}
                    >
                        <FormControl isRequired={false}>
                            <FormLabel
                                {...volidamFormLabel}
                                mb={1.5}
                                requiredIndicator={<></>}
                            >
                                <HStack spacing={2} flexWrap="wrap">
                                    <Text as="span" textTransform="none" fontSize="sm">
                                        {col.label}
                                    </Text>
                                    {col.is_required ? (
                                        <Badge
                                            colorScheme="orange"
                                            fontSize="9px"
                                            borderRadius="full"
                                        >
                                            majburiy
                                        </Badge>
                                    ) : null}
                                </HStack>
                            </FormLabel>
                            <Input
                                {...filterFieldProps}
                                size="sm"
                                value={values[col.id] ?? ""}
                                isReadOnly={readOnly}
                                placeholder="Qiymat..."
                                onChange={(e) =>
                                    onChange?.(col.id, e.target.value)
                                }
                                onKeyDown={(e)=> { if(e.key === "Enter") {onSave?.()}}
                                }

                            />
                        </FormControl>
                    </Box>
                ))}
            </SimpleGrid>

            {!readOnly && onSave && dirty ? (
                <Flex justify="flex-end" mt={5} display={{ base: "flex", md: "none" }}>
                    <Button
                        {...volidamPrimaryButtonSm}
                        w="full"
                        leftIcon={<Save size={16} />}
                        isLoading={saving}
                        onClick={onSave}
                    >
                        O&apos;zgarishlarni saqlash
                    </Button>
                </Flex>
            ) : null}
        </LeadDetailSection>
    );
}
