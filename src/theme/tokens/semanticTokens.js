const semanticTokens = {
    colors: {
        bg: {
            default: "neutral.50",
            _dark: "neutral.900",
        },
        surface: {
            default: "white",
            _dark: "neutral.800",
        },
        surfBlur: {
            default: 'rgba(255, 255, 255, 0.7)',
            _dark: "rgba(20, 20, 20, 0.65)"
        },
        text: {
            default: "neutral.800",
            _dark: "neutral.100",
        },
        textSecondary: {
            default: "neutral.600",
            _dark: "neutral.300"
        },
        link: {
            default: "brand.500",
            _dark: "brand.300"
        },
        primary: {
            default: "brand.600",
            _dark: "brand.500",
        },
        secondary: {
            default: "brand.500",
            _dark: "brand.600",
        },
        border: {
            default: "neutral.300",
            _dark: "neutral.700",
        },
        // Success (foyda, to'langan, musbat)
        success: {
            default: "green.500",
            _dark: "green.400",
        },
        successBg: {
            default: "green.50",
            _dark: "green.900",
        },

        // Warning (kutilmoqda, qisman)
        warning: {
            default: "orange.500",
            _dark: "orange.400",
        },
        warningBg: {
            default: "orange.50",
            _dark: "orange.900",
        },

        // Danger (zarar, qarz, manfiy)
        danger: {
            default: "red.500",
            _dark: "red.400",
        },
        dangerBg: {
            default: "red.50",
            _dark: "red.900",
        },

        // Info (ma'lumot)
        info: {
            default: "blue.500",
            _dark: "blue.400",
        },
        infoBg: {
            default: "blue.50",
            _dark: "blue.900",
        },

        // Muted (o'chirilgan, ikkilamchi)
        muted: {
            default: "gray.500",
            _dark: "gray.500",
        },
        mutedBg: {
            default: "gray.100",
            _dark: "gray.700",
        },

        // Chart colors
        chartIncoming: {
            default: "green.500",
            _dark: "green.400",
        },
        chartOutgoing: {
            default: "blue.500",
            _dark: "blue.400",
        },
        chartDisposal: {
            default: "orange.500",
            _dark: "orange.400",
        },
    },
};

export default semanticTokens;
