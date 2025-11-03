import { useState, useCallback, useEffect } from "react";
import axios, { type AxiosRequestConfig } from "axios";
const cacheMapa = new Map<string, any>();
interface useRequestParams<T> {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
  cache?: boolean;
  keyCache?: string;
  retry?: number;
  retryInterval?: number;
  auto?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (err: any) => void;
  signal?: AbortSignal;
  dependencies?: any[];
}
export function useRequest<T>(pars: useRequestParams<T>) {
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
  const [error, setError] = useState<any>(null);
  const fetchData = useCallback(
    async (override?: Partial<useRequestParams<T>>) => {
      const conf: AxiosRequestConfig = {
        url,
        method,
        params: { ...params, ...override?.params },
        data: override?.body ?? body,
        headers: { ...headers, ...override?.headers },
      };
      const key =
        keyCache ||
        `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(body)}`;
      if (cache && cacheMapa.has(key)) {
        setData(cacheMapa.get(key));
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      let trys = 0;
      while (trys <= retry) {
        try {
          const res = await axios(conf);
          setData(res.data);
          if (cache) {
            cacheMapa.set(key, res.data);
          }
          onSuccess?.(res.data);
          setIsLoading(false);
          return res.data;
        } catch (err) {
          trys++;
          if (trys > retry) {
            setError(err);
            onError?.(err);
            setIsLoading(false);
          } else {
            await new Promise((r) => {
              setTimeout(r, retryInterval);
            });
          }
        }
      }
    },
    [...dependencies]
  );
  useEffect(() => {
    if (auto) {
      fetchData();
    }
  }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}
