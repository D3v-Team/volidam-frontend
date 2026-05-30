import {
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Icon,
  FormControl,
  FormLabel,
  useColorModeValue,
} from "@chakra-ui/react";
import { Search } from "lucide-react";
import { filterFieldProps, searchFieldProps } from "./leadStyles";

export default function LeadsFilters({
  statuses,
  statusId,
  onStatusIdChange,
  role,
  onRoleChange,
  search,
  onSearchChange,
}) {
  const labelColor = useColorModeValue("textSecondary", "gray.300");
  const iconColor = useColorModeValue("brand.400", "gray.400");

  return (
    <Flex
      gap={3}
      mb={4}
      flexWrap="wrap"
      align={{ base: "stretch", md: "flex-end" }}
    >
      <FormControl maxW={{ base: "full", md: "180px" }} flex="0 0 auto">
        <FormLabel fontSize="xs" color={labelColor} mb={1} fontWeight="600">
          Rol
        </FormLabel>
        <Select
          {...filterFieldProps}
          size="sm"
          h="36px"
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
        >
          <option value="operator">Operator</option>
          <option value="admin">Admin</option>
        </Select>
      </FormControl>
      <FormControl maxW={{ base: "full", md: "180px" }} flex="0 0 auto">
        <FormLabel fontSize="xs" color={labelColor} mb={1} fontWeight="600">
          Status
        </FormLabel>
        <Select
          {...filterFieldProps}
          size="sm"
          h="36px"
          value={statusId}
          onChange={(e) => onStatusIdChange(e.target.value)}
        >
          <option value="">Barcha statuslar</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl w={{ base: "full", md: "450px" }} flex="0 0 auto">
        <FormLabel fontSize="xs" color={labelColor} mb={1} fontWeight="600">
          Qidiruv
        </FormLabel>
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none" h="36px">
            <Icon as={Search} color={iconColor} boxSize={3.5} />
          </InputLeftElement>
          <Input
            {...searchFieldProps}
            pl={8}
            placeholder="FIO, telefon..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </InputGroup>
      </FormControl>
    </Flex>
  );
}
