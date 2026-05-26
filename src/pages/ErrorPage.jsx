import React from 'react';
import {
    Box,
    Button,
    Heading,
    Text,
    VStack,
    HStack,
    Container,
    useColorModeValue,
    Icon,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { TriangleAlert, Home, RefreshCw } from "lucide-react";

// Create motion-enabled Chakra components
const MotionBox = motion(Box);

export default function ErrorPage({ status = 404, title, description, onRetry, onHome }) {
    const bg = useColorModeValue('gray.50', 'gray.900');
    const cardBg = useColorModeValue('white', 'gray.800');
    const accent = useColorModeValue('blue.600', 'blue.300');

    const pageTitle = title || (status === 404 ? 'Sahifa topilmadi' : 'Xatolik yuz berdi');
    const pageDesc = description || 'Siz izlagan sahifa mavjud emas yoki muammo yuz berdi. Iltimos bir ozdan so\'ng qayta urinib ko\'ring.';

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { stiffness: 60, type: 'spring', damping: 14 } },
    };

    const floatingVariants = {
        float: {
            y: [0, -10, 0],
            rotate: [0, 1.5, -1.5, 0],
            transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
        },
    };

    const glitchVariants = {
        rest: { textShadow: '0px 0px rgba(0,0,0,0)' },
        glitch: {
            textShadow: [
                '2px 0px 0px rgba(56,178,172,0.9)',
                '-2px 0px 0px rgba(59,130,246,0.9)',
                '0px 0px 0px rgba(0,0,0,0)'
            ],
            transition: { duration: 0.6, repeat: Infinity, repeatDelay: 2 }
        }
    };

    return (
        <Container maxW="container.lg" h="100vh" display="flex" alignItems="center" justifyContent="center" bg={bg}>
            <MotionBox
                initial="hidden"
                animate="show"
                variants={containerVariants}
                w="full"
                p={{ base: 6, md: 12 }}
                borderRadius="2xl"
                bg={cardBg}
                boxShadow="lg"
                display="flex"
                gap={{ base: 6, md: 12 }}
                alignItems="center"
            >
                {/* Left: Illustration / floating error icon */}
                <MotionBox
                    flexShrink={0}
                    w={{ base: '90px', md: '160px' }}
                    h={{ base: '90px', md: '160px' }}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bg={useColorModeValue('gray.100', 'gray.700')}
                    borderRadius="2xl"
                    boxShadow="xl"
                    variants={floatingVariants}
                    animate="float"
                >
                    <Icon as={TriangleAlert} w={{ base: 12, md: 20 }} h={{ base: 12, md: 20 }} color={accent} />
                </MotionBox>

                {/* Right: text + actions */}
                <VStack align="start" spacing={4} flex="1">
                    <MotionBox>
                        <Heading as="h1" size="lg" mb={1}>
                            {pageTitle}
                        </Heading>
                        <MotionBox
                            as={Text}
                            fontSize="sm"
                            color={useColorModeValue('gray.600', 'gray.300')}
                            maxW={{ base: '100%', md: '70%' }}
                        >
                            {pageDesc}
                        </MotionBox>
                    </MotionBox>

                    {/* Big glitchy status number */}
                    <MotionBox>
                        <MotionBox
                            as="div"
                            fontSize={{ base: '5xl', md: '7xl' }}
                            fontWeight="bold"
                            lineHeight={1}
                            variants={glitchVariants}
                            initial="rest"
                            animate="glitch"
                            style={{ WebkitFontSmoothing: 'antialiased' }}
                        >
                            {status}
                        </MotionBox>
                        <Text mt={2} fontSize="sm" color={useColorModeValue('gray.500', 'gray.400')}>
                            Agar siz sayt egasi boʻlsangiz — log fayllarni tekshiring va kerak boʻlsa tizimni tiklashni koʻrib chiqing.
                        </Text>
                    </MotionBox>

                    {/* Actions */}
                    <HStack spacing={3} pt={2}>
                        <Button
                            leftIcon={<RefreshCw />}
                            onClick={() => { if (onRetry) onRetry(); else window.location.reload(); }}
                            variant="solid"
                        >
                            Qayta urinib ko'rish
                        </Button>

                        <Button
                            leftIcon={<Home />}
                            variant="ghost"
                            onClick={() => { if (onHome) onHome(); else (window.location.href = '/'); }}
                        >
                            Bosh sahifaga
                        </Button>

                        <Button
                            ml="auto"
                            variant="link"
                            onClick={() => {
                                // sample: open support chat or report
                                const url = `mailto:support@example.com?subject=Site%20error%20(${status})`;
                                window.location.href = url;
                            }}
                        >
                            Xatolikni xabar qilmoq
                        </Button>
                    </HStack>
                </VStack>
            </MotionBox>
        </Container>
    );
}
