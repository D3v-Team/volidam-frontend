import axios from "axios";
import { BASE_URL } from "../parametres/axios";

class Auth {
    static Login = async (data) => {
        const response = await axios.post(`${BASE_URL}/auth/login`, data);
        return response;
    };

    static Register = async (data) => {
        const response = await axios.post(`${BASE_URL}/auth/register`, data);
        return response;
    };
}

export { Auth };
