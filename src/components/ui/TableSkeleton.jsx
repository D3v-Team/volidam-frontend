import { Skeleton, Stack, Td, Tr } from "@chakra-ui/react";

export default function TableSkeleton({
    rows = 5,
    columns = 4,
    rowHeight = "20px",
    cellRadius = "md",
    withBorder = true,
    columnWidths = [],
    isZebra = false,
}) {
    return (
        <>
            {Array(rows)
                .fill(0)
                .map((_, rowIndex) => (
                    <Tr
                        key={rowIndex}
                        bg={isZebra && rowIndex % 2 === 0 ? "gray.50" : "transparent"}
                    >
                        {Array(columns)
                            .fill(0)
                            .map((_, colIndex) => (
                                <Td
                                    key={colIndex}
                                    borderBottom={withBorder ? "1px solid" : "none"}
                                    borderColor="gray.200"
                                >
                                    <Skeleton
                                        height={rowHeight}
                                        borderRadius={cellRadius}
                                        width={
                                            columnWidths[colIndex]
                                                ? columnWidths[colIndex]
                                                : "100%"
                                        }
                                    />
                                </Td>
                            ))}
                    </Tr>
                ))}
        </>
    );
}
