export interface ApiResponse<T> {
  code: number | string;
  errorCode?: string;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  code?: number | string;
  errorCode?: string;
  message?: string;
  data?: unknown;
  timestamp?: string;
}
