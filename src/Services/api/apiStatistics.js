import { $api } from "../parametres/axios";
import { BASE_URL } from "../parametres/axios";

class apiStatistics {
    static getMonthly = async (year) => {
        const response = await $api.get(`${BASE_URL}/statistic/monthly?year=${year}`);
        return response;
    };

    static getByRange = async (startDate, endDate) => {
        const response = await $api.get(`${BASE_URL}/statistic/by-range?startDate=${startDate}&endDate=${endDate}`);
        return response;
    };

    static getByDate = async (date) => {
        const response = await $api.get(`${BASE_URL}/statistic/by-date?date=${date}`);
        return response;
    };

    static getStatistic = async (year, date) => {
        const response = await $api.get(`${BASE_URL}/statistic?year=${year}&date=${date}`);
        return response;
    };

    static getNewLeads = async () => {
        const response = await $api.get(`${BASE_URL}/statistic/new-leads`);
        return response;
    };
}

export default apiStatistics;