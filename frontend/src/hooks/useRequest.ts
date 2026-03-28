import { useState, useCallback, useEffect } from "react";
import type { AxiosRequestConfig } from "axios";
import { normalizeApiError, type ApiError } from "../lib/api/errorNormalization";
import { request } from "../lib/api/request";

const cacheMap = new Map<string, unknown>();

type UseRequestParams<T, TBody = unknown> = {
  url: string;
  method?: AxiosRequestConfig<TBody>["method"];
  body?: TBody;
  params?: AxiosRequestConfig<TBody>["params"];
  headers?: AxiosRequestConfig<TBody>["headers"];
  cache?: boolean;
  keyCache?: string;
  retry?: number;
  retryInterval?: number;
  auto?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (err: ApiError) => void;
  signal?: AbortSignal;
};

type UseRequestOverride<T, TBody = unknown> = Partial<UseRequestParams<T, TBody>>;

export function useRequest<T, TBody = unknown>(pars: UseRequestParams<T, TBody>) {
  const {
    url,
    method = "GET",
    body,
    params,
    headers,
    cache = false,
    keyCache,
    retry = 0,
    retryInterval = 500,
    auto = true,
    onSuccess,
    onError,
    signal,
  } = pars;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(auto);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchData = useCallback(
    async (override?: UseRequestOverride<T, TBody>) => {
      const requestOptions = {
        url: override?.url ?? url,
        method: override?.method ?? method,
        params: { ...params, ...override?.params },
        body: override?.body ?? body,
        headers: { ...headers, ...override?.headers },
        signal: override?.signal ?? signal,
      };

      const key =
        keyCache ||
        `${requestOptions.method}:${requestOptions.url}:${JSON.stringify(requestOptions.params)}:${JSON.stringify(requestOptions.body)}`;

      if (cache && cacheMap.has(key)) {
        const cached = cacheMap.get(key) as T;
        setData(cached);
        setIsLoading(false);
        return cached;
      }

      setIsLoading(true);
      setError(null);

      let attempts = 0;
      let lastError: ApiError | null = null;

      while (attempts <= retry) {
        try {
          const response = await request<T, TBody>(requestOptions);
          setData(response);

          if (cache) {
            cacheMap.set(key, response);
          }

          onSuccess?.(response);
          setIsLoading(false);
          return response;
        } catch (requestError) {
          const apiError = normalizeApiError(requestError);
          lastError = apiError;
          attempts += 1;

          if (attempts > retry) {
            setError(apiError);
            onError?.(apiError);
            setIsLoading(false);
            throw apiError;
          }

          await new Promise((resolve) => {
            setTimeout(resolve, retryInterval);
          });
        }
      }

      throw lastError ?? normalizeApiError(new Error("Request failed."));
    },
    [
      url,
      method,
      body,
      params,
      headers,
      cache,
      keyCache,
      retry,
      retryInterval,
      onSuccess,
      onError,
      signal,
    ],
  );

  useEffect(() => {
    if (auto) {
      fetchData().catch(() => {});
    }
  }, [fetchData, auto]);

  return { data, isLoading, error, refetch: fetchData };
}
