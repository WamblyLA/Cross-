export type ApiErrorDetail = {
  path: string;
  message: string;
};

export type ApiError = {
  code: string | null;
  status: number | null;
  message: string;
  details: ApiErrorDetail[];
  isNetworkError: boolean;
  isTimeoutError: boolean;
};
