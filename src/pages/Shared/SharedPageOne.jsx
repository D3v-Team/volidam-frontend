import { Box, Heading, Text, SimpleGrid, Stack, Badge } from "@chakra-ui/react";

export default function SharedPageOne() {
  return (
    <Box p={{ base: 4, md: 6 }} minH="100%" bg="bg">
      <Stack spacing={4}>
        <Box>
      
          <Heading as="h1" size="lg">Toq Kunlari</Heading>
          <Text color="text" mt={2}>
            Bu sahifa admin, operator va super admin uchun bir xil ko‘rinadi.
          </Text>
        </Box>

      
      </Stack>
    </Box>
  );
}
