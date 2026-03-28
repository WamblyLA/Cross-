import type { AxiosRequestConfig, AxiosResponse } from "axios";
import httpClient from "./httpClient";

export type RequestOptions<TBody = unknown> = {
  url: string;
  method?: AxiosRequestConfig<TBody>["method"];
  params?: AxiosRequestConfig<TBody>["params"];
  headers?: AxiosRequestConfig<TBody>["headers"];
  body?: TBody;
  signal?: AbortSignal;
  timeout?: number;
};

export async function request<TResponse, TBody = unknown>({
  url,
  method = "GET",
  params,
  headers,
  body,
  signal,
  timeout,
}: RequestOptions<TBody>): Promise<TResponse> {
  const response = await httpClient.request<TResponse, AxiosResponse<TResponse>, TBody>({
    url,
    method,
    params,
    headers,
    data: body,
    signal,
    timeout,
  });

  return response.data;
}
