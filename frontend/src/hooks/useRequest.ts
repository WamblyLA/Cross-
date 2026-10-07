import axios, { type AxiosRequestConfig } from "axios";
import { useCallback, useEffect, useState, type DependencyList } from "react";

const cacheMapa = new Map<string, unknown>();

interface UseRequestParams<T, TBody = unknown> {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: TBody;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
  cache?: boolean;
  keyCache?: string;
  retry?: number;
  retryInterval?: number;
  auto?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  signal?: AbortSignal;
  dependencies?: DependencyList;
}

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
    dependencies = [],
  } = pars;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(auto);
  const [error, setError] = useState<unknown>(null);

  const fetchData = useCallback(
    async (override?: Partial<UseRequestParams<T, TBody>>) => {
      const conf: AxiosRequestConfig<TBody> = {
        url: override?.url ?? url,
        method: override?.method ?? method,
        params: { ...params, ...override?.params },
        data: override?.body ?? body,
        headers: { ...headers, ...override?.headers },
        signal: override?.signal ?? signal,
        withCredentials: true,
      };

      const key =
        keyCache ||
        `${conf.method}:${conf.url}:${JSON.stringify(conf.params)}:${JSON.stringify(conf.data)}`;

      if (cache && cacheMapa.has(key)) {
        const cached = cacheMapa.get(key) as T;
        setData(cached);
        setIsLoading(false);
        return cached;
      }

      setIsLoading(true);
      setError(null);

      let trys = 0;
      let lastError: unknown = null;

      while (trys <= retry) {
        try {
          const res = await axios<T>(conf);
          setData(res.data);

          if (cache) {
            cacheMapa.set(key, res.data);
          }

          onSuccess?.(res.data);
          setIsLoading(false);
          return res.data;
        } catch (requestError) {
          lastError = requestError;
          trys++;

          if (trys > retry) {
            setError(requestError);
            onError?.(requestError);
            setIsLoading(false);
            throw requestError;
          }

          await new Promise((resolve) => {
            setTimeout(resolve, retryInterval);
          });
        }
      }

      throw lastError;
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
      ...dependencies,
    ],
  );

  useEffect(() => {
    if (auto) {
      fetchData().catch(() => {});
    }
  }, [fetchData, auto]);

  return { data, isLoading, error, refetch: fetchData };
}
