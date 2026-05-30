import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Grid,
  Text,
  VStack,
  HStack,
  Flex,
  Spinner,
  Select,
  useColorModeValue,
  Input,
} from "@chakra-ui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useAuthStore } from "../../store/authStore";
import apiStatistics from "../../Services/api/apiStatistics";

const fmt = (d) => d.toISOString().split("T")[0];
const currentYear = () => new Date().getFullYear();

const getRange = (mode) => {
  const now = new Date();
  const end = fmt(now);
  if (mode === "today") return { start: end, end };
  if (mode === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() + 1);
    return { start: fmt(d), end };
  }
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return { start, end };
};

function StatCard({ label, value, accent, icon, loading, theme }) {
  return (
    <Box
      bg={theme.surface}
      borderRadius="16px"
      p="20px 24px"
      border="1px solid"
      borderColor={theme.border}
      position="relative"
      overflow="hidden"
      _before={{
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        width: "4px",
        height: "100%",
        bg: accent,
        borderRadius: "16px 0 0 16px",
      }}
      transition="all 0.2s"
      _hover={{
        bg: theme.surfaceHover,
        transform: "translateY(-2px)",
        boxShadow: theme.cardShadow,
      }}
    >
      <Flex justify="space-between" align="flex-start">
        <VStack align="flex-start" spacing={1}>
          <Text
            fontSize="10px"
            fontWeight="700"
            color={theme.textMuted}
            textTransform="uppercase"
            letterSpacing="0.1em"
          >
            {label}
          </Text>
          {loading ? (
            <Spinner size="sm" color={accent} mt={1} />
          ) : (
            <Text
              fontSize="32px"
              fontWeight="800"
              color={theme.text}
              lineHeight="1"
            >
              {value ?? 0}
            </Text>
          )}
        </VStack>
        <Box
          w="42px"
          h="42px"
          borderRadius="12px"
          bg={accent + "25"}
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="18px"
        >
          {icon}
        </Box>
      </Flex>
    </Box>
  );
}

function CustomTooltip({ active, payload, label, theme }) {
  if (active && payload?.length) {
    return (
      <Box
        bg={theme.surface}
        border="1px solid"
        borderColor={theme.border}
        borderRadius="10px"
        p="10px 14px"
        boxShadow="lg"
      >
        <Text fontSize="11px" color={theme.textMuted} mb="2px">
          {label}
        </Text>
        <Text fontSize="16px" fontWeight="700" color={theme.text}>
          {payload[0].value}
        </Text>
      </Box>
    );
  }
  return null;
}

function PeriodToggle({ active, onChange, theme }) {
  const tabs = [
    { key: "today", label: "Bugun" },
    { key: "week", label: "Bu hafta" },
    { key: "month", label: "Bu oy" },
  ];
  return (
    <Box
      bg={theme.surface}
      borderRadius="10px"
      p="3px"
      border="1px solid"
      borderColor={theme.border}
    >
      <HStack spacing={1}>
        {tabs.map(({ key, label }) => {
          const isActive = active === key;
          return (
            <Box
              key={key}
              px="14px"
              py="6px"
              borderRadius="8px"
              bg={isActive ? theme.accent : "transparent"}
              cursor="pointer"
              transition="all 0.18s"
              onClick={() => onChange(key)}
              _hover={{ bg: isActive ? theme.accentHover : theme.surfaceHover }}
              boxShadow={isActive ? `0 2px 8px ${theme.accent}55` : "none"}
            >
              <Text
                fontSize="12px"
                fontWeight="600"
                color={isActive ? "white" : theme.textMuted}
                userSelect="none"
              >
                {label}
              </Text>
            </Box>
          );
        })}
      </HStack>
    </Box>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const theme = {
    bg: useColorModeValue("#FFF0F3", "#41062f"),
    surface: useColorModeValue("#FFFFFF", "#380529"),
    surfaceHover: useColorModeValue("#FFE4EC", "#3A0029"),
    border: useColorModeValue("#F7C0D0", "#5A0040"),
    accent: useColorModeValue("#D81B60", "#C2185B"),
    accentHover: useColorModeValue("#AD1457", "#E91E8C"),
    text: useColorModeValue("#4A0030", "#F8E8F3"),
    textMuted: useColorModeValue("#A0527A", "#B08090"),
    chartBar: useColorModeValue("#D81B60", "#C2185B"),
    chartBarDim: useColorModeValue("#F8BBD0", "#5A0040"),
    cardShadow: useColorModeValue(
      "0 8px 24px rgba(216,27,96,0.12)",
      "0 8px 24px rgba(0,0,0,0.4)",
    ),
    selectBg: useColorModeValue("#FFF0F3", "#1E0015"),
    trackBg: useColorModeValue("#F7C0D0", "#FFFFFF10"),
  };

  const [period, setPeriod] = useState("month");
  const now = new Date();
  const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultEnd = fmt(now);
  const [manualStart, setManualStart] = useState(defaultStart);
  const [manualEnd, setManualEnd] = useState(defaultEnd);
  const [year, setYear] = useState(currentYear());
  const [newLeads, setNewLeads] = useState(null);
  const [byRange, setByRange] = useState(null);
  const [byDate, setByDate] = useState(null);
  const [monthly, setMonthly] = useState([]);

  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingRange, setLoadingRange] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);

  const fetchCards = useCallback(async () => {
    setLoadingCards(true);
    try {
      const todayStr = fmt(new Date());
      const [dateRes, leadsRes] = await Promise.all([
        apiStatistics.getByDate(todayStr),
        apiStatistics.getNewLeads(),
      ]);
      setByDate(dateRes?.data);
      setNewLeads(leadsRes?.data);
    } catch (_) {}
    setLoadingCards(false);
  }, []);

  const fetchRange = useCallback(async (start, end) => {
    setLoadingRange(true);
    try {
      const res = await apiStatistics.getByRange(start, end);
      setByRange(res?.data);
    } catch (_) {}
    setLoadingRange(false);
  }, []);

  const fetchMonthly = useCallback(async (y) => {
    setLoadingMonthly(true);
    try {
      const res = await apiStatistics.getMonthly(y);
      setMonthly(res?.data?.data || []);
    } catch (_) {}
    setLoadingMonthly(false);
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);
  useEffect(() => {
    fetchRange(manualStart, manualEnd);
  }, [manualStart, manualEnd, fetchRange]);
  useEffect(() => {
    fetchMonthly(year);
  }, [year, fetchMonthly]);

  const yearOptions = [currentYear() - 1, currentYear(), currentYear() + 1];

  return (
    <Box
      minH="calc(100vh - 64px)"
      bg={theme.bg}
      p={{ base: "16px", md: "28px" }}
    >
      <Flex justify="space-between" align="center" mb="24px"></Flex>

      <Grid
        templateColumns={{ base: "1fr", lg: "1fr 380px" }}
        gap={5}
        mb="24px"
        alignItems="stretch"
      >
        <Flex direction="column" gap={4}>
          <Grid templateColumns={{ base: "1fr", sm: "repeat(3, 1fr)" }} gap={4}>
            <StatCard
              label="Bugun"
              value={newLeads?.today}
              accent={theme.accent}
              icon="📅"
              loading={loadingCards}
              theme={theme}
            />
            <StatCard
              label="Bu hafta"
              value={newLeads?.this_week}
              accent="#7B1FA2"
              icon="📊"
              loading={loadingCards}
              theme={theme}
            />
            <StatCard
              label="Bu oy"
              value={newLeads?.this_month}
              accent="#00838F"
              icon="🗓️"
              loading={loadingCards}
              theme={theme}
            />
          </Grid>

          <Box
            bg={theme.surface}
            borderRadius="16px"
            p="22px"
            border="1px solid"
            borderColor={theme.border}
            flex={1}
            minW={0}
          >
            <Flex justify="space-between" align="center" mb="18px">
              <Text fontSize="14px" fontWeight="700" color={theme.text}>
                Oylik dinamika
              </Text>
              <Select
                size="sm"
                w="96px"
                borderRadius="8px"
                fontWeight="600"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                bg={theme.selectBg}
                color={theme.text}
                borderColor={theme.border}
                _focus={{ borderColor: theme.accent }}
                sx={{ option: { background: theme.surface } }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </Flex>
            {loadingMonthly ? (
              <Flex h="210px" align="center" justify="center">
                <Spinner color={theme.accent} />
              </Flex>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={monthly} barSize={20}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: theme.textMuted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: theme.textMuted }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                  />
                  <Tooltip
                    content={<CustomTooltip theme={theme} />}
                    cursor={{ fill: theme.surfaceHover + "60" }}
                  />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                    {monthly.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.month_num === new Date().getMonth() + 1
                            ? theme.chartBar
                            : theme.chartBarDim
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Flex>

        <Box
          bg={theme.surface}
          borderRadius="16px"
          p="22px"
          border="1px solid"
          borderColor={theme.border}
          minW={0}
          display="flex"
          flexDirection="column"
        >
          <Text fontSize="14px" fontWeight="700" color={theme.text} mb="18px">
            Holat bo'yicha (bugun)
          </Text>
          {loadingCards ? (
            <Flex flex={1} align="center" justify="center">
              <Spinner color={theme.accent} />
            </Flex>
          ) : byDate?.by_status?.length ? (
            <VStack spacing="14px" align="stretch">
              {byDate.by_status.map((s, i) => {
                const pct = byDate.total
                  ? Math.round((s.count / byDate.total) * 100)
                  : 0;
                return (
                  <Box key={i}>
                    <Flex justify="space-between" mb="6px">
                      <HStack spacing={2}>
                        <Box
                          w="8px"
                          h="8px"
                          borderRadius="50%"
                          bg={s.color}
                          flexShrink={0}
                        />
                        <Text
                          fontSize="12px"
                          fontWeight="600"
                          color={theme.textMuted}
                        >
                          {s.status_name}
                        </Text>
                      </HStack>
                      <Text fontSize="12px" fontWeight="700" color={theme.text}>
                        {s.count}
                      </Text>
                    </Flex>
                    <Box
                      bg={theme.trackBg}
                      borderRadius="999px"
                      h="5px"
                      overflow="hidden"
                    >
                      <Box
                        bg={s.color}
                        h="100%"
                        w={`${pct}%`}
                        borderRadius="999px"
                        transition="width 0.5s ease"
                      />
                    </Box>
                  </Box>
                );
              })}
            </VStack>
          ) : (
            <Flex flex={1} align="center" justify="center">
              <Text fontSize="13px" color={theme.textMuted}>
                Ma'lumot yo'q
              </Text>
            </Flex>
          )}
        </Box>
      </Grid>

      <Flex
        justify="space-between"
        align="center"
        mb="12px"
        flexWrap="wrap"
        gap={3}
      >
        <Text fontSize="16px" fontWeight="700" color={theme.text}>
          Holat bo'yicha taqsimot
        </Text>

        <Flex align="center" gap={3} flexWrap="wrap">
          <PeriodToggle
            active={period}
            onChange={(p) => {
              setPeriod(p);
              const { start, end } = getRange(p);
              setManualStart(start);
              setManualEnd(end);
            }}
            theme={theme}
          />
          <Input
            type="date"
            size="sm"
            w="148px"
            borderRadius="8px"
            value={manualStart}
            onChange={(e) => {
              setManualStart(e.target.value);
              setPeriod(null);
            }}
            bg={theme.selectBg}
            color={theme.text}
            borderColor={theme.border}
            _focus={{ borderColor: theme.accent }}
            sx={{ colorScheme: "dark" }}
          />
          <Text fontSize="12px" color={theme.textMuted} fontWeight="600">
            —
          </Text>
          <Input
            type="date"
            size="sm"
            w="148px"
            borderRadius="8px"
            value={manualEnd}
            onChange={(e) => {
              setManualEnd(e.target.value);
              setPeriod(null);
            }}
            bg={theme.selectBg}
            color={theme.text}
            borderColor={theme.border}
            _focus={{ borderColor: theme.accent }}
            sx={{ colorScheme: "dark" }}
          />

          <HStack spacing={2}>
            <Text fontSize="12px" color={theme.textMuted} fontWeight="500">
              Jami:
            </Text>
            <Text fontSize="16px" fontWeight="800" color={theme.accent}>
              {byRange?.total ?? 0}
            </Text>
          </HStack>
        </Flex>
      </Flex>

      <Box
        bg={theme.surface}
        borderRadius="16px"
        p="22px"
        border="1px solid"
        borderColor={theme.border}
      >
        {loadingRange ? (
          <Flex h="80px" align="center" justify="center">
            <Spinner color={theme.accent} />
          </Flex>
        ) : byRange?.by_status?.length ? (
          <Grid
            templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }}
            gap={4}
          >
            {byRange.by_status.map((s, i) => (
              <Box
                key={i}
                borderRadius="12px"
                p="16px"
                bg={theme.bg}
                border="1px solid"
                borderColor={s.color + "55"}
                transition="all 0.2s"
                _hover={{ borderColor: s.color, transform: "translateY(-2px)" }}
              >
                <HStack spacing={2} mb={2}>
                  <Box
                    w="9px"
                    h="9px"
                    borderRadius="50%"
                    bg={s.color}
                    flexShrink={0}
                  />
                  <Text
                    fontSize="10px"
                    fontWeight="700"
                    color={theme.textMuted}
                    textTransform="uppercase"
                    letterSpacing="0.08em"
                    isTruncated
                  >
                    {s.status_name}
                  </Text>
                </HStack>
                <Text
                  fontSize="28px"
                  fontWeight="800"
                  color={theme.text}
                  lineHeight="1"
                >
                  {s.count}
                </Text>
              </Box>
            ))}
          </Grid>
        ) : (
          <Flex h="80px" align="center" justify="center">
            <Text fontSize="13px" color={theme.textMuted}>
              Ma'lumot yo'q
            </Text>
          </Flex>
        )}
      </Box>
    </Box>
  );
}
