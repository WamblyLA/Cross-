import axios from "axios";
import { API_BASE_URL } from "../../config/runtime";
import { normalizeApiError } from "./errorNormalization";

const REQUEST_TIMEOUT_MS = 15000;

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error)),
);

export default httpClient;
