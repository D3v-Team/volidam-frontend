import { border } from "@chakra-ui/react";

const Button = {
    baseStyle: {
        borderRadius: "xl",
        fontWeight: "600",
    },
    sizes: {
        xl: {
            fontSize: "lg",
            px: 6,
            py: 4,
        },
    },

    // Semantic tokens
    variants: {
        solidPrimary: {
            bg: "primary",
            color: "white",
            _hover: { bg: "secondary" },
            _active: { bg: "primary" },
        },

        outlinePrimary: {
            borderWidth: "2px",
            borderColor: "border",
            color: "text",
            _hover: {
                bg: "surface",
            }
        }
    },

    defaultProps: {
        size: "md",
    },
};

export default Button;
