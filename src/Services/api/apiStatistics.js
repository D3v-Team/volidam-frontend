import { $api } from "../parametres/axios";
import { BASE_URL } from "../parametres/axios";
import { apiUsers } from "./Users";

class apiStatistics {
  static getMonthly = async (year) => {
    const response = await $api.get(
      `${BASE_URL}/statistic/monthly?year=${year}`,
    );
    return response;
  };

  static getByRange = async (startDate, endDate, assigneeId = null) => {
    const params = new URLSearchParams({ startDate, endDate });
    if (assigneeId) params.append("assigneeId", assigneeId);
    const response = await $api.get(`${BASE_URL}/statistic/by-range?${params}`);
    return response;
  };

  static getByDate = async (date, assigneeId = null) => {
    const params = new URLSearchParams({ date });
    if (assigneeId) params.append("assigneeId", assigneeId);
    const response = await $api.get(`${BASE_URL}/statistic/by-date?${params}`);
    return response;
  };

  static getStatistic = async (year, date) => {
    const response = await $api.get(
      `${BASE_URL}/statistic?year=${year}&date=${date}`,
    );
    return response;
  };

  static getNewLeads = async (assigneeId = null) => {
    const params = assigneeId ? `?assigneeId=${assigneeId}` : "";
    const response = await $api.get(`${BASE_URL}/statistic/new-leads${params}`);
    return response;
  };

 static getEmployees = async () => {
    const [operators, admins] = await Promise.all([
        apiUsers.getUsers("operator"),
        apiUsers.getUsers("admin"),
    ]);
    const operatorList = operators?.data?.data || operators?.data || [];
    const adminList = admins?.data?.data || admins?.data || [];
    return { data: [...operatorList, ...adminList] };
};

}

export default apiStatistics;
