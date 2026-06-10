import { Box, SimpleGrid, Text, useColorModeValue } from "@chakra-ui/react";

export default function LeadDetailSection({
    title,
    subtitle,
    children,
    action = null,
    noPadding = false,
}) {
    const headerBg = useColorModeValue(
        "linear-gradient(180deg, rgba(252, 228, 236, 0.5) 0%, transparent 100%)",
        "transparent"
    );
    const sectionShadow = useColorModeValue(
        "0 4px 24px rgba(233, 30, 99, 0.08)",
        "sm"
    );
    

    return (
        <Box
            w="100%"
            borderRadius="2xl"
            borderWidth="1px"
            borderColor="border"
            bg="surface"
            overflow="hidden"
            boxShadow={sectionShadow}
        >
            {title ? (
                <Box
                    px={{ base: 4, md: 6 }}
                    py={{ base: 4, md: 5 }}
                    borderBottomWidth="1px"
                    borderColor="border"
                    bgImage={headerBg}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    gap={3}
                    flexWrap="wrap"
                >
                    <SimpleGrid minW={0} >
                        <Text
                            fontWeight="700"
                            fontSize={{ base: "md", md: "lg" }}
                            color="text"
                            letterSpacing="-0.01em"
                        >
                         {title}
                        </Text>
                        {subtitle ? (
                            <Text fontSize="sm" color="textSecondary" mt={1} lineHeight="short">
                                {subtitle}
                            </Text>
                        ) : null}
                    </SimpleGrid>
                    {action}
                </Box>
            ) : null}
            <Box p={noPadding ? 0 : { base: 4, md: 6 }}>{children}</Box>
        </Box>
    );
}
