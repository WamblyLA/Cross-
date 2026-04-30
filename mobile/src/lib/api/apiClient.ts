import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../config/env";
import { normalizeApiError } from "../errors/apiError";

type InternalApiRequestConfig = InternalAxiosRequestConfig & {
  skipAuthHandling?: boolean;
};

type PublicApiRequestConfig = AxiosRequestConfig & {
  skipAuthHandling?: boolean;
};

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

apiClient.interceptors.request.use((config) => {
  const nextConfig = config as InternalApiRequestConfig;

  if (authToken) {
    nextConfig.headers.Authorization = `Bearer ${authToken}`;
  }

  return nextConfig;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const normalized = normalizeApiError(error);
    const requestConfig = error.config as InternalApiRequestConfig | undefined;

    if (normalized.status === 401 && !requestConfig?.skipAuthHandling) {
      unauthorizedHandler?.();
    }

    return Promise.reject(normalized);
  },
);

export async function request<TResponse, TBody = unknown>(config: PublicApiRequestConfig & { body?: TBody }) {
  const response = await apiClient.request<TResponse>({
    ...config,
    data: config.body,
  });

  return response.data;
}
