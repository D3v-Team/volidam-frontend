import { Box, Heading, Text, SimpleGrid, Stack, Badge } from "@chakra-ui/react";

export default function SharedPageTwo() {
  return (
    <Box p={{ base: 4, md: 6 }} minH="100%" bg="bg">
      <Stack spacing={4}>
        <Box>
      
          <Heading as="h1" size="lg">Juft Kunlari</Heading>
          <Text color="text" mt={2}>
            Bu sahifa ham barcha rollarda ochiladi 
          </Text>
        </Box>

      
      </Stack>
    </Box>
  );
}
